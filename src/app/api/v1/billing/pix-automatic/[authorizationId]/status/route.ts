import { NextRequest } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { CheckoutStatusTokenService } from '@/services/billing/checkout-status-token.service'
import { PixAutomaticService } from '@/services/billing/pix-automatic.service'
import { apiError, apiSuccess } from '@/lib/utils/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ authorizationId: string }> }
) {
  const { authorizationId } = await params
  // Try authenticated access first
  const auth = await validateFullAccess(request)

  if (auth.hasAccess && auth.organizationId) {
    // Authenticated user - can access their own authorization
    try {
      const status = await PixAutomaticService.getAuthorizationStatus(
        authorizationId,
        auth.organizationId
      )
      return apiSuccess({ id: authorizationId, status: status.status })
    } catch {
      return apiError('Authorization not found', 404)
    }
  }

  // Try token-based access for guests
  const tokenParam = request.nextUrl.searchParams.get('token')
  if (!tokenParam || !CheckoutStatusTokenService.verifyAuthorizationToken(tokenParam, authorizationId)) {
    return apiError('Unauthorized', 403)
  }

  // Token valid - allow guest access
  try {
    const status = await PixAutomaticService.getAuthorizationStatusById(authorizationId)
    return apiSuccess({ id: authorizationId, status: status.status })
  } catch {
    return apiError('Authorization not found', 404)
  }
}
