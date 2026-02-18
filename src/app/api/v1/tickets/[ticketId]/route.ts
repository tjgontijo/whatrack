import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { hasPermission } from '@/lib/auth/rbac/roles'
import { updateTicketSchema } from '@/lib/validations/ticket-schemas'
import { metaCapiService } from '@/services/meta-ads/capi.service'

function getCapiEventForStage(stageName: string): 'LeadSubmitted' | 'Purchase' | null {
  const name = stageName.toLowerCase();
  // Qualified stages
  if (name.includes('qualificado') || name.includes('qualified')) return 'LeadSubmitted';
  // Winning stages
  if (name.includes('venda') || name.includes('pago') || name.includes('ganho') || name.includes('won')) return 'Purchase';
  return null;
}

// GET /api/v1/tickets/:id - Get ticket details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  if (!hasPermission(access.role, 'view:tickets')) {
    return NextResponse.json(
      { error: 'Sem permissão para visualizar tickets' },
      { status: 403 },
    )
  }

  const organizationId = access.organizationId
  const { ticketId } = await params

  try {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId,
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
                profilePicUrl: true,
                waId: true,
              },
            },
          },
        },
        stage: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
            isClosed: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        tracking: {
          select: {
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
            sourceType: true,
            ctwaclid: true,
            referrerUrl: true,
            landingPage: true,
          },
        },
        messages: {
          select: {
            id: true,
            body: true,
            type: true,
            direction: true,
            timestamp: true,
          },
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
        sales: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            messages: true,
            sales: true,
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })
    }

    // Format response
    const response = {
      id: ticket.id,
      lead: ticket.conversation.lead,
      stage: ticket.stage,
      assignee: ticket.assignee,
      tracking: ticket.tracking || null,
      status: ticket.status,
      windowOpen: ticket.windowOpen,
      windowExpiresAt: ticket.windowExpiresAt?.toISOString() || null,
      dealValue: ticket.dealValue ? Number(ticket.dealValue) : null,
      closedAt: ticket.closedAt?.toISOString() || null,
      closedReason: ticket.closedReason,
      messagesCount: ticket._count.messages,
      salesCount: ticket._count.sales,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      recentMessages: ticket.messages.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp.toISOString(),
      })),
      sales: ticket.sales.map((sale) => ({
        ...sale,
        totalAmount: sale.totalAmount ? Number(sale.totalAmount) : null,
        createdAt: sale.createdAt.toISOString(),
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[api/tickets/[ticketId]] GET error:', error)
    return NextResponse.json(
      { error: 'Falha ao buscar ticket', details: String(error) },
      { status: 500 },
    )
  }
}

// PATCH /api/v1/tickets/:id - Update ticket
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  if (!hasPermission(access.role, 'manage:tickets')) {
    return NextResponse.json(
      { error: 'Sem permissão para atualizar tickets' },
      { status: 403 },
    )
  }

  const organizationId = access.organizationId
  const { ticketId } = await params

  try {
    const body = await req.json()
    const parsed = updateTicketSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const { stageId, assigneeId, dealValue } = parsed.data

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

    // Prevent updates on closed tickets
    if (existing.status !== 'open') {
      return NextResponse.json(
        { error: 'Ticket já está fechado' },
        { status: 409 },
      )
    }

    // Validate stage if provided
    if (stageId) {
      const stage = await prisma.ticketStage.findFirst({
        where: { id: stageId, organizationId },
      })
      if (!stage) {
        return NextResponse.json(
          { error: 'Estágio não encontrado' },
          { status: 404 },
        )
      }
    }

    // Validate assignee if provided
    if (assigneeId !== undefined && assigneeId !== null) {
      const assignee = await prisma.member.findFirst({
        where: {
          userId: assigneeId,
          organizationId,
        },
      })
      if (!assignee) {
        return NextResponse.json(
          { error: 'Atribuído não encontrado' },
          { status: 404 },
        )
      }
    }

    // Update ticket using transaction
    const updated = await prisma.$transaction(async (tx) => {
      return tx.ticket.update({
        where: { id: ticketId },
        data: {
          ...(stageId && { stageId }),
          ...(assigneeId !== undefined && { assigneeId }),
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
        },
      })
    })

    // Format response
    const response = {
      id: updated.id,
      lead: updated.conversation.lead,
      stage: updated.stage,
      assignee: updated.assignee,
      tracking: updated.tracking,
      status: updated.status,
      windowOpen: updated.windowOpen,
      windowExpiresAt: updated.windowExpiresAt?.toISOString() || null,
      dealValue: updated.dealValue ? Number(updated.dealValue) : null,
      messagesCount: updated.messagesCount,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }

    // 🟢 CAPI Trigger: If stage changed, check if we should send a conversion
    if (stageId && stageId !== existing.stageId) {
      const eventName = getCapiEventForStage(updated.stage.name);
      if (eventName) {
        metaCapiService.sendEvent(ticketId, eventName, {
          eventId: `${eventName.toLowerCase()}-${ticketId}`,
          value: updated.dealValue ? Number(updated.dealValue) : undefined,
        }).catch(err => console.error(`[CAPI] Fire-and-forget failed for ticket ${ticketId}`, err));
      }
    }

    // Revalidate cache
    await revalidateTag(`org-${organizationId}`, 'max')

    return NextResponse.json(response)
  } catch (error) {
    console.error('[api/tickets/[ticketId]] PATCH error:', error)
    return NextResponse.json(
      { error: 'Falha ao atualizar ticket', details: String(error) },
      { status: 500 },
    )
  }
}
