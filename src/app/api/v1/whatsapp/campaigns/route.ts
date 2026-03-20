import { NextResponse } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
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

  const [data, counters] = await Promise.all([
    listCampaigns(access.organizationId, query.data),
    getCampaignCounters(access.organizationId),
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
