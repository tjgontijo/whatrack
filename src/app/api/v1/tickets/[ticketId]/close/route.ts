import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { hasPermission } from '@/lib/auth/rbac/roles'
import { closeTicketSchema } from '@/lib/validations/ticket-schemas'

// POST /api/v1/tickets/:id/close - Close ticket (won/lost)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  if (!hasPermission(access.role, 'manage:tickets')) {
    return NextResponse.json(
      { error: 'Sem permissão para fechar tickets' },
      { status: 403 },
    )
  }

  const organizationId = access.organizationId
  const { ticketId } = await params

  try {
    const body = await req.json()
    const parsed = closeTicketSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const { reason, closedReason, dealValue } = parsed.data

    // Verify ticket exists and belongs to organization
    const existing = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })
    }

    // Prevent closing already closed tickets
    if (existing.status !== 'open') {
      return NextResponse.json(
        {
          error: 'Ticket já está fechado',
          currentStatus: existing.status,
        },
        { status: 409 },
      )
    }

    const newStatus = reason === 'won' ? 'closed_won' : 'closed_lost'

    // Close ticket using transaction
    const closed = await prisma.$transaction(async (tx) => {
      return tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: newStatus,
          closedAt: new Date(),
          closedReason,
          ...(dealValue !== undefined && { dealValue }),
        },
        include: {
          conversation: {
            include: {
              lead: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  pushName: true,
                },
              },
            },
          },
          stage: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
            },
          },
          tracking: true,
          _count: {
            select: {
              sales: true,
            },
          },
        },
      })
    })

    // Format response
    const response = {
      id: closed.id,
      lead: closed.conversation.lead,
      stage: closed.stage,
      assignee: closed.assignee,
      tracking: closed.tracking,
      status: closed.status,
      windowOpen: closed.windowOpen,
      windowExpiresAt: closed.windowExpiresAt?.toISOString() || null,
      dealValue: closed.dealValue ? Number(closed.dealValue) : null,
      closedAt: closed.closedAt?.toISOString() || null,
      closedReason: closed.closedReason,
      messagesCount: closed.messagesCount,
      salesCount: closed._count.sales,
      createdAt: closed.createdAt.toISOString(),
      updatedAt: closed.updatedAt.toISOString(),
    }

    // Revalidate cache
    revalidateTag(`org-${organizationId}`)

    return NextResponse.json(response)
  } catch (error) {
    console.error('[api/tickets/[ticketId]/close] POST error:', error)
    return NextResponse.json(
      { error: 'Falha ao fechar ticket', details: String(error) },
      { status: 500 },
    )
  }
}
