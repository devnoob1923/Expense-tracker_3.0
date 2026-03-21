'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { gmail_v1, google } from 'googleapis'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

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

const rateLimitMap = new Map<string, number>()

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
    const amountMatch = content.match(/Transaction Amount:\s*INR\s*([\d,]+\.\d{2})/i)
    const merchantMatch = content.match(/Merchant Name:\s*([A-Z0-9 &*._-]+)/i)
    if (!amountMatch || !merchantMatch) return null

    const merchant = normalizeMerchant(merchantMatch[1])

    return {
        merchant,
        category: merchant.toLowerCase().includes('uber') ? 'Transport' : 'Credit Card',
        amount: Number(amountMatch[1].replace(/,/g, '')),
        currency: 'INR',
        date: fallbackDate || formatDate(new Date()),
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

export async function syncExpenses() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        throw new Error('Unauthorized. You must be logged in.')
    }

    const now = Date.now()
    const lastSync = rateLimitMap.get(user.id) || 0
    if (now - lastSync < 60000) {
        throw new Error('Rate limit exceeded. Please wait a minute before syncing again.')
    }

    const adminDb = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: tokenData, error: tokenError } = await adminDb
        .from('user_tokens')
        .select('provider_token')
        .eq('user_id', user.id)
        .single()

    if (tokenError || !tokenData?.provider_token) {
        throw new Error('Google Provider Token missing. Sign out and sign in with Google again to reconnect Gmail access.')
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: tokenData.provider_token })
    const gmail = google.gmail({ version: 'v1', auth })
    rateLimitMap.set(user.id, now)

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
        rateLimitMap.delete(user.id)
        await logIngestionError({
            userId: user.id,
            errorStage: 'gmail_list',
            errorCode: err?.code ? String(err.code) : 'gmail_list_failed',
            errorMessage: err?.message || 'Failed to fetch Gmail messages.',
        })
        throw new Error('Failed to fetch from Gmail. The token may have expired. Please re-authenticate.')
    }

    if (messages.length === 0) return { message: 'No new receipts found', count: 0 }

    const messageIds = messages.map((message) => message.id as string)
    const { data: processedEmails } = await adminDb
        .from('processed_emails')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', messageIds)

    const processedIdSet = new Set(processedEmails?.map((row) => row.message_id) || [])
    const newMessages = messages.filter((message) => !processedIdSet.has(message.id as string))

    if (newMessages.length === 0) {
        return { message: 'All latest receipts are already synced.', count: 0 }
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
Email: "Transaction Amount: INR 25.19 Merchant Name: UBER INDIA"
JSON: {"merchant":"Uber India","category":"Transport","amount":25.19,"currency":"INR","date":"2026-03-21","description":"Uber ride payment","payment_method":"Credit Card","confidence":0.95}

If the email is not a transaction or amount/date are missing, return {"error":"not_a_transaction"}.
`

    let successfulInserts = 0
    let skippedCount = 0
    let failedCount = 0

    for (const msg of newMessages) {
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
                    rawPayload: payload,
                })
                skippedCount++
                continue
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
                            textContent: textContent.substring(0, 1000),
                        },
                    })
                    skippedCount++
                    continue
                }

                if (!jsonOutput.date && fallbackDate) {
                    jsonOutput.date = fallbackDate
                }

                validatedTransaction = TransactionExtractionSchema.parse(jsonOutput)
            }
            const normalizedMerchant = normalizeMerchant(validatedTransaction.merchant)

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
                status: validatedTransaction.confidence >= 0.8 ? 'confirmed' : 'needs_review',
                raw_extraction: {
                    model_output: validatedTransaction,
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

            successfulInserts++
        } catch (err: any) {
            failedCount++
            await logIngestionError({
                userId: user.id,
                externalMessageId: messageId,
                errorStage: 'transaction_insert',
                errorCode: err?.code ?? 'transaction_insert_failed',
                errorMessage: err?.message || 'Transaction ingestion failed.',
            })
        }
    }

    return {
        message: successfulInserts > 0
            ? `Synced ${successfulInserts} transactions from ${newMessages.length} candidate emails.`
            : `Found ${messages.length} matching emails, ${newMessages.length} new candidates, but 0 transactions were saved. Skipped ${skippedCount}, failed ${failedCount}. Check ingestion_errors in Supabase for details.`,
        count: successfulInserts
    }
}

export async function fetchExpenses(days: number | 'all' = 14) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const adminDb = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const rangeStart = getDateRangeStart(days)
    let query = adminDb
        .from('transactions')
        .select('transaction_id, merchant, category, amount, currency, date, payment_method, description, status, confidence')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(200)

    if (rangeStart) {
        query = query.gte('date', rangeStart)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map((transaction) => ({
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

    let transactionsQuery = adminDb
        .from('transactions')
        .select('transaction_id, category, amount', { count: 'exact' })
        .eq('user_id', user.id)

    let processedEmailsQuery = adminDb
        .from('processed_emails')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)

    if (rangeStart) {
        transactionsQuery = transactionsQuery.gte('date', rangeStart)
        processedEmailsQuery = processedEmailsQuery.gte('processed_at', `${rangeStart}T00:00:00.000Z`)
    }

    const [{ data: transactions, count: transactionCount, error: transactionsError }, { count: processedEmailCount, error: processedEmailsError }] = await Promise.all([
        transactionsQuery,
        processedEmailsQuery,
    ])

    if (transactionsError) throw transactionsError
    if (processedEmailsError) throw processedEmailsError

    const totalSpent = (transactions || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
    const categoryCounts = (transactions || []).reduce((acc: Record<string, number>, row) => {
        acc[row.category] = (acc[row.category] || 0) + 1
        return acc
    }, {})

    const topCategory = Object.keys(categoryCounts).length > 0
        ? Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b)
        : 'None'

    return {
        totalSpent,
        transactionCount: transactionCount ?? 0,
        processedEmailCount: processedEmailCount ?? 0,
        topCategory,
    }
}

export async function fetchDailySpending(days: number | 'all' = 14) {
    const expenses = await fetchExpenses(days)

    const grouped = expenses.reduce((acc: Record<string, { amount: number; transactions: number }>, expense) => {
        if (!acc[expense.date]) {
            acc[expense.date] = { amount: 0, transactions: 0 }
        }

        acc[expense.date].amount += Number(expense.amount) || 0
        acc[expense.date].transactions += 1
        return acc
    }, {})

    return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({
            date,
            amount: Number(value.amount.toFixed(2)),
            transactions: value.transactions,
        }))
}
