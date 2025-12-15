import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'
import { exportRecipientsCsv } from '@/services/campaigns'

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
    const csv = await exportRecipientsCsv({
      organizationId: access.organizationId,
      campaignId: id,
    })

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="campaign-${id}-recipients.csv"`,
      },
    })
  } catch (error) {
    console.error('[api/campaigns/[id]/export] GET error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao exportar destinatários' },
      { status: 400 }
    )
  }
}
