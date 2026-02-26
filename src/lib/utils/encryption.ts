import crypto from 'crypto'

const algorithm = 'aes-256-gcm'

/**
 * Token Encryption Service
 * Encrypts/decrypts tokens using AES-256-GCM with key versioning for rotation support.
 *
 * Format: v{N}:{iv}:{authTag}:{ciphertext}
 *
 * Key configuration:
 *   TOKEN_ENCRYPTION_KEY          — The current active key (64-char hex)
 *   ENCRYPTION_KEYS               — JSON map of versioned keys: {"v1":"hex...","v2":"hex..."}
 *   ENCRYPTION_CURRENT_VERSION    — Which version to use for new encryptions (default: "v1")
 *
 * Migration:
 *   When rotating to a new key, set ENCRYPTION_KEYS with both old and new keys,
 *   set ENCRYPTION_CURRENT_VERSION to the new version, and run the migration script
 *   (prisma/scripts/re-encrypt-tokens.ts) to re-encrypt existing tokens.
 *
 * Generate a new key:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export class TokenEncryption {
  private keys: Map<string, Buffer>
  private currentVersion: string

  constructor() {
    this.keys = new Map()

    // Load versioned keys from ENCRYPTION_KEYS if available
    const keysJson = process.env.ENCRYPTION_KEYS
    if (keysJson) {
      try {
        const parsed = JSON.parse(keysJson) as Record<string, string>
        for (const [version, keyHex] of Object.entries(parsed)) {
          if (!keyHex || keyHex.length !== 64) {
            throw new Error(`[Encryption] Key for ${version} must be 64-char hex string`)
          }
          this.keys.set(version, Buffer.from(keyHex, 'hex'))
        }
      } catch (err) {
        if (err instanceof SyntaxError) {
          throw new Error('[Encryption] ENCRYPTION_KEYS must be valid JSON: {"v1":"hex..."}')
        }
        throw err
      }
    }

    // Default key source when ENCRYPTION_KEYS is not provided.
    if (!this.keys.has('v1')) {
      const keyHex = process.env.TOKEN_ENCRYPTION_KEY
      if (!keyHex || keyHex.length !== 64) {
        throw new Error(
          'TOKEN_ENCRYPTION_KEY must be a 64-char hex string (256 bits). ' +
            "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        )
      }
      this.keys.set('v1', Buffer.from(keyHex, 'hex'))
    }

    this.currentVersion = process.env.ENCRYPTION_CURRENT_VERSION || 'v1'

    if (!this.keys.has(this.currentVersion)) {
      throw new Error(`[Encryption] No key found for current version "${this.currentVersion}"`)
    }
  }

  /**
   * Encrypt plaintext using the current version key.
   * Output format: v{N}:{iv}:{authTag}:{ciphertext}
   */
  encrypt(plaintext: string): string {
    const key = this.keys.get(this.currentVersion)!
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()
    return `${this.currentVersion}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  }

  /**
   * Decrypt ciphertext in format: v{N}:{iv}:{authTag}:{ciphertext}
   */
  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':')

    if (parts.length !== 4 || !/^v\d+$/.test(parts[0])) {
      throw new Error('Invalid ciphertext format')
    }
    const [version, ivHex, authTagHex, encrypted] = parts

    const key = this.keys.get(version)
    if (!key) {
      throw new Error(`[Encryption] No key available for version "${version}"`)
    }

    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * Returns the version prefix of an encrypted value (for migration tooling).
   */
  getVersion(ciphertext: string): string {
    const parts = ciphertext.split(':')
    if (parts.length !== 4 || !/^v\d+$/.test(parts[0])) {
      throw new Error('Invalid ciphertext format')
    }
    return parts[0]
  }

  /**
   * Returns true if the ciphertext was encrypted with the current key version.
   * Used by migration scripts to identify tokens that need re-encryption.
   */
  isCurrentVersion(ciphertext: string): boolean {
    return this.getVersion(ciphertext) === this.currentVersion
  }
}

// Singleton instance
export const encryption = new TokenEncryption()
