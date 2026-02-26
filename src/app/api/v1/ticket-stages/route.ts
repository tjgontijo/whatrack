import { NextResponse } from 'next/server'

import { validateFullAccess, validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { createTicketStageSchema } from '@/schemas/ticket-stage-schemas'
import { createTicketStage, listTicketStages } from '@/services/ticket-stages/ticket-stage.service'

export async function GET(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    return NextResponse.json(await listTicketStages(access.organizationId))
  } catch (error) {
    console.error('[ticket-stages] GET error:', error)
    return NextResponse.json({ error: 'Falha ao buscar fases' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const access = await validatePermissionAccess(req, 'manage:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = createTicketStageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await createTicketStage({
      organizationId: access.organizationId,
      name: parsed.data.name,
      color: parsed.data.color,
      order: parsed.data.order,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[ticket-stages] POST error:', error)
    return NextResponse.json({ error: 'Falha ao criar fase' }, { status: 500 })
  }
}
