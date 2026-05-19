import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getExecutiveScorecard } from '@/features/dashboard/services/executive-scorecard.service'
import { resolveFiltersDateRange } from '@/features/dashboard/services/build-filters'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'

const querySchema = z.object({
  period: z.string().optional().default('7d'),
  projectId: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  )

  if (!parsed.success) {
    return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
  }

  try {
    const dateRange = resolveFiltersDateRange({
      period: parsed.data.period,
    })

    const projectId = await resolveProjectScope({
      organizationId: access.organizationId,
      projectId: parsed.data.projectId,
    })

    const metrics = await getExecutiveScorecard(
      access.organizationId,
      dateRange,
      projectId
    )

    return NextResponse.json(metrics)
  } catch (error) {
    logger.error({ err: error }, '[api/dashboard/executive-scorecard] GET error')
    return apiError('Falha ao gerar scorecard executivo', 500, error)
  }
}
