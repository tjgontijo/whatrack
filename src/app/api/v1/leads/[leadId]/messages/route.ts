import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import {
  leadMessagesResponseSchema,
  type LeadMessage,
  type LeadMessagesResponse,
} from '@/lib/schema/lead-messages'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'

const paramsSchema = z.object({
  leadId: z.string().uuid(),
})

const CONTACT_ROLE: LeadMessage['author']['role'] = 'lead'
const TEAM_ROLE: LeadMessage['author']['role'] = 'team'

export async function GET(req: Request, context: { params: Promise<{ leadId: string }> }) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const parse = paramsSchema.safeParse(await context.params)
    if (!parse.success) {
      return NextResponse.json({ error: 'leadId inválido' }, { status: 400 })
    }

    const { leadId } = parse.data
    const organizationId = access.organizationId

    const leadRecord = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    })

    if (!leadRecord) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    const messagesRecords = await prisma.whatsappMessage.findMany({
      where: { leadId, organizationId },
      orderBy: [{ sentAt: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        leadId: true,
        providerMessageId: true,
        messageType: true,
        contentText: true,
        sentAt: true,
        direction: true,
        remoteJid: true,
      },
    })

    const payload: LeadMessagesResponse = {
      lead: {
        id: leadRecord.id,
        name: leadRecord.name,
        phone: leadRecord.phone,
        createdAt: leadRecord.createdAt.toISOString(),
      },
      messages: messagesRecords.map((message) => ({
        id: message.id,
        message_id: message.providerMessageId,
        lead_id: message.leadId ?? '',
        type: message.messageType,
        body: message.contentText,
        raw_payload: null,
        sent_at: message.sentAt ? message.sentAt.toISOString() : null,
        author: {
          number: message.remoteJid ?? null,
          role: message.direction === 'INBOUND' ? CONTACT_ROLE : TEAM_ROLE,
        },
      })),
    }

    const validatedPayload = leadMessagesResponseSchema.parse(payload)

    return NextResponse.json(validatedPayload)
  } catch (error) {
    console.error('[api/leads/[leadId]/messages] GET error:', error)
    return NextResponse.json({ error: 'Não foi possível carregar as mensagens' }, { status: 500 })
  }
}
