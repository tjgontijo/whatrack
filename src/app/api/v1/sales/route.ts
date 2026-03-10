import { NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { revalidateTag } from 'next/cache'

import { createSaleSchema, salesQuerySchema } from '@/schemas/sales/sale-schemas'
import { createSale, listSales } from '@/services/sales/sale.service'
import { resolveProjectScope } from '@/server/project/project-scope'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { logger } from '@/lib/utils/logger'

export async function POST(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }
  const organizationId = access.organizationId
  const userId = access.userId

  try {
    const body = await req.json()
    const validated = createSaleSchema.parse(body)
    const projectId = await resolveProjectScope({
      organizationId,
      projectId: validated.projectId,
    })
    const sale = await createSale({
      organizationId,
      userId,
      projectId,
      input: validated,
    })

    revalidateTag('dashboard-summary', 'max')
    revalidateTag(`org-${organizationId}`, 'max')

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, '[api/sales] POST error')
    return apiError('Falha ao criar venda', 500, error)
  }
}

export async function GET(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }
  const organizationId = access.organizationId

  const { searchParams } = new URL(req.url)

  const parsed = salesQuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
  }

  try {
    const payload = await listSales({
      organizationId,
      projectId: await resolveProjectScope({
        organizationId,
        projectId: parsed.data.projectId,
      }),
      q: parsed.data.q,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      dateRange: parsed.data.dateRange,
      status: parsed.data.status,
    })

    return NextResponse.json(payload)
  } catch (error) {
    logger.error({ err: error }, '[api/sales] GET error')
    return apiError('Failed to fetch sales', 500, error)
  }
}
