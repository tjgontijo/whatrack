import { createHmac, timingSafeEqual } from 'crypto'

export function computeAbacatePayWebhookSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload, 'utf-8').digest('base64')
}

export function verifyAbacatePayWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) {
    return false
  }

  const expectedSignature = computeAbacatePayWebhookSignature(payload, secret)
  const receivedBuffer = Buffer.from(signatureHeader, 'utf-8')
  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8')

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer)
}
