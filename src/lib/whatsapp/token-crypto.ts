import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * AES-256-GCM encryption/decryption for WhatsApp access tokens.
 * 
 * Format: {iv_hex}:{authTag_hex}:{ciphertext_hex}
 * 
 * Uses TOKEN_ENCRYPTION_KEY env var (32 bytes = 64 hex chars).
 * If no key is configured, encryption is skipped (backward compatibility).
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16       // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits

function getEncryptionKey(): Buffer | null {
    const keyHex = process.env.TOKEN_ENCRYPTION_KEY
    if (!keyHex) {
        return null
    }

    if (keyHex.length !== 64) {
        console.error('[TokenCrypto] TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes). Got:', keyHex.length)
        return null
    }

    return Buffer.from(keyHex, 'hex')
}

/**
 * Encrypts a plaintext token using AES-256-GCM.
 * Returns the encrypted string in format: {iv}:{authTag}:{ciphertext}
 * Returns null if encryption key is not configured.
 */
export function encryptToken(plaintext: string): string | null {
    const key = getEncryptionKey()
    if (!key) return null

    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

    let encrypted = cipher.update(plaintext, 'utf-8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypts a token that was encrypted with encryptToken().
 * Expects format: {iv}:{authTag}:{ciphertext}
 * Returns the plaintext token.
 */
export function decryptToken(encryptedValue: string): string {
    const key = getEncryptionKey()
    if (!key) {
        throw new Error('[TokenCrypto] Cannot decrypt: TOKEN_ENCRYPTION_KEY not configured')
    }

    const parts = encryptedValue.split(':')
    if (parts.length !== 3) {
        throw new Error('[TokenCrypto] Invalid encrypted token format')
    }

    const [ivHex, authTagHex, ciphertext] = parts

    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(ciphertext, 'hex', 'utf-8')
    decrypted += decipher.final('utf-8')

    return decrypted
}

/**
 * Checks if a stored token value looks like it's encrypted.
 * Encrypted format: 32hex:32hex:variable_hex (iv:authTag:ciphertext)
 */
export function isTokenEncrypted(value: string): boolean {
    const parts = value.split(':')
    if (parts.length !== 3) return false

    const [iv, authTag] = parts
    return iv.length === 32 && authTag.length === 32 && /^[0-9a-f]+$/i.test(parts.join(''))
}

/**
 * Resolves a stored access token to its plaintext value.
 * Handles both encrypted and unencrypted tokens transparently.
 */
export function resolveAccessToken(storedToken: string | null | undefined): string {
    if (!storedToken) return ''

    if (isTokenEncrypted(storedToken)) {
        try {
            return decryptToken(storedToken)
        } catch (error) {
            console.error('[TokenCrypto] Failed to decrypt token:', error)
            return ''
        }
    }

    // Token is stored in plaintext (legacy / encryption key not configured)
    return storedToken
}
