import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { aiResourceIdParamSchema, updateAiSkillSchema } from '@/schemas/ai/ai-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { deleteAiSkill, getAiSkillById, updateAiSkill } from '@/services/ai/ai-skill.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await validatePermissionAccess(request, 'view:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const parsedParams = aiResourceIdParamSchema.safeParse(await params)
    if (!parsedParams.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsedParams.error.flatten() })
    }

    const { id: skillId } = parsedParams.data
    const skill = await getAiSkillById(access.organizationId, skillId)
    if (!skill) {
      return apiError('Skill não encontrada', 404)
    }

    return NextResponse.json({ skill })
  } catch (error) {
    logger.error({ err: error }, '[GET ai-skill]')
    return apiError('Erro ao buscar skill', 500, error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const parsedParams = aiResourceIdParamSchema.safeParse(await params)
    if (!parsedParams.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsedParams.error.flatten() })
    }

    const parsed = updateAiSkillSchema.safeParse(await request.json())
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const { id: skillId } = parsedParams.data
    const result = await updateAiSkill(access.organizationId, skillId, parsed.data)
    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json({ skill: result.data })
  } catch (error) {
    logger.error({ err: error }, '[PATCH ai-skill]')
    return apiError('Erro ao atualizar skill', 500, error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const parsedParams = aiResourceIdParamSchema.safeParse(await params)
    if (!parsedParams.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsedParams.error.flatten() })
    }

    const { id: skillId } = parsedParams.data
    const result = await deleteAiSkill(access.organizationId, skillId)
    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json({ message: 'Skill removida com sucesso' })
  } catch (error) {
    logger.error({ err: error }, '[DELETE ai-skill]')
    return apiError('Erro ao remover skill', 500, error)
  }
}
