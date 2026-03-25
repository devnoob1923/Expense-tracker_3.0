import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'

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

export function encryptSecret(value: string) {
    const key = getEncryptionKey()
    if (!key) return value

    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    return `${ENCRYPTED_VALUE_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptSecret(value: string) {
    if (!value.startsWith(ENCRYPTED_VALUE_PREFIX)) {
        return value
    }

    const key = getEncryptionKey()
    if (!key) {
        throw new Error('Encrypted token cannot be decrypted because TOKEN_ENCRYPTION_KEY is not configured.')
    }

    const payload = value.slice(ENCRYPTED_VALUE_PREFIX.length)
    const [ivPart, tagPart, encryptedPart] = payload.split(':')
    if (!ivPart || !tagPart || !encryptedPart) {
        throw new Error('Encrypted token payload is malformed.')
    }

    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64'))
    decipher.setAuthTag(Buffer.from(tagPart, 'base64'))

    return Buffer.concat([
        decipher.update(Buffer.from(encryptedPart, 'base64')),
        decipher.final(),
    ]).toString('utf8')
}

export function isEncryptedSecret(value: string) {
    return value.startsWith(ENCRYPTED_VALUE_PREFIX)
}
