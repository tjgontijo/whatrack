import { NextResponse } from 'next/server'
import { LeadConflictError } from '@/features/leads'
import { createLeadService, listLeadsService } from '@/features/leads/server'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function POST(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const payload = await req.json()
    const lead = await createLeadService({
      organizationId: access.organizationId,
      payload,
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, '[api/leads] POST error')

    if (error instanceof LeadConflictError) {
      if (error.field === 'phone') {
        return apiError('Já existe um lead com este número de telefone nesta organização', 409)
      }
      if (error.field === 'waId') {
        return apiError('Já existe um lead com este ID do WhatsApp nesta organização', 409)
      }

      return apiError('Já existe um lead com estas informações', 409)
    }

    return apiError('Falha ao criar lead', 500, error)
  }
}

export async function GET(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { searchParams } = new URL(req.url)

  try {
    const payload = await listLeadsService({
      organizationId: access.organizationId,
      filters: Object.fromEntries(searchParams),
    })

    return NextResponse.json(payload)
  } catch (error) {
    logger.error({ err: error }, '[api/leads] GET error')
    return apiError('Failed to fetch leads', 500, error)
  }
}
