import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { getTransactions } from '@/services/campaigns'

const querySchema = z.object({
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
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
  const parsed = querySchema.safeParse({
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
    const tx = await getTransactions({
      organizationId: access.organizationId,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    })

    return NextResponse.json(tx)
  } catch (error) {
    console.error('[api/campaigns/credits/transactions] GET error', error)
    return NextResponse.json(
      { error: 'Erro ao listar transações' },
      { status: 500 }
    )
  }
}
