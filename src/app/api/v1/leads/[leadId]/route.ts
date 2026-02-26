import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'

import { updateLeadSchema } from '@/schemas/lead-schemas'
import {
  deleteLead,
  getLeadById,
  LeadConflictError,
  updateLead,
} from '@/services/leads/lead.service'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function GET(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId
  const { leadId } = await params

  try {
    const lead = await getLeadById(organizationId, leadId)

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error('[api/leads/[leadId]] GET error:', error)
    return apiError('Falha ao buscar lead', 500, error)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId
  const { leadId } = await params

  try {
    const body = await req.json()
    const validated = updateLeadSchema.parse(body)

    const updated = await updateLead({
      organizationId,
      leadId,
      input: validated,
    })
    if (!updated) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[api/leads/[leadId]] PUT error:', error)

    if (error instanceof LeadConflictError) {
      if (error.field === 'phone') {
        return NextResponse.json(
          { error: 'Já existe um lead com este número de telefone nesta organização' },
          { status: 409 }
        )
      }
      if (error.field === 'waId') {
        return NextResponse.json(
          { error: 'Já existe um lead com este ID do WhatsApp nesta organização' },
          { status: 409 }
        )
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
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId
  const { leadId } = await params

  try {
    const deleted = await deleteLead({
      organizationId,
      leadId,
    })
    if (!deleted) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/leads/[leadId]] DELETE error:', error)
    return apiError('Falha ao deletar lead', 500, error)
  }
}
