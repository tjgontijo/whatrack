import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const FORMAT_VERSION = 'v1'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error('[TokenCrypto] TOKEN_ENCRYPTION_KEY is required')
  }

  if (keyHex.length !== 64) {
    throw new Error('[TokenCrypto] TOKEN_ENCRYPTION_KEY must have 64 hex chars (32 bytes)')
  }

  return Buffer.from(keyHex, 'hex')
}

/**
 * Encrypts a plaintext token using AES-256-GCM.
 * Returns format: v1:{iv}:{authTag}:{ciphertext}
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  let encrypted = cipher.update(plaintext, 'utf-8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag().toString('hex')
  return `${FORMAT_VERSION}:${iv.toString('hex')}:${authTag}:${encrypted}`
}

/**
 * Decrypts a token encrypted with encryptToken().
 */
export function decryptToken(encryptedValue: string): string {
  const key = getEncryptionKey()
  const parts = encryptedValue.split(':')

  if (parts.length !== 4 || !/^v\d+$/.test(parts[0])) {
    throw new Error('[TokenCrypto] Invalid encrypted token format')
  }

  const [version, ivHex, authTagHex, ciphertext] = parts
  if (version !== FORMAT_VERSION) {
    throw new Error(`[TokenCrypto] Unsupported token version: ${version}`)
  }

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'hex', 'utf-8')
  decrypted += decipher.final('utf-8')

  return decrypted
}

export function isTokenEncrypted(value: string): boolean {
  const parts = value.split(':')
  if (parts.length !== 4) return false
  const [version, iv, authTag, ciphertext] = parts
  if (!/^v\d+$/.test(version)) return false

  return (
    iv.length === 32 &&
    authTag.length === 32 &&
    ciphertext.length > 0 &&
    /^[0-9a-f]+$/i.test(`${iv}${authTag}${ciphertext}`)
  )
}

/**
 * Resolves a stored access token and enforces encrypted storage.
 */
export function resolveAccessToken(storedToken: string | null | undefined): string {
  if (!storedToken) return ''

  if (!isTokenEncrypted(storedToken)) {
    throw new Error('[TokenCrypto] Stored token must be encrypted')
  }

  return decryptToken(storedToken)
}
