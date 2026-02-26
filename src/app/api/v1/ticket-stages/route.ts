import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validateFullAccess, validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { createTicketStageSchema } from '@/schemas/tickets/ticket-stage-schemas'
import { createTicketStage, listTicketStages } from '@/services/ticket-stages/ticket-stage.service'

export async function GET(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    return NextResponse.json(await listTicketStages(access.organizationId))
  } catch (error) {
    console.error('[ticket-stages] GET error:', error)
    return apiError('Falha ao buscar fases', 500, error)
  }
}

export async function POST(req: Request) {
  const access = await validatePermissionAccess(req, 'manage:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const body = await req.json()
    const parsed = createTicketStageSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await createTicketStage({
      organizationId: access.organizationId,
      name: parsed.data.name,
      color: parsed.data.color,
      order: parsed.data.order,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[ticket-stages] POST error:', error)
    return apiError('Falha ao criar fase', 500, error)
  }
}
