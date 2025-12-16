import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { createCampaign, listCampaigns } from '@/services/campaigns'

const listSchema = z.object({
  status: z
    .enum(['DRAFT', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'])
    .optional(),
  templateId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
})

const createSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1),
  recipients: z
    .array(
      z.object({
        phone: z.string().min(6),
        variables: z.record(z.string(), z.any()).optional(),
      })
    )
    .min(1),
  scheduledAt: z.string().datetime().optional(),
})

export async function GET(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 }
    )
  }

  const searchParams = new URL(request.url).searchParams
  const parsed = listSchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    templateId: searchParams.get('templateId') ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const result = await listCampaigns({
      organizationId: access.organizationId,
      status: parsed.data.status as any,
      templateId: parsed.data.templateId || undefined,
      dateFrom: parsed.data.dateFrom || undefined,
      dateTo: parsed.data.dateTo || undefined,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/campaigns] GET error', error)
    return NextResponse.json({ error: 'Erro ao listar campanhas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const campaign = await createCampaign({
      organizationId: access.organizationId,
      templateId: parsed.data.templateId,
      name: parsed.data.name,
      recipients: parsed.data.recipients,
      scheduledAt: parsed.data.scheduledAt,
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('[api/campaigns] POST error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar campanha' },
      { status: 400 }
    )
  }
}
