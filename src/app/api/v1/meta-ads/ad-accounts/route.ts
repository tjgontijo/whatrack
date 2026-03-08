import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { metaAdAccountsQuerySchema } from '@/schemas/meta-ads/meta-ads-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { listMetaAdAccounts } from '@/services/meta-ads/meta-account-query.service'

export async function GET(req: NextRequest) {
  const access = await validateFullAccess(req)

  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error || 'Unauthorized', 401)
  }

  try {
    const parsed = metaAdAccountsQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams))
    if (!parsed.success) {
      return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const accounts = await listMetaAdAccounts({
      organizationId: access.organizationId,
      sync: parsed.data.sync,
    })
    return apiSuccess(accounts)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list ad accounts'
    return apiError(message, 500, error)
  }
}
