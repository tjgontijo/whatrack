import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { metaAdAccountsQuerySchema } from '@/schemas/meta-ads/meta-ads-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'
import { listMetaAdAccounts } from '@/services/meta-ads/meta-account-query.service'

export async function GET(req: NextRequest) {
  const access = await validateFullAccess(req)

  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error || 'Unauthorized', 401)
  }

  try {
    const { searchParams } = new URL(req.url)
    const parsed = metaAdAccountsQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) {
      return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const projectId = await resolveProjectScope({
      organizationId: access.organizationId,
      projectId: searchParams.get('projectId') ?? undefined,
    })

    if (!projectId) {
      return apiError('Project not found', 400)
    }

    const accounts = await listMetaAdAccounts({
      organizationId: access.organizationId,
      projectId,
      sync: parsed.data.sync,
    })
    return apiSuccess(accounts)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list ad accounts'
    return apiError(message, 500, error)
  }
}
