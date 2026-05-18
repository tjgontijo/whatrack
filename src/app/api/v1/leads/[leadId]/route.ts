import { type NextRequest, NextResponse } from 'next/server'
import { LeadConflictError } from '@/features/leads'
import { deleteLeadService, getLeadByIdService, updateLeadService } from '@/features/leads/server'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function GET(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { leadId } = await params

  try {
    const lead = await getLeadByIdService(access.organizationId, leadId)

    if (!lead) {
      return apiError('Lead não encontrado', 404)
    }

    return NextResponse.json(lead)
  } catch (error) {
    logger.error({ err: error }, '[api/leads/[leadId]] GET error')
    return apiError('Falha ao buscar lead', 500, error)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { leadId } = await params

  try {
    const payload = await req.json()
    const updated = await updateLeadService({
      organizationId: access.organizationId,
      leadId,
      payload,
    })

    if (!updated) {
      return apiError('Lead não encontrado', 404)
    }

    return NextResponse.json(updated)
  } catch (error) {
    logger.error({ err: error }, '[api/leads/[leadId]] PUT error')

    if (error instanceof LeadConflictError) {
      if (error.field === 'phone') {
        return apiError('Já existe um lead com este número de telefone nesta organização', 409)
      }
      if (error.field === 'waId') {
        return apiError('Já existe um lead com este ID do WhatsApp nesta organização', 409)
      }
    }

    return apiError('Falha ao atualizar lead', 500, error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { leadId } = await params

  try {
    const deleted = await deleteLeadService({
      organizationId: access.organizationId,
      leadId,
    })

    if (!deleted) {
      return apiError('Lead não encontrado', 404)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, '[api/leads/[leadId]] DELETE error')
    return apiError('Falha ao deletar lead', 500, error)
  }
}
