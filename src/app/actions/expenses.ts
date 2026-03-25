'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { gmail_v1, google } from 'googleapis'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { buildDailySpendingSeries } from '@/lib/expense-series'
import { decryptSecret } from '@/lib/token-crypto'

const TransactionExtractionSchema = z.object({
    merchant: z.string().min(1, 'Merchant is required'),
    category: z.string().min(1, 'Category is required'),
    amount: z.number().positive('Amount must be positive'),
    currency: z.string().length(3, 'Currency must be 3 letters').default('INR'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    description: z.string().optional(),
    payment_method: z.enum([
        'UPI',
        'Debit Card',
        'Credit Card',
        'NetBanking',
        'ATM',
        'IMPS',
        'NEFT',
        'Other',
    ]).default('Other'),
    confidence: z.number().min(0).max(1).default(0.85),
})

type SyncSource = 'manual' | 'auto'

type SyncExpensesOptions = {
    source?: SyncSource
}

export type ExpenseRecord = {
    id: string
    merchant: string
    category: string
    amount: number
    currency: string
    date: string
    payment_method: string | null
    description: string | null
    status: string | null
    confidence: number | null
}

export type SyncDiagnostics = {
    matchingEmails: number
    candidateEmails: number
    inserted: number
    skipped: number
    failed: number
}

export type SyncExpensesResult = {
    message: string
    count: number
    diagnostics: SyncDiagnostics
}

function getDateRangeStart(days: number | 'all') {
    if (days === 'all') return null
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - (days - 1))
    return start.toISOString().slice(0, 10)
}

function decodeBase64Url(input: string) {
    return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function hashText(value: string) {
    return createHash('sha256').update(value).digest('hex')
}

function stripHtml(html: string) {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, '"')
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim()
}

function collectBodyParts(
    payload?: gmail_v1.Schema$MessagePart,
    mimeType?: string
): string[] {
    if (!payload) return []

    const matchesMime = mimeType ? payload.mimeType === mimeType : true
    const current = matchesMime && payload.body?.data ? [decodeBase64Url(payload.body.data)] : []
    const children = (payload.parts || []).flatMap((part: gmail_v1.Schema$MessagePart) => collectBodyParts(part, mimeType))

    return [...current, ...children]
}

function getHeaderValue(
    payload: gmail_v1.Schema$MessagePart | undefined,
    name: string
) {
    return payload?.headers?.find((header: gmail_v1.Schema$MessagePartHeader) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function formatDate(value: string | number | Date) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toISOString().slice(0, 10)
}

function summarizePayloadForLog(payload?: gmail_v1.Schema$MessagePart) {
    if (!payload) return null

    return {
        mimeType: payload.mimeType ?? null,
        filename: payload.filename ?? null,
        partCount: payload.parts?.length ?? 0,
        headerNames: (payload.headers ?? [])
            .map((header) => header.name)
            .filter(Boolean)
            .slice(0, 12),
    }
}

function summarizeEmailTextForLog(textContent: string) {
    return {
        sha256: hashText(textContent),
        length: textContent.length,
        preview: textContent.slice(0, 120),
    }
}

function createSyncResult(message: string, diagnostics?: Partial<SyncDiagnostics>): SyncExpensesResult {
    return {
        message,
        count: diagnostics?.inserted ?? 0,
        diagnostics: {
            matchingEmails: diagnostics?.matchingEmails ?? 0,
            candidateEmails: diagnostics?.candidateEmails ?? 0,
            inserted: diagnostics?.inserted ?? 0,
            skipped: diagnostics?.skipped ?? 0,
            failed: diagnostics?.failed ?? 0,
        },
    }
}

function buildDashboardStatsFromTransactions(params: {
    transactions: Array<{ amount: number | string | null; category: string | null; date: string | null }>
    processedEmailCount: number
}) {
    const totalSpent = params.transactions.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
    const todayDate = new Date().toISOString().slice(0, 10)
    const todaySpent = params.transactions.reduce((sum, row) => {
        if (row.date === todayDate) {
            return sum + (Number(row.amount) || 0)
        }

        return sum
    }, 0)
    const categoryCounts = params.transactions.reduce((acc: Record<string, number>, row) => {
        const category = row.category ?? 'Uncategorized'
        acc[category] = (acc[category] || 0) + 1
        return acc
    }, {})

    const topCategory = Object.keys(categoryCounts).length > 0
        ? Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b)
        : 'None'

    return {
        totalSpent,
        todaySpent,
        transactionCount: params.transactions.length,
        processedEmailCount: params.processedEmailCount,
        topCategory,
    }
}

async function claimSyncWindow(params: {
    adminDb: any
    userId: string
    source: SyncSource
}) {
    const { data, error } = await (params.adminDb as any).rpc('claim_sync_cooldown', {
        p_user_id: params.userId,
        p_window_seconds: 60,
    })

    if (error) {
        const isMissingRpc = error.message?.includes('claim_sync_cooldown') || error.code === 'PGRST202'
        if (!isMissingRpc) {
            throw error
        }

        return true
    }

    if (typeof data === 'boolean') {
        return data
    }

    if (Array.isArray(data) && typeof data[0] === 'boolean') {
        return data[0]
    }

    return true
}

function assertAiExtractionMatchesEmail(params: {
    extracted: z.infer<typeof TransactionExtractionSchema>
    sourceText: string
    fallbackDate: string | null
}) {
    const normalizedSource = params.sourceText.toLowerCase()
    const merchantTokens = params.extracted.merchant
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3)

    const merchantMatched = merchantTokens.length > 0 && merchantTokens.some((token) => normalizedSource.includes(token))
    const amountPatterns = [
        params.extracted.amount.toFixed(2),
        params.extracted.amount.toString(),
        params.extracted.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ]
    const amountMatched = amountPatterns.some((pattern) => normalizedSource.includes(pattern.toLowerCase()))
    const dateMatched = Boolean(
        (params.fallbackDate && params.extracted.date === params.fallbackDate) ||
        normalizedSource.includes(params.extracted.date.toLowerCase())
    )

    return merchantMatched && amountMatched && dateMatched
}

function parseHdfcUpi(content: string, fallbackDate: string | null) {
    const match = content.match(/Rs\.?\s*([\d,]+\.\d{2}).*?debited from account\s+(\d{4}).*?to VPA\s+([^\s]+)\s+(.+?)\s+on\s+(\d{2}-\d{2}-\d{2})/i)
    if (!match) return null

    const [, amount, accountLast4, merchantVpa, merchant, rawDate] = match
    const [day, month, year] = rawDate.split('-')
    const formattedDate = `20${year}-${month}-${day}`

    return {
        merchant: merchant.trim(),
        category: 'Banking & Finance',
        amount: Number(amount.replace(/,/g, '')),
        currency: 'INR',
        date: formattedDate || fallbackDate || formatDate(new Date()),
        description: `UPI transfer to ${merchant.trim()}`,
        payment_method: 'UPI' as const,
        confidence: 0.97,
        metadata: {
            account_last4: accountLast4,
            merchant_vpa: merchantVpa,
        },
    }
}

function parseHdfcCreditCard(content: string, fallbackDate: string | null) {
    const match = content.match(/Rs\.?\s*([\d,]+\.\d{2}).*?Credit Card ending\s+(\d{4}).*?towards\s+(.+?)\s+on\s+(\d{1,2}\s+[A-Za-z]{3},\s+\d{4})(?:\s+at\s+(\d{2}:\d{2}:\d{2}))?/i)
    if (!match) return null

    const [, amount, cardLast4, merchantRaw, rawDate] = match
    const merchant = normalizeMerchant(merchantRaw)

    return {
        merchant,
        category: merchant.toLowerCase().includes('swiggy') ? 'Food & Dining' : 'Credit Card',
        amount: Number(amount.replace(/,/g, '')),
        currency: 'INR',
        date: formatDate(rawDate) || fallbackDate || formatDate(new Date()),
        description: `Credit card payment to ${merchant}`,
        payment_method: 'Credit Card' as const,
        confidence: 0.99,
        metadata: {
            card_last4: cardLast4,
            merchant_raw: merchantRaw.trim(),
        },
    }
}

function parseAxisStructured(content: string, fallbackDate: string | null) {
    const amountMatch = content.match(/Transaction Amount:\s*INR\s*([\d,]+(?:\.\d{1,2})?)/i)
    const merchantMatch = content.match(/Merchant Name:\s*([A-Z0-9 &*._-]+)/i)
    const dateMatch = content.match(/Date\s*&\s*Time:\s*(\d{2})-(\d{2})-(\d{4})(?:,\s*\d{2}:\d{2}:\d{2}\s*[A-Z]{2,4})?/i)
    if (!amountMatch || !merchantMatch) return null

    const merchant = normalizeMerchant(merchantMatch[1])
    const parsedDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null

    return {
        merchant,
        category: merchant.toLowerCase().includes('uber') ? 'Transport' : 'Credit Card',
        amount: Number(amountMatch[1].replace(/,/g, '')),
        currency: 'INR',
        date: parsedDate || fallbackDate || formatDate(new Date()),
        description: merchant.toLowerCase().includes('uber') ? 'Uber ride payment' : `Card payment to ${merchant}`,
        payment_method: 'Credit Card' as const,
        confidence: 0.95,
        metadata: {
            merchant_raw: merchantMatch[1].trim(),
        },
    }
}

function parseKnownTransaction(content: string, fallbackDate: string | null) {
    return (
        parseHdfcUpi(content, fallbackDate) ||
        parseHdfcCreditCard(content, fallbackDate) ||
        parseAxisStructured(content, fallbackDate)
    )
}

async function logIngestionError(params: {
    userId: string
    externalMessageId?: string
    errorStage: string
    errorCode?: string
    errorMessage: string
    rawPayload?: unknown
    metadata?: Record<string, unknown>
}) {
    const adminDb = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await adminDb.from('ingestion_errors').insert({
        user_id: params.userId,
        source: 'gmail',
        external_message_id: params.externalMessageId ?? null,
        error_stage: params.errorStage,
        error_code: params.errorCode ?? null,
        error_message: params.errorMessage,
        raw_payload: params.rawPayload ?? null,
        metadata: params.metadata ?? null,
    })
}

function normalizeMerchant(rawMerchant: string) {
    return rawMerchant
        .replace(/^[A-Z]{2,}\*/i, '')
        .replace(/\s+/g, ' ')
        .trim()
}

export async function syncExpenses(options: SyncExpensesOptions = {}) {
    const source = options.source ?? 'manual'
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        throw new Error('Unauthorized. You must be logged in.')
    }

    const adminDb = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const canSyncNow = await claimSyncWindow({
        adminDb,
        userId: user.id,
        source,
    })

    if (!canSyncNow) {
        return createSyncResult(
            source === 'auto'
                ? 'Cooling down before the next automatic inbox check.'
                : 'A background sync just ran. Please wait a minute before syncing again.'
        )
    }

    const { data: tokenData, error: tokenError } = await adminDb
        .from('user_tokens')
        .select('provider_token')
        .eq('user_id', user.id)
        .single()

    if (tokenError || !tokenData?.provider_token) {
        throw new Error('Google Provider Token missing. Sign out and sign in with Google again to reconnect Gmail access.')
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: decryptSecret(tokenData.provider_token) })
    const gmail = google.gmail({ version: 'v1', auth })

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const query = [
        `after:${oneWeekAgo.toISOString().split('T')[0].replace(/-/g, '/')}`,
        '(',
        'receipt',
        'OR invoice',
        'OR payment',
        'OR paid',
        'OR debited',
        'OR spent',
        'OR purchase',
        'OR transaction',
        'OR upi',
        'OR credited',
        'OR withdrawn',
        'OR swiggy',
        'OR zomato',
        'OR uber',
        'OR ola',
        'OR "payment successful"',
        'OR "order confirmed"',
        'OR "cashback received"',
        'OR "credited to your account"',
        'OR "debited from your account"',
        ')',
    ].join(' ')

    let messages: Array<{ id?: string | null }> = []
    try {
        const response = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 100 })
        messages = response.data.messages || []
    } catch (err: any) {
        await logIngestionError({
            userId: user.id,
            errorStage: 'gmail_list',
            errorCode: err?.code ? String(err.code) : 'gmail_list_failed',
            errorMessage: err?.message || 'Failed to fetch Gmail messages.',
        })
        throw new Error('Failed to fetch from Gmail. The token may have expired. Please re-authenticate.')
    }

    if (messages.length === 0) {
        return createSyncResult('No new receipts found')
    }

    const messageIds = messages.map((message) => message.id as string)
    const { data: processedEmails } = await adminDb
        .from('processed_emails')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', messageIds)

    const processedIdSet = new Set(processedEmails?.map((row) => row.message_id) || [])
    const newMessages = messages.filter((message) => !processedIdSet.has(message.id as string))

    if (newMessages.length === 0) {
        return createSyncResult('All latest receipts are already synced.', {
            matchingEmails: messages.length,
        })
    }

    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured on the server.')
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
    })

    const aiPrompt = `Extract one transaction from this email.
Return EXACTLY one JSON object with these fields:
{
  "merchant": "string",
  "category": "string",
  "amount": number,
  "currency": "3-letter currency code",
  "date": "YYYY-MM-DD",
  "description": "short description",
  "payment_method": "UPI | Debit Card | Credit Card | NetBanking | ATM | IMPS | NEFT | Other",
  "confidence": number
}

Example 1:
Email: "Rs.100.18 has been debited from account 5922 to VPA 7060132602-2@ibl ANSHUL ANSHUL on 21-03-26."
JSON: {"merchant":"ANSHUL ANSHUL","category":"Banking & Finance","amount":100.18,"currency":"INR","date":"2026-03-21","description":"UPI transfer to ANSHUL ANSHUL","payment_method":"UPI","confidence":0.97}

Example 2:
Email: "Rs.128.00 is debited from your HDFC Bank Credit Card ending 4300 towards PYU*Swiggy Food on 21 Mar, 2026 at 22:12:27."
JSON: {"merchant":"Swiggy Food","category":"Food & Dining","amount":128,"currency":"INR","date":"2026-03-21","description":"Credit card payment to Swiggy Food","payment_method":"Credit Card","confidence":0.99}

Example 3:
Email: "Transaction Amount: INR 60 Merchant Name: KAMAKHYA K Date & Time: 25-03-2026, 13:14:14 IST"
JSON: {"merchant":"Kamakhya K","category":"Credit Card","amount":60,"currency":"INR","date":"2026-03-25","description":"Card payment to Kamakhya K","payment_method":"Credit Card","confidence":0.95}

If the email is not a transaction or amount/date are missing, return {"error":"not_a_transaction"}.
`

    let successfulInserts = 0
    let skippedCount = 0
    let failedCount = 0
    const processMessage = async (msg: { id?: string | null }) => {
        const messageId = msg.id as string

        try {
            const email = await gmail.users.messages.get({ userId: 'me', id: messageId })
            const payload = email.data.payload
            const internalDate = email.data.internalDate ? formatDate(Number(email.data.internalDate)) : null
            const headerDate = formatDate(getHeaderValue(payload, 'Date'))
            const fallbackDate = internalDate || headerDate
            const subject = getHeaderValue(payload, 'Subject')
            const sender = getHeaderValue(payload, 'From')

            const plainTextParts = collectBodyParts(payload, 'text/plain')
            const htmlParts = collectBodyParts(payload, 'text/html')
            const textContent = plainTextParts.join('\n').trim() || stripHtml(htmlParts.join('\n')).trim()

            if (!textContent) {
                await logIngestionError({
                    userId: user.id,
                    externalMessageId: messageId,
                    errorStage: 'email_parse',
                    errorCode: 'missing_text_content',
                    errorMessage: 'No text/plain content available in Gmail payload.',
                    rawPayload: summarizePayloadForLog(payload),
                })
                skippedCount++
                return 'skipped' as const
            }

            const ruleBased = parseKnownTransaction(`${subject}\n${textContent}`, fallbackDate)
            let validatedTransaction

            if (ruleBased) {
                validatedTransaction = TransactionExtractionSchema.parse(ruleBased)
            } else {
                const promptContext = [
                    `From: ${sender}`,
                    `Subject: ${subject}`,
                    fallbackDate ? `Fallback Date: ${fallbackDate}` : '',
                    '',
                    textContent.substring(0, 4000),
                ].filter(Boolean).join('\n')

                const result = await model.generateContent([aiPrompt, promptContext])
                const extractedText = result.response.text()
                const jsonOutput = JSON.parse(extractedText)

                if (jsonOutput.error) {
                    await logIngestionError({
                        userId: user.id,
                        externalMessageId: messageId,
                        errorStage: 'ai_extract',
                        errorCode: 'not_a_transaction',
                        errorMessage: 'AI rejected the email as a non-transaction.',
                        rawPayload: {
                            sender,
                            subject,
                            summary: summarizeEmailTextForLog(textContent),
                        },
                    })
                    skippedCount++
                    return 'skipped' as const
                }

                if (!jsonOutput.date && fallbackDate) {
                    jsonOutput.date = fallbackDate
                }

                validatedTransaction = TransactionExtractionSchema.parse(jsonOutput)
                const aiOutputMatchesEmail = assertAiExtractionMatchesEmail({
                    extracted: validatedTransaction,
                    sourceText: `${subject}\n${textContent}`,
                    fallbackDate,
                })

                if (!aiOutputMatchesEmail) {
                    await logIngestionError({
                        userId: user.id,
                        externalMessageId: messageId,
                        errorStage: 'ai_extract',
                        errorCode: 'unverified_ai_extraction',
                        errorMessage: 'AI output could not be corroborated against the source email content.',
                        rawPayload: {
                            sender,
                            subject,
                            summary: summarizeEmailTextForLog(textContent),
                        },
                        metadata: {
                            extracted_amount: validatedTransaction.amount,
                            extracted_date: validatedTransaction.date,
                            extracted_merchant: validatedTransaction.merchant,
                        },
                    })
                    skippedCount++
                    return 'skipped' as const
                }
            }
            const normalizedMerchant = normalizeMerchant(validatedTransaction.merchant)
            const transactionStatus = ruleBased && validatedTransaction.confidence >= 0.8 ? 'confirmed' : 'needs_review'

            const { error: insertError } = await adminDb.from('transactions').insert({
                user_id: user.id,
                date: validatedTransaction.date,
                amount: validatedTransaction.amount,
                category: validatedTransaction.category,
                merchant: normalizedMerchant,
                description: validatedTransaction.description ?? `Email transaction from ${normalizedMerchant}`,
                source: 'Gmail',
                external_message_id: messageId,
                external_source: 'gmail',
                payment_method: validatedTransaction.payment_method,
                currency: validatedTransaction.currency,
                confidence: validatedTransaction.confidence,
                status: transactionStatus,
                raw_extraction: {
                    model_output: {
                        ...validatedTransaction,
                        extraction_method: ruleBased ? 'rule_based' : 'ai_assisted',
                    },
                    extracted_at: new Date().toISOString(),
                },
            })

            if (insertError) {
                throw insertError
            }

            await adminDb.from('processed_emails').insert({
                user_id: user.id,
                message_id: messageId
            })

            return 'inserted' as const
        } catch (err: any) {
            await logIngestionError({
                userId: user.id,
                externalMessageId: messageId,
                errorStage: 'transaction_insert',
                errorCode: err?.code ?? 'transaction_insert_failed',
                errorMessage: err?.message || 'Transaction ingestion failed.',
            })
            return 'failed' as const
        }
    }

    const batchSize = 3
    for (let index = 0; index < newMessages.length; index += batchSize) {
        const batch = newMessages.slice(index, index + batchSize)
        const batchResults = await Promise.all(batch.map((message) => processMessage(message)))

        for (const result of batchResults) {
            if (result === 'inserted') successfulInserts++
            if (result === 'failed') failedCount++
        }
    }

    return {
        message: successfulInserts > 0
            ? `Synced ${successfulInserts} transactions from ${newMessages.length} candidate emails.`
            : `Found ${messages.length} matching emails, ${newMessages.length} new candidates, but 0 transactions were saved. Skipped ${skippedCount}, failed ${failedCount}. Check ingestion errors for details.`,
        count: successfulInserts,
        diagnostics: {
            matchingEmails: messages.length,
            candidateEmails: newMessages.length,
            inserted: successfulInserts,
            skipped: skippedCount,
            failed: failedCount,
        },
    }
}

export async function fetchExpenses(days: number | 'all' = 14): Promise<ExpenseRecord[]> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const rangeStart = getDateRangeStart(days)
    let query: any = supabase
        .from('transactions')
        .select('transaction_id, merchant, category, amount, currency, date, payment_method, description, status, confidence')
        .order('date', { ascending: false })
        .limit(200)

    if (rangeStart) {
        query = query.gte('date', rangeStart)
    }

    let { data, error } = await query

    if (error) {
        const adminDb = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        let adminQuery: any = adminDb
            .from('transactions')
            .select('transaction_id, merchant, category, amount, currency, date, payment_method, description, status, confidence')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(200)

        if (rangeStart) {
            adminQuery = adminQuery.gte('date', rangeStart)
        }

        const adminResult = await adminQuery
        data = adminResult.data
        error = adminResult.error
    }

    if (error) throw error

    return (data || []).map((transaction: any) => ({
        id: transaction.transaction_id,
        merchant: transaction.merchant ?? 'Unknown merchant',
        category: transaction.category,
        amount: Number(transaction.amount) || 0,
        currency: transaction.currency ?? 'INR',
        date: transaction.date,
        payment_method: transaction.payment_method,
        description: transaction.description,
        status: transaction.status,
        confidence: transaction.confidence,
    }))
}

export async function fetchDashboardStats(days: number | 'all' = 14) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const adminDb = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const rangeStart = getDateRangeStart(days)

    const { data, error } = await adminDb.rpc('get_dashboard_stats', {
        p_user_id: user.id,
        p_range_start: rangeStart,
    })

    if (error) {
        const isMissingRpc = error.message?.includes('get_dashboard_stats') || error.code === 'PGRST202'
        if (!isMissingRpc) {
            throw error
        }

        let transactionsQuery = adminDb
            .from('transactions')
            .select('amount, category, date')
            .eq('user_id', user.id)

        let processedEmailsQuery = adminDb
            .from('processed_emails')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)

        if (rangeStart) {
            transactionsQuery = transactionsQuery.gte('date', rangeStart)
            processedEmailsQuery = processedEmailsQuery.gte('processed_at', `${rangeStart}T00:00:00.000Z`)
        }

        const [{ data: transactions, error: transactionsError }, { count: processedEmailCount, error: processedEmailsError }] = await Promise.all([
            transactionsQuery,
            processedEmailsQuery,
        ])

        if (transactionsError) throw transactionsError
        if (processedEmailsError) throw processedEmailsError

        return buildDashboardStatsFromTransactions({
            transactions: transactions ?? [],
            processedEmailCount: processedEmailCount ?? 0,
        })
    }

    const stats = Array.isArray(data) ? data[0] : data
    if (!stats) {
        return {
            totalSpent: 0,
            todaySpent: 0,
            transactionCount: 0,
            processedEmailCount: 0,
            topCategory: 'None',
        }
    }

    return {
        totalSpent: Number(stats.total_spent ?? 0),
        todaySpent: Number(stats.today_spent ?? 0),
        transactionCount: Number(stats.transaction_count ?? 0),
        processedEmailCount: Number(stats.processed_email_count ?? 0),
        topCategory: stats.top_category ?? 'None',
    }
}

export async function fetchDailySpending(days: number | 'all' = 14) {
    const expenses = await fetchExpenses(days)
    return buildDailySpendingSeries(expenses)
}

export async function fetchSyncDiagnostics() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    let [{ count: processedCount, error: processedError }, { count: transactionCount, error: transactionError }, { data: recentErrors, error: errorsError }] = await Promise.all([
        supabase
            .from('processed_emails')
            .select('id', { count: 'exact', head: true })
            .gte('processed_at', since),
        supabase
            .from('transactions')
            .select('transaction_id', { count: 'exact', head: true })
            .gte('created_at', since),
        supabase
            .from('ingestion_errors')
            .select('error_stage, created_at')
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(10),
    ])

    if (processedError || transactionError || errorsError) {
        const adminDb = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        ;[{ count: processedCount, error: processedError }, { count: transactionCount, error: transactionError }, { data: recentErrors, error: errorsError }] = await Promise.all([
            adminDb
                .from('processed_emails')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('processed_at', since),
            adminDb
                .from('transactions')
                .select('transaction_id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('created_at', since),
            adminDb
                .from('ingestion_errors')
                .select('error_stage, created_at')
                .eq('user_id', user.id)
                .gte('created_at', since)
                .order('created_at', { ascending: false })
                .limit(10),
        ])
    }

    if (processedError) throw processedError
    if (transactionError) throw transactionError
    if (errorsError) throw errorsError

    const errorCounts = (recentErrors || []).reduce((acc: Record<string, number>, row) => {
        acc[row.error_stage] = (acc[row.error_stage] || 0) + 1
        return acc
    }, {})

    return {
        processedLast24h: processedCount ?? 0,
        insertedLast24h: transactionCount ?? 0,
        errorCounts,
        lastErrorAt: recentErrors?.[0]?.created_at ?? null,
    }
}
