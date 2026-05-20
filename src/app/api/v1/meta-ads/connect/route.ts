import { type NextRequest, NextResponse } from 'next/server'
import { buildMetaAdsAuthorizeUrl } from '@/features/meta-ads/services/meta-oauth.service'
import { createMetaOAuthState } from '@/features/meta-ads/services/meta-oauth-state.service'
import { findProjectInOrg } from '@/features/projects/repositories/find-project-in-org.repository'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { env } from '@/lib/env/env'

function resolvePublicOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get('x-forwarded-host')
  const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'https'

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  return req.nextUrl.origin
}

function resolveRedirectUri(req: NextRequest): string {
  const requestUri = `${resolvePublicOrigin(req)}/api/v1/meta-ads/callback`
  const configured = env.META_OAUTH_REDIRECT_URI

  if (!configured) return requestUri

  const configuredUrl = new URL(configured)
  const isLocalhost =
    configuredUrl.hostname === 'localhost' || configuredUrl.hostname === '127.0.0.1'

  if (env.NODE_ENV === 'production' && isLocalhost) {
    logger.warn(
      { configuredRedirectUri: configured, requestOrigin: resolvePublicOrigin(req) },
      '[MetaAdsConnect] Ignoring localhost META_OAUTH_REDIRECT_URI in production'
    )
    return requestUri
  }

  return configured
}

export async function GET(req: NextRequest) {
  const access = await validateFullAccess(req)

  if (!access.hasAccess || !access.organizationId || !access.userId) {
    return apiError(access.error || 'Unauthorized', 401)
  }

  const clientId = env.META_ADS_APP_ID
  const redirectUri = resolveRedirectUri(req)

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
