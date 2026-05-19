import { NextResponse } from 'next/server'
import { applyTemplateService } from '@/features/deal-stage-templates/services/apply-template.service'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'

export async function POST(req: Request) {
  const access = await validatePermissionAccess(req, 'manage:deals')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const body = await req.json()
    const { templateId, projectId: rawProjectId } = body

    if (!templateId) {
      return apiError('Template ID é obrigatório', 400)
    }

    const projectId = await resolveProjectScope({
      organizationId: access.organizationId,
      projectId: rawProjectId,
    })

    if (!projectId) {
      return apiError('Projeto não encontrado', 404)
    }

    const result = await applyTemplateService({
      organizationId: access.organizationId,
      projectId,
      templateId,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result.data)
  } catch (error) {
    logger.error({ err: error }, '[deal-stage-templates] POST apply error')
    return apiError('Falha ao aplicar template', 500, error)
  }
}
