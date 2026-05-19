import { type NextRequest, NextResponse } from 'next/server'
import { listTemplatesService } from '@/features/deal-stage-templates/services/list-templates.service'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { prisma } from '@/lib/db/prisma'
import { resolveProjectScope } from '@/server/project/project-scope'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:deals')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const projectId = await resolveProjectScope({
      organizationId: access.organizationId,
      projectId: searchParams.get('projectId') ?? undefined,
    })
    const result = await listTemplatesService(access.organizationId, projectId ?? undefined)
    return NextResponse.json(result.data)
  } catch (error) {
    logger.error({ err: error }, '[deal-stage-templates] GET error')
    return apiError('Falha ao buscar templates', 500, error)
  }
}

export async function POST(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'manage:deals')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const body = await req.json()
    const { name, projectId: rawProjectId, stages } = body

    if (!name?.trim()) return apiError('Nome obrigatório', 400)
    if (!stages?.length) return apiError('Fases obrigatórias', 400)

    const projectId = await resolveProjectScope({
      organizationId: access.organizationId,
      projectId: rawProjectId,
    })
    if (!projectId) return apiError('Projeto inválido', 400)

    const template = await prisma.dealStageTemplate.create({
      data: {
        name: name.trim(),
        category: 'custom',
        isPersonal: true,
        organizationId: access.organizationId,
        projectId,
        items: {
          create: stages.map((s: any, i: number) => ({
            name: s.name,
            color: s.color,
            order: i,
            statusGroup: s.statusGroup,
            probability: s.probability ?? 50,
            suggestedMetaEventName: s.suggestedMetaEventName ?? null,
          })),
        },
      },
      include: { items: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, '[deal-stage-templates] POST error')
    return apiError('Falha ao criar template', 500, error)
  }
}
