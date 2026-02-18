import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { hasPermission } from '@/lib/auth/rbac/roles'

const createStageSchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida (use formato hex #RRGGBB)'),
  order: z.number().int().nonnegative().optional(),
})

// GET /api/v1/ticket-stages — list stages for org (order ASC)
export async function GET(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const stages = await prisma.ticketStage.findMany({
      where: { organizationId: access.organizationId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        order: true,
        isDefault: true,
        isClosed: true,
        _count: { select: { tickets: true } },
      },
    })

    return NextResponse.json({
      items: stages.map((s) => ({ ...s, ticketsCount: s._count.tickets })),
    })
  } catch (error) {
    console.error('[ticket-stages] GET error:', error)
    return NextResponse.json({ error: 'Falha ao buscar fases' }, { status: 500 })
  }
}

// POST /api/v1/ticket-stages — create stage
export async function POST(req: Request) {
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
    const parsed = createStageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, color, order: providedOrder } = parsed.data

    // Check name uniqueness
    const existing = await prisma.ticketStage.findFirst({ where: { organizationId, name } })
    if (existing) {
      return NextResponse.json({ error: 'Já existe uma fase com esse nome' }, { status: 409 })
    }

    // Calculate order if not provided
    let order = providedOrder
    if (order === undefined) {
      const maxOrder = await prisma.ticketStage.aggregate({
        where: { organizationId },
        _max: { order: true },
      })
      order = (maxOrder._max.order ?? -1) + 1
    }

    const stage = await prisma.ticketStage.create({
      data: { organizationId, name, color, order },
      select: { id: true, name: true, color: true, order: true, isDefault: true, isClosed: true },
    })

    return NextResponse.json(stage, { status: 201 })
  } catch (error) {
    console.error('[ticket-stages] POST error:', error)
    return NextResponse.json({ error: 'Falha ao criar fase' }, { status: 500 })
  }
}
