import { NextResponse, NextRequest } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/guards'
import { apiError } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/system/webhook-verify-token
 * Retorna o Verify Token configurado na ENV para exibição na tela de Webhooks.
 * Apenas Super Admins podem acessar.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireSuperAdmin(request)
    if (user instanceof NextResponse) return user

    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || ''

    return NextResponse.json({
      verifyToken,
      configured: !!verifyToken,
    })
  } catch (error) {
    console.error('[system/webhook-verify-token] Error:', error)
    return apiError('Failed to fetch verify token', 500, error)
  }
}
