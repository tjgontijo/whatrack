import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { createAiAgentSchema } from '@/schemas/ai/ai-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { createAiAgent, listAiAgents } from '@/services/ai/ai-agent.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const access = await validatePermissionAccess(request, 'view:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const agents = await listAiAgents(access.organizationId)
    return NextResponse.json({ agents })
  } catch (error) {
    logger.error({ err: error }, '[GET ai-agents]')
    return apiError('Erro ao buscar agentes', 500, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const parsed = createAiAgentSchema.safeParse(await request.json())
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await createAiAgent(access.organizationId, parsed.data)
    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json({ agent: result.data }, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, '[POST ai-agents]')
    return apiError('Erro ao criar agente', 500, error)
  }
}
