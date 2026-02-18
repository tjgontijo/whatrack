import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { hasPermission } from '@/lib/auth/rbac/roles'

const updateStageSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida').optional(),
  isDefault: z.boolean().optional(),
  isClosed: z.boolean().optional(),
})

// PUT /api/v1/ticket-stages/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ stageId: string }> },
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  if (!hasPermission(access.role, 'manage:tickets')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const organizationId = access.organizationId
  const { stageId } = await params

  try {
    const existing = await prisma.ticketStage.findFirst({ where: { id: stageId, organizationId } })
    if (!existing) {
      return NextResponse.json({ error: 'Fase não encontrada' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = updateStageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, color, isDefault, isClosed } = parsed.data

    // Check name uniqueness if changing
    if (name && name !== existing.name) {
      const conflict = await prisma.ticketStage.findFirst({ where: { organizationId, name } })
      if (conflict) {
        return NextResponse.json({ error: 'Já existe uma fase com esse nome' }, { status: 409 })
      }
    }

    // If setting as default, unset others
    if (isDefault) {
      await prisma.ticketStage.updateMany({
        where: { organizationId, id: { not: stageId } },
        data: { isDefault: false },
      })
    }

    const updated = await prisma.ticketStage.update({
      where: { id: stageId },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isClosed !== undefined && { isClosed }),
      },
      select: { id: true, name: true, color: true, order: true, isDefault: true, isClosed: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[ticket-stages/[stageId]] PUT error:', error)
    return NextResponse.json({ error: 'Falha ao atualizar fase' }, { status: 500 })
  }
}

// DELETE /api/v1/ticket-stages/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ stageId: string }> },
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  if (!hasPermission(access.role, 'manage:tickets')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const organizationId = access.organizationId
  const { stageId } = await params

  try {
    const stage = await prisma.ticketStage.findFirst({ where: { id: stageId, organizationId } })
    if (!stage) {
      return NextResponse.json({ error: 'Fase não encontrada' }, { status: 404 })
    }

    if (stage.isDefault) {
      return NextResponse.json({ error: 'Não é possível excluir a fase padrão' }, { status: 409 })
    }

    // Ensure there's at least one other stage
    const count = await prisma.ticketStage.count({ where: { organizationId } })
    if (count <= 1) {
      return NextResponse.json({ error: 'A organização deve ter ao menos uma fase' }, { status: 409 })
    }

    // Move tickets from deleted stage to default stage
    const defaultStage = await prisma.ticketStage.findFirst({
      where: { organizationId, isDefault: true },
    })

    if (defaultStage) {
      await prisma.ticket.updateMany({
        where: { stageId, organizationId },
        data: { stageId: defaultStage.id },
      })
    }

    await prisma.ticketStage.delete({ where: { id: stageId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ticket-stages/[stageId]] DELETE error:', error)
    return NextResponse.json({ error: 'Falha ao excluir fase' }, { status: 500 })
  }
}
