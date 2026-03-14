import { encryption } from '@/lib/utils/encryption'

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
 * Encrypts a plaintext token using the version-aware encryption system.
 */
export function encryptToken(plaintext: string): string {
  return encryption.encrypt(plaintext)
}

/**
 * Resolves a stored access token and enforces encrypted storage.
 */
export function resolveAccessToken(storedToken: string | null | undefined): string {
  if (!storedToken) return ''

  if (!isTokenEncrypted(storedToken)) {
    throw new Error('[TokenCrypto] Stored token must be encrypted')
  }

  return encryption.decrypt(storedToken)
}
