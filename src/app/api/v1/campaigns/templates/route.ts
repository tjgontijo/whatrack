import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'
import { listTemplates } from '@/services/campaigns'

const querySchema = z.object({
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']).optional(),
  status: z.enum(['APPROVED', 'PENDING', 'REJECTED', 'PAUSED']).optional(),
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
    category: searchParams.get('category') ?? undefined,
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
    const result = await listTemplates({
      organizationId: access.organizationId,
      category: parsed.data.category as any,
      status: parsed.data.status as any,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/campaigns/templates] GET error', error)
    return NextResponse.json(
      { error: 'Erro ao listar templates' },
      { status: 500 }
    )
  }
}
