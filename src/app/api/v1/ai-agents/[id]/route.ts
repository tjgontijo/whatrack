import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { updateAiAgentSchema } from '@/schemas/ai/ai-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import {
  deleteAiAgent,
  getAiAgentById,
  updateAiAgent,
} from '@/services/ai/ai-agent.service'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const access = await validatePermissionAccess(request, 'view:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const agent = await getAiAgentById(access.organizationId, id)

    if (!agent) {
      return apiError('Agente não encontrado', 404)
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('[GET ai-agent]', error)
    return apiError('Erro ao buscar agente', 500, error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const parsed = updateAiAgentSchema.safeParse(await request.json())
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await updateAiAgent(access.organizationId, id, parsed.data)

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json({ agent: result.data })
  } catch (error) {
    console.error('[PATCH ai-agent]', error)
    return apiError('Erro ao atualizar agente', 500, error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const result = await deleteAiAgent(access.organizationId, id)
    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json({ message: 'Agente removido com sucesso' })
  } catch (error) {
    console.error('[DELETE ai-agent]', error)
    return apiError('Erro ao remover agente', 500, error)
  }
}
