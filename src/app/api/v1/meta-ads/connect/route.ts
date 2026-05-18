import { type NextRequest, NextResponse } from 'next/server'
import { buildMetaAdsAuthorizeUrl } from '@/features/meta-ads/services/meta-oauth.service'
import { createMetaOAuthState } from '@/features/meta-ads/services/meta-oauth-state.service'
import { findProjectInOrg } from '@/features/projects/repositories/find-project-in-org.repository'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { env } from '@/lib/env/env'

export async function GET(req: NextRequest) {
  const access = await validateFullAccess(req)

  if (!access.hasAccess || !access.organizationId || !access.userId) {
    return apiError(access.error || 'Unauthorized', 401)
  }

  const clientId = env.META_ADS_APP_ID
  const origin = req.nextUrl.origin
  const redirectUri = env.META_OAUTH_REDIRECT_URI || `${origin}/api/v1/meta-ads/callback`

  if (!clientId) {
    logger.error('[MetaAdsConnect] META_ADS_APP_ID not configured')
    return apiError('Server configuration error', 500)
  }

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return apiError('projectId is required', 400)
  }

  const project = await findProjectInOrg(projectId, access.organizationId)
  if (!project) {
    return apiError('Project not found or does not belong to your organization', 404)
  }

  const stateToken = await createMetaOAuthState({
    organizationId: access.organizationId,
    userId: access.userId,
    projectId,
  })

  const authUrl = buildMetaAdsAuthorizeUrl({ clientId, redirectUri, stateToken })

  return NextResponse.redirect(authUrl)
}
