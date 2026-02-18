import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { hasPermission } from '@/lib/auth/rbac/roles'

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
})

// PUT /api/v1/ticket-stages/reorder
export async function PUT(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  if (!hasPermission(access.role, 'manage:tickets')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const organizationId = access.organizationId

  try {
    const body = await req.json()
    const parsed = reorderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { orderedIds } = parsed.data

    // Verify all stages belong to the org
    const stages = await prisma.ticketStage.findMany({
      where: { organizationId, id: { in: orderedIds } },
      select: { id: true },
    })

    if (stages.length !== orderedIds.length) {
      return NextResponse.json({ error: 'Algumas fases não foram encontradas' }, { status: 404 })
    }

    // Update orders in a transaction
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.ticketStage.update({
          where: { id },
          data: { order: index },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ticket-stages/reorder] PUT error:', error)
    return NextResponse.json({ error: 'Falha ao reordenar fases' }, { status: 500 })
  }
}
