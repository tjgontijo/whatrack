import { prisma } from '@/lib/prisma';
import { getDefaultTicketStage } from '@/services/tickets/ensure-ticket-stages';

const WINDOW_MS = 24 * 60 * 60 * 1000;

function resolveMessageTimestamp(rawTimestamp: string | number | undefined): Date {
  const parsed = Number.parseInt(String(rawTimestamp ?? ''), 10);
  if (Number.isFinite(parsed)) {
    return new Date(parsed * 1000);
  }
  return new Date();
}

function extractTrackingFromMessage(message: any) {
  const referral = message?.referral;
  if (!referral) return null;

  const tracking: Record<string, string> = {};

  if (referral.ctwa_clid) {
    tracking.ctwaclid = referral.ctwa_clid;
  }

  if (referral.source_url) {
    tracking.referrerUrl = referral.source_url;
    tracking.landingPage = referral.source_url;

    try {
      const url = new URL(referral.source_url);
      const params = url.searchParams;
      const utmSource = params.get('utm_source');
      const utmMedium = params.get('utm_medium');
      const utmCampaign = params.get('utm_campaign');
      const utmTerm = params.get('utm_term');
      const utmContent = params.get('utm_content');
      const gclid = params.get('gclid');
      const fbclid = params.get('fbclid');
      const ttclid = params.get('ttclid');
      const ctwaclid = params.get('ctwaclid') || params.get('ctwa_clid');

      if (utmSource) tracking.utmSource = utmSource;
      if (utmMedium) tracking.utmMedium = utmMedium;
      if (utmCampaign) tracking.utmCampaign = utmCampaign;
      if (utmTerm) tracking.utmTerm = utmTerm;
      if (utmContent) tracking.utmContent = utmContent;
      if (gclid) tracking.gclid = gclid;
      if (fbclid) tracking.fbclid = fbclid;
      if (ttclid) tracking.ttclid = ttclid;
      if (ctwaclid) tracking.ctwaclid = ctwaclid;
    } catch {
      // ignore invalid URLs
    }
  }

  if (Object.keys(tracking).length === 0) return null;

  const sourceType =
    referral.source_type === 'ad' ||
    tracking.ctwaclid ||
    tracking.gclid ||
    tracking.fbclid ||
    tracking.ttclid
      ? 'paid'
      : 'organic';

  return { ...tracking, sourceType };
}

/**
 * Message Handler
 * Handles incoming messages from WhatsApp
 *
 * Flow:
 * 1. Extract message data from webhook
 * 2. Find or create Lead
 * 3. Save Message record
 * 4. Update lastWebhookAt on config
 */

export async function messageHandler(payload: any): Promise<void> {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  if (!value?.messages || !Array.isArray(value.messages)) {
    console.warn('[MessageHandler] No messages found in payload');
    return;
  }

  const metadata = value.metadata;
  const phoneNumberId = metadata?.phone_number_id;

  if (!phoneNumberId) {
    throw new Error('Invalid payload: missing phone_number_id');
  }

  // Find WhatsAppConfig by phoneNumberId
  const config = await prisma.whatsAppConfig.findUnique({
    where: { phoneId: phoneNumberId },
    include: { organization: true },
  });

  if (!config) {
    throw new Error(`WhatsAppConfig not found for phoneId: ${phoneNumberId}`);
  }

  console.log(`[MessageHandler] Processing messages for phoneId: ${phoneNumberId}`);

  const defaultStage = await getDefaultTicketStage(prisma, config.organizationId);

  // Process each message
  for (const message of value.messages) {
    try {
      const fromPhone = message.from;
      const messageId = message.id;
      const messageTimestamp = resolveMessageTimestamp(message.timestamp);

      if (!fromPhone) {
        console.warn('[MessageHandler] Message missing "from" field');
        continue;
      }

      const existingMessage = await prisma.message.findUnique({
        where: { wamid: messageId },
      });

      if (existingMessage) {
        continue;
      }

      const contactProfile = value.contacts?.find((contact: any) => contact.wa_id === fromPhone);
      const pushName = contactProfile?.profile?.name;

      await prisma.$transaction(async (tx) => {
        // Find or create Lead
        let lead = await tx.lead.findFirst({
          where: {
            organizationId: config.organizationId,
            OR: [{ waId: fromPhone }, { phone: fromPhone }],
          },
        });

        const wasHistoryLead = lead?.source === 'history_sync'; // ✅ Track if lead from history

        if (!lead) {
          lead = await tx.lead.create({
            data: {
              organizationId: config.organizationId,
              phone: fromPhone,
              waId: fromPhone,
              pushName: pushName || undefined,
              lastMessageAt: messageTimestamp,
              source: 'live_message', // ✅ Mark as live message source
            },
          });
          console.log(`[MessageHandler] Created new lead: ${lead.id}`);
        } else {
          lead = await tx.lead.update({
            where: { id: lead.id },
            data: {
              phone: lead.phone ?? fromPhone,
              waId: lead.waId ?? fromPhone,
              pushName: pushName ?? lead.pushName ?? undefined,
              lastMessageAt: messageTimestamp,
              // Don't override source if already set
            },
          });
        }

        const conversation = await tx.conversation.upsert({
          where: {
            leadId_instanceId: {
              leadId: lead.id,
              instanceId: config.id,
            },
          },
          update: {
            metaConversationId: value.conversation_id ?? undefined,
          },
          create: {
            organizationId: config.organizationId,
            leadId: lead.id,
            instanceId: config.id,
            metaConversationId: value.conversation_id || null,
          },
        });

        let ticket = await tx.ticket.findFirst({
          where: { conversationId: conversation.id, status: 'open' },
          orderBy: { createdAt: 'desc' },
        });

        const isFirstMessage = !ticket || ticket.messagesCount === 0;

        // ⭐ CRITICAL: Conditional message window based on history origin
        const windowExpiresAt = wasHistoryLead
          ? null // ✅ No window for history leads
          : new Date(messageTimestamp.getTime() + WINDOW_MS); // ⏰ 24h for new contacts

        if (!ticket) {
          ticket = await tx.ticket.create({
            data: {
              organizationId: config.organizationId,
              leadId: lead.id, // ✅ Add leadId (required by schema)
              conversationId: conversation.id,
              stageId: defaultStage.id,
              windowExpiresAt,
              windowOpen: true,
              status: 'open',
              createdBy: 'SYSTEM',
              messagesCount: 0,
              // ✅ Source tracking
              source: 'incoming_message',
              originatedFrom: wasHistoryLead ? 'history_lead' : 'new_contact',
            },
          });
          console.log(
            `[MessageHandler] Created ticket: ${ticket.id} ` +
            `(windowExpiresAt: ${windowExpiresAt ?? 'null'}, originatedFrom: ${wasHistoryLead ? 'history' : 'new'})`
          );
        } else {
          await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              windowExpiresAt,
              windowOpen: true,
            },
          });
        }

        // Extract message content
        let messageBody = '';
        let messageType = message.type || 'text';

        if (message.text?.body) {
          messageBody = message.text.body;
        } else if (message.image?.caption) {
          messageBody = message.image.caption;
        } else if (message.document?.caption) {
          messageBody = message.document.caption;
        }

        const createdMessage = await tx.message.create({
          data: {
            wamid: messageId,
            leadId: lead.id,
            instanceId: config.id,
            conversationId: conversation.id,
            ticketId: ticket.id,
            direction: 'INBOUND',
            type: messageType,
            body: messageBody || null,
            status: 'delivered',
            timestamp: messageTimestamp,
            metaConversationId: value.conversation_id || null,
            // ✅ Source tracking
            source: 'live', // Live message (not history)
            rawMeta: message, // Store raw webhook payload
          },
        });

        await tx.conversation.update({
          where: { id: conversation.id },
          data: { messagesCount: { increment: 1 } },
        });

        await tx.ticket.update({
          where: { id: ticket.id },
          data: { messagesCount: { increment: 1 } },
        });

        if (isFirstMessage) {
          const trackingData = extractTrackingFromMessage(message);
          if (trackingData) {
            const existingTracking = await tx.ticketTracking.findUnique({
              where: { ticketId: ticket.id },
            });

            if (!existingTracking) {
              await tx.ticketTracking.create({
                data: {
                  ticketId: ticket.id,
                  ...trackingData,
                },
              });
            }
          }
        }

        console.log(`[MessageHandler] Message saved: ${createdMessage.id}`);
      });
    } catch (error) {
      console.error('[MessageHandler] Error processing message', error);
      throw error;
    }
  }

  // Update lastWebhookAt on config
  await prisma.whatsAppConfig.update({
    where: { id: config.id },
    data: { lastWebhookAt: new Date() },
  });

  console.log(`[MessageHandler] Processed ${value.messages.length} messages`);
}
