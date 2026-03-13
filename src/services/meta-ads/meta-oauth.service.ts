import { auditService } from '@/services/audit/audit.service'
import { metaAccessTokenService } from '@/services/meta-ads/access-token.service'
import { metaAdAccountService } from '@/services/meta-ads/ad-account.service'
import { consumeMetaOAuthState } from '@/services/meta-ads/meta-oauth-state.service'

interface BuildAuthorizeUrlInput {
  clientId: string
  redirectUri: string
  stateToken: string
}

export function buildMetaAdsAuthorizeUrl(input: BuildAuthorizeUrlInput) {
  const scopes = ['ads_read', 'ads_management', 'public_profile'].join(',')
  return `https://www.facebook.com/v25.0/dialog/oauth?client_id=${input.clientId}&redirect_uri=${encodeURIComponent(input.redirectUri)}&scope=${scopes}&state=${input.stateToken}&response_type=code`
}

type CompleteMetaAdsOAuthResult =
  | { success: true }
  | { success: false; reason: 'meta_auth_invalid_state' | 'meta_callback_error' }

export async function completeMetaAdsOAuthCallback(
  code: string,
  stateToken: string,
  redirectUri?: string
): Promise<CompleteMetaAdsOAuthResult> {
  const stateData = await consumeMetaOAuthState(stateToken)
  if (!stateData) {
    return { success: false, reason: 'meta_auth_invalid_state' }
  }

  try {
    const shortLivedToken = await metaAccessTokenService.getShortLivedToken(code, redirectUri)
    const connection = await metaAccessTokenService.upsertConnection(
      stateData.organizationId,
      shortLivedToken
    )

    await metaAdAccountService.syncAdAccounts(connection.id)

    void auditService.log({
      organizationId: stateData.organizationId,
      userId: stateData.userId,
      action: 'meta_ads.connected',
      resourceType: 'meta_connection',
      resourceId: connection.id,
      after: {
        fbUserId: connection.fbUserId,
        fbUserName: connection.fbUserName,
      },
    })

    return { success: true }
  } catch {
    return { success: false, reason: 'meta_callback_error' }
  }
}
