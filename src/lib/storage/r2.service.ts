import "server-only"
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { env } from '@/lib/env/env'
import { logger } from '@/lib/utils/logger'

class R2Service {
  private client: S3Client | null = null

  constructor() {
    if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ENDPOINT) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: env.R2_ENDPOINT,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      })
    }
  }

  /**
   * Upload a buffer to R2.
   * @param key The path/filename in the bucket
   * @param body The file content
   * @param contentType MIME type
   */
  async upload(key: string, body: Buffer | ArrayBuffer, contentType: string): Promise<string | null> {
    if (!this.client || !env.R2_BUCKET_NAME) {
      logger.warn('[R2Service] R2 is not configured, skipping upload')
      return null
    }

    try {
      logger.info({ context: { key, contentType } }, '[R2Service] Uploading file')

      const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: body instanceof ArrayBuffer ? Buffer.from(body) : body,
        ContentType: contentType,
      })

      await this.client.send(command)

      logger.info({ context: { key } }, '[R2Service] Upload successful')
      return key
    } catch (error) {
      logger.error({ err: error, context: { key } }, '[R2Service] Upload failed')
      return null
    }
  }

  /**
   * Download a file from R2.
   */
  async download(
    key: string
  ): Promise<{ body: any; contentType: string } | null> {
    if (!this.client || !env.R2_BUCKET_NAME) return null

    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3')
      const command = new GetObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
      })

      const response = await this.client.send(command)
      if (!response.Body) return null

      return {
        body: response.Body,
        contentType: response.ContentType || 'application/octet-stream',
      }
    } catch (error) {
      logger.error({ err: error, context: { key } }, '[R2Service] Download failed')
      return null
    }
  }

  /**
   * Helper to generate a structured path for WhatsApp media
   */
  generateWhatsAppMediaPath(params: {
    organizationId: string
    year: number
    month: number
    day: number
    messageId: string
    extension: string
  }): string {
    const { organizationId, year, month, day, messageId, extension } = params
    const monthStr = String(month).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    
    return `organizations/${organizationId}/whatsapp/media/${year}/${monthStr}/${dayStr}/${messageId}.${extension}`
  }
}

export const r2Service = new R2Service()
