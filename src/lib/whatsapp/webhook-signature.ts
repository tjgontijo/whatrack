import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifies the X-Hub-Signature-256 header sent by Meta on webhook POST requests.
 * 
 * Meta signs every webhook payload with HMAC-SHA256 using the App Secret as key.
 * Format: "sha256=<hex_digest>"
 * 
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export function verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null
): boolean {
    const appSecret = process.env.META_APP_SECRET

    if (!appSecret) {
        console.error('[WebhookSignature] META_APP_SECRET not configured')
        return false
    }

    if (!signatureHeader) {
        console.error('[WebhookSignature] No X-Hub-Signature-256 header present')
        return false
    }

    // Header format: "sha256=<hex>"
    const expectedPrefix = 'sha256='
    if (!signatureHeader.startsWith(expectedPrefix)) {
        console.error('[WebhookSignature] Invalid signature format (missing sha256= prefix)')
        return false
    }

    const receivedSignature = signatureHeader.slice(expectedPrefix.length)

    // Compute HMAC-SHA256 of the raw body using app secret
    const computedSignature = createHmac('sha256', appSecret)
        .update(rawBody, 'utf-8')
        .digest('hex')

    // Timing-safe comparison to prevent timing attacks
    try {
        const receivedBuffer = Buffer.from(receivedSignature, 'hex')
        const computedBuffer = Buffer.from(computedSignature, 'hex')

        if (receivedBuffer.length !== computedBuffer.length) {
            console.error('[WebhookSignature] Signature length mismatch')
            return false
        }

        return timingSafeEqual(receivedBuffer, computedBuffer)
    } catch (error) {
        console.error('[WebhookSignature] Error comparing signatures:', error)
        return false
    }
}
