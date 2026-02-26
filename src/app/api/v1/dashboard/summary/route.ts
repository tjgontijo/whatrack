import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { dashboardSummaryQuerySchema } from '@/schemas/dashboard/dashboard-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { getDashboardSummary } from '@/services/dashboard/dashboard-summary.service'

export async function GET(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const parsed = dashboardSummaryQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  )

  if (!parsed.success) {
    return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
  }

  try {
    const payload = await getDashboardSummary(access.organizationId, parsed.data)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('[api/dashboard/summary] GET error:', error)
    return apiError('Falha ao gerar resumo', 500, error)
  }
}
