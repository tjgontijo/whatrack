import { NextRequest, NextResponse } from 'next/server'

import { createAiAgentSchema } from '@/schemas/ai/ai-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { createAiAgent, listAiAgents } from '@/services/ai/ai-agent.service'

export async function GET(request: NextRequest) {
  try {
    const access = await validatePermissionAccess(request, 'view:ai')
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agents = await listAiAgents(access.organizationId)
    return NextResponse.json({ agents })
  } catch (error) {
    console.error('[GET ai-agents]', error)
    return NextResponse.json({ error: 'Erro ao buscar agentes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = createAiAgentSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const agent = await createAiAgent(access.organizationId, parsed.data)
    return NextResponse.json({ agent }, { status: 201 })
  } catch (error) {
    console.error('[POST ai-agents]', error)
    return NextResponse.json({ error: 'Erro ao criar agente' }, { status: 500 })
  }
}
