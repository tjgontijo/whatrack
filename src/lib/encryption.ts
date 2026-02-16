import crypto from 'crypto';

const algorithm = 'aes-256-gcm';

/**
 * Token Encryption Service
 * Encrypts/decrypts WhatsApp access tokens using AES-256-GCM
 *
 * ⚠️ CRITICAL: Token_ENCRYPTION_KEY must be 64-char hex string (256 bits)
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export class TokenEncryption {
  private key: Buffer;

  constructor() {
    const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'TOKEN_ENCRYPTION_KEY must be 64-char hex string (256 bits). ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  /**
   * Encrypt plaintext token
   * Format: {iv}:{authTag}:{encryptedData}
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt ciphertext token
   */
  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Singleton instance
export const encryption = new TokenEncryption();
