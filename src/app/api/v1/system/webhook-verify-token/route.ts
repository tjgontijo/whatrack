import { type NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/guards'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { env } from '@/lib/env/env'


/**
 * GET /api/v1/system/webhook-verify-token
 * Retorna o Verify Token configurado na ENV para exibição na tela de Webhooks.
 * Apenas Super Admins podem acessar.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireSuperAdmin(request)
    if (user instanceof NextResponse) return user

    const verifyToken = env.META_WEBHOOK_VERIFY_TOKEN ?? ''

    return NextResponse.json({
      verifyToken,
      configured: !!verifyToken,
    })
  } catch (error) {
    logger.error({ err: error }, '[system/webhook-verify-token] Error')
    return apiError('Failed to fetch verify token', 500, error)
  }
}
