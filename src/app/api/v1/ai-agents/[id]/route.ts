import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { aiResourceIdParamSchema, updateAiAgentSchema } from '@/schemas/ai/ai-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import {
  deleteAiAgent,
  getAiAgentById,
  updateAiAgent,
} from '@/services/ai/ai-agent.service'
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

    const { id } = parsedParams.data
    const agent = await getAiAgentById(access.organizationId, id)

    if (!agent) {
      return apiError('Agente não encontrado', 404)
    }

    return NextResponse.json({ agent })
  } catch (error) {
    logger.error({ err: error }, '[GET ai-agent]')
    return apiError('Erro ao buscar agente', 500, error)
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

    const parsed = updateAiAgentSchema.safeParse(await request.json())
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const { id } = parsedParams.data
    const result = await updateAiAgent(access.organizationId, id, parsed.data)

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json({ agent: result.data })
  } catch (error) {
    logger.error({ err: error }, '[PATCH ai-agent]')
    return apiError('Erro ao atualizar agente', 500, error)
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

    const { id } = parsedParams.data
    const result = await deleteAiAgent(access.organizationId, id)
    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json({ message: 'Agente removido com sucesso' })
  } catch (error) {
    logger.error({ err: error }, '[DELETE ai-agent]')
    return apiError('Erro ao remover agente', 500, error)
  }
}
