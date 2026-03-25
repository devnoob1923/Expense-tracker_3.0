import { createClient } from '@supabase/supabase-js'
import { createHash, createCipheriv, randomBytes } from 'crypto'

const ENCRYPTED_VALUE_PREFIX = 'enc:'

function getEncryptionKey() {
    const key = process.env.TOKEN_ENCRYPTION_KEY
    if (!key) return null

    const normalized = key.trim()
    if (/^[A-Fa-f0-9]{64}$/.test(normalized)) {
        return Buffer.from(normalized, 'hex')
    }

    return createHash('sha256').update(normalized).digest()
}

function encryptSecret(value) {
    const key = getEncryptionKey()
    if (!key) return value

    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    return `${ENCRYPTED_VALUE_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

function isEncryptedSecret(value) {
    return typeof value === 'string' && value.startsWith(ENCRYPTED_VALUE_PREFIX)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const tokenEncryptionKey = process.env.TOKEN_ENCRYPTION_KEY

if (!supabaseUrl || !serviceRoleKey || !tokenEncryptionKey) {
    console.error('Missing required env vars. Expected NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and TOKEN_ENCRYPTION_KEY.')
    process.exit(1)
}

const adminDb = createClient(supabaseUrl, serviceRoleKey)

const { data: rows, error } = await adminDb
    .from('user_tokens')
    .select('user_id, provider_token, provider_refresh_token')

if (error) {
    console.error('Failed to load user_tokens:', error.message)
    process.exit(1)
}

let updatedCount = 0

for (const row of rows ?? []) {
    const nextProviderToken = row.provider_token && !isEncryptedSecret(row.provider_token)
        ? encryptSecret(row.provider_token)
        : row.provider_token
    const nextRefreshToken = row.provider_refresh_token && !isEncryptedSecret(row.provider_refresh_token)
        ? encryptSecret(row.provider_refresh_token)
        : row.provider_refresh_token

    if (nextProviderToken === row.provider_token && nextRefreshToken === row.provider_refresh_token) {
        continue
    }

    const { error: updateError } = await adminDb
        .from('user_tokens')
        .update({
            provider_token: nextProviderToken,
            provider_refresh_token: nextRefreshToken,
        })
        .eq('user_id', row.user_id)

    if (updateError) {
        console.error(`Failed to update token row for user ${row.user_id}:`, updateError.message)
        process.exit(1)
    }

    updatedCount += 1
}

console.log(`Encrypted token rows updated: ${updatedCount}`)
