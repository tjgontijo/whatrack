import { NextResponse } from 'next/server'

import { dashboardSummaryQuerySchema } from '@/schemas/dashboard/dashboard-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { getDashboardSummary } from '@/services/dashboard/dashboard-summary.service'

export async function GET(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const parsed = dashboardSummaryQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  )

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const payload = await getDashboardSummary(access.organizationId, parsed.data)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('[api/dashboard/summary] GET error:', error)
    return NextResponse.json({ error: 'Falha ao gerar resumo' }, { status: 500 })
  }
}
