import { createHmac, timingSafeEqual } from 'node:crypto'

const CHECKOUT_STATUS_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours

type CheckoutStatusPayload = {
  type: 'invoice' | 'authorization'
  resourceId: string
  exp: number
}

function getSecret() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error('BETTER_AUTH_SECRET is not configured')
  return secret
}

function sign(payload: string) {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export class CheckoutStatusTokenService {
  static create(type: 'invoice' | 'authorization', resourceId: string) {
    const payload = Buffer.from(
      JSON.stringify({
        type,
        resourceId,
        exp: Date.now() + CHECKOUT_STATUS_TOKEN_TTL_MS,
      } satisfies CheckoutStatusPayload),
    ).toString('base64url')
    return `${payload}.${sign(payload)}`
  }

  static createInvoiceToken(invoiceId: string) {
    return this.create('invoice', invoiceId)
  }

  static createAuthorizationToken(authorizationId: string) {
    return this.create('authorization', authorizationId)
  }

  static verify(token: string): CheckoutStatusPayload | null {
    try {
      const [payload, signature] = token.split('.')
      if (!payload || !signature) return null

      const expectedSignature = sign(payload)
      if (signature.length !== expectedSignature.length) return null

      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null
      }

      const decoded = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as CheckoutStatusPayload
      if (decoded.exp <= Date.now()) return null

      return decoded
    } catch {
      return null
    }
  }

  static verifyInvoiceToken(token: string, invoiceId: string): boolean {
    const decoded = this.verify(token)
    return decoded?.type === 'invoice' && decoded?.resourceId === invoiceId
  }

  static verifyAuthorizationToken(token: string, authorizationId: string): boolean {
    const decoded = this.verify(token)
    return decoded?.type === 'authorization' && decoded?.resourceId === authorizationId
  }
}
