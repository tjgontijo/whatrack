import { NextRequest, NextResponse } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { updateTicketStageSchema } from '@/schemas/ticket-stage-schemas'
import { deleteTicketStage, updateTicketStage } from '@/services/ticket-stages/ticket-stage.service'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ stageId: string }> }) {
  const access = await validatePermissionAccess(req, 'manage:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = updateTicketStageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { stageId } = await params
    const result = await updateTicketStage({
      organizationId: access.organizationId,
      stageId,
      name: parsed.data.name,
      color: parsed.data.color,
      isDefault: parsed.data.isDefault,
      isClosed: parsed.data.isClosed,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[ticket-stages/[stageId]] PUT error:', error)
    return NextResponse.json({ error: 'Falha ao atualizar fase' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  const access = await validatePermissionAccess(req, 'manage:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const { stageId } = await params
    const result = await deleteTicketStage({
      organizationId: access.organizationId,
      stageId,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[ticket-stages/[stageId]] DELETE error:', error)
    return NextResponse.json({ error: 'Falha ao excluir fase' }, { status: 500 })
  }
}
