import { createHmac } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { env } from '@/lib/env/env'

/**
 * GET /api/v1/centrifugo/token
 *
 * Generates a Centrifugo JWT token for establishing WebSocket connection.
 * Token includes user and organization context for channel subscriptions.
 *
 * Token expires in 1 hour. Frontend should refresh token at 50 minutes.
 *
 * Response:
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIs..."
 * }
 */
export async function GET(request: NextRequest) {
  const rateLimited = await rateLimitMiddleware(request, '/api/v1/centrifugo/token')
  if (rateLimited) return rateLimited

  try {
    // Validate user authentication and organization access
    const access = await validateFullAccess(request)

    if (!access.hasAccess || !access.userId || !access.organizationId) {
      return apiError(access.error || 'Unauthorized', 401)
    }

    const secret = env.CENTRIFUGO_TOKEN_HMAC_SECRET_KEY

    // Generate JWT token with user and organization context
    const now = Math.floor(Date.now() / 1000)
    const exp = now + 3600 // Token expires in 1 hour

    const claims = {
      sub: access.userId,
      exp,
      iat: now,
      info: {
        organizationId: access.organizationId,
      },
    }

    // Encode header and payload
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
    const message = `${header}.${payload}`

    // Sign with HMAC-SHA256
    const signature = createHmac('sha256', secret).update(message, 'utf-8').digest('base64url')

    const token = `${message}.${signature}`

    return NextResponse.json({ token }, { status: 200 })
  } catch (error) {
    logger.error({ err: error }, '[Centrifugo] Token generation error')
    return apiError('Failed to generate token', 500, error)
  }
}
