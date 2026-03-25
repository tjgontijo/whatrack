import { NextResponse } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'
import { createCampaign } from '@/services/whatsapp/whatsapp-campaign.service'
import {
  listCampaigns,
  getCampaignCounters,
} from '@/services/whatsapp/whatsapp-campaign-query.service'
import {
  whatsappCampaignCreateSchema,
  whatsappCampaignListQuerySchema,
} from '@/schemas/whatsapp/whatsapp-campaign-schemas'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const { searchParams } = new URL(request.url)
  const query = whatsappCampaignListQuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!query.success) {
    return apiError('Parâmetros inválidos', 400, { details: query.error.flatten() })
  }

  const projectId = await resolveProjectScope({
    organizationId: access.organizationId,
    projectId: query.data.projectId,
  })

  const [data, counters] = await Promise.all([
    listCampaigns(access.organizationId, { ...query.data, projectId: projectId ?? undefined }),
    getCampaignCounters(access.organizationId, projectId ?? undefined),
  ])

  return apiSuccess({ ...data, counters })
}

export async function POST(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId || !access.userId) {
    return apiError('Unauthorized', 401)
  }

  const parsed = whatsappCampaignCreateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return apiError('Payload inválido', 400, undefined, { details: parsed.error.flatten() })
  }

  const result = await createCampaign(access.organizationId, access.userId, parsed.data)

  if (!result.success) {
    return apiError(result.error, result.status)
  }

  return apiSuccess({ id: result.data.id }, 201)
}
