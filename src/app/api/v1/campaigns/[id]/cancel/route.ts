import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'
import { cancelCampaign } from '@/services/campaigns'

export async function POST(
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
    const updated = await cancelCampaign({
      organizationId: access.organizationId,
      campaignId: id,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[api/campaigns/[id]/cancel] POST error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao cancelar campanha' },
      { status: 400 }
    )
  }
}
