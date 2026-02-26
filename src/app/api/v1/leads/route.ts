import { NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import {
  createLeadSchema,
  leadsQuerySchema,
} from '@/schemas/lead-schemas'
import { createLead, LeadConflictError, listLeads } from '@/services/leads/lead.service'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function POST(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId

  try {
    const body = await req.json()
    const validated = createLeadSchema.parse(body)
    const lead = await createLead({
      organizationId,
      input: validated,
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error('[api/leads] POST error:', error)

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

      return NextResponse.json(
        { error: 'Já existe um lead com estas informações' },
        { status: 409 }
      )
    }

    return apiError('Falha ao criar lead', 500, error)
  }
}

export async function GET(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId

  const { searchParams } = new URL(req.url)
  const parsed = leadsQuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const payload = await listLeads({
      organizationId,
      q: parsed.data.q,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      dateRange: parsed.data.dateRange,
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[api/leads] GET error:', error)
    return apiError('Failed to fetch leads', 500, error)
  }
}
