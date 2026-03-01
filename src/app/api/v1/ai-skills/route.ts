import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { createAiSkillSchema } from '@/schemas/ai/ai-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { createAiSkill, listAiSkills } from '@/services/ai/ai-skill.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const access = await validatePermissionAccess(request, 'view:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const skills = await listAiSkills(access.organizationId)
    return NextResponse.json({ skills })
  } catch (error) {
    logger.error({ err: error }, '[GET ai-skills]')
    return apiError('Erro ao buscar skills', 500, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const parsed = createAiSkillSchema.safeParse(await request.json())
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await createAiSkill(access.organizationId, parsed.data)
    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json({ skill: result.data }, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, '[POST ai-skills]')
    return apiError('Erro ao criar skill', 500, error)
  }
}
