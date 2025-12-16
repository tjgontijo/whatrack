import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { listRecipients } from '@/services/campaigns'

const querySchema = z.object({
  status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED']).optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
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

  const searchParams = new URL(request.url).searchParams
  const parsed = querySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
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
    const recipients = await listRecipients({
      organizationId: access.organizationId,
      campaignId: id,
      status: parsed.data.status as any,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    })

    return NextResponse.json(recipients)
  } catch (error) {
    console.error('[api/campaigns/[id]/recipients] GET error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar destinatários' },
      { status: 400 }
    )
  }
}
