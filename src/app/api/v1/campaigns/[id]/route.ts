import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'
import { getCampaignById, updateCampaign } from '@/services/campaigns'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 }
    )
  }

  try {
    const campaign = await getCampaignById({
      organizationId: access.organizationId,
      campaignId: id,
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    return NextResponse.json(campaign)
  } catch (error) {
    console.error('[api/campaigns/[id]] GET error', error)
    return NextResponse.json(
      { error: 'Erro ao buscar campanha' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await updateCampaign({
      organizationId: access.organizationId,
      campaignId: id,
      name: parsed.data.name,
      scheduledAt: parsed.data.scheduledAt,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[api/campaigns/[id]] PUT error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar campanha' },
      { status: 400 }
    )
  }
}
