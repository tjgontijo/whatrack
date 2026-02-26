import { NextRequest, NextResponse } from 'next/server'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agent = await getAiAgentById(access.organizationId, id)

    if (!agent) {
      return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('[GET ai-agent]', error)
    return NextResponse.json({ error: 'Erro ao buscar agente' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = updateAiAgentSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await updateAiAgent(access.organizationId, id, parsed.data)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ agent: result.data })
  } catch (error) {
    console.error('[PATCH ai-agent]', error)
    return NextResponse.json({ error: 'Erro ao atualizar agente' }, { status: 500 })
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await deleteAiAgent(access.organizationId, id)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ message: 'Agente removido com sucesso' })
  } catch (error) {
    console.error('[DELETE ai-agent]', error)
    return NextResponse.json({ error: 'Erro ao remover agente' }, { status: 500 })
  }
}
