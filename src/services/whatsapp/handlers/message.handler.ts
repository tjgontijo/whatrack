import { prisma } from '@/lib/prisma';
import { getDefaultTicketStage } from '@/services/tickets/ensure-ticket-stages';
import { publishToCentrifugo } from '@/lib/centrifugo/server';

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

interface MessageHandlerOptions {
  isEcho?: boolean; // True for smb_message_echoes (outbound from mobile)
}

/**
 * Message Handler
 * Handles incoming messages from WhatsApp and outbound echoes from mobile app
 *
 * Flow:
 * 1. Extract message data from webhook
 * 2. Find or create Lead
 * 3. Save Message record
 * 4. Update lastWebhookAt on config
 */

export async function messageHandler(payload: any, options: MessageHandlerOptions = {}): Promise<void> {
  const { isEcho = false } = options;
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  // For echo messages, the array is called "message_echoes" not "messages"
  const messagesArray = isEcho ? value?.message_echoes : value?.messages;

  if (!messagesArray || !Array.isArray(messagesArray)) {
    console.warn(`[MessageHandler] No ${isEcho ? 'message_echoes' : 'messages'} found in payload`);
    return;
  }

  console.log(`[MessageHandler] Processing ${messagesArray.length} ${isEcho ? 'echo' : 'inbound'} messages`);

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
  console.log(`[MessageHandler] Organization: ${config.organizationId}`);

  const defaultStage = await getDefaultTicketStage(prisma, config.organizationId);

  // Collect events to publish after transaction commits
  const eventsToPublish: any[] = [];
  let successCount = 0;

  // Process each message
  for (const message of messagesArray) {
    try {
      // For echoes: "from" is our number, "to" is the contact
      // For inbound: "from" is the contact
      const contactPhone = isEcho ? message.to : message.from;
      const messageId = message.id;
      const messageTimestamp = resolveMessageTimestamp(message.timestamp);

      if (!contactPhone) {
        console.warn(`[MessageHandler] Message missing "${isEcho ? 'to' : 'from'}" field`);
        continue;
      }

      const existingMessage = await prisma.message.findUnique({
        where: { wamid: messageId },
      });

      if (existingMessage) {
        continue;
      }

      const contactProfile = value.contacts?.find((contact: any) => contact.wa_id === contactPhone);
      const pushName = contactProfile?.profile?.name;

      await prisma.$transaction(async (tx) => {
        // Find or create Lead
        let lead = await tx.lead.findFirst({
          where: {
            organizationId: config.organizationId,
            OR: [{ waId: contactPhone }, { phone: contactPhone }],
          },
        });

        const wasHistoryLead = lead?.source === 'history_sync'; // ✅ Track if lead from history

        if (!lead) {
          lead = await tx.lead.create({
            data: {
              organizationId: config.organizationId,
              phone: contactPhone,
              waId: contactPhone,
              pushName: pushName || undefined,
              lastMessageAt: messageTimestamp,
              source: isEcho ? 'outbound_message' : 'live_message',
            },
          });
          console.log(`[MessageHandler] Created new lead: ${lead.id}`);
        } else {
          lead = await tx.lead.update({
            where: { id: lead.id },
            data: {
              phone: lead.phone ?? contactPhone,
              waId: lead.waId ?? contactPhone,
              pushName: pushName ?? lead.pushName ?? undefined,
              lastMessageAt: messageTimestamp,
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
          // Only renew window if this is an INBOUND message (from lead)
          // OUTBOUND messages (agent responses) should NOT reset the window
          if (!isEcho) {
            await tx.ticket.update({
              where: { id: ticket.id },
              data: {
                windowExpiresAt,
                windowOpen: true,
              },
            });
          }
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

        const direction = isEcho ? 'OUTBOUND' : 'INBOUND';

        const createdMessage = await tx.message.create({
          data: {
            wamid: messageId,
            leadId: lead.id,
            instanceId: config.id,
            conversationId: conversation.id,
            ticketId: ticket.id,
            direction,
            type: messageType,
            body: messageBody || null,
            status: isEcho ? 'sent' : 'delivered',
            timestamp: messageTimestamp,
            metaConversationId: value.conversation_id || null,
            source: 'live',
            rawMeta: message,
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

        // Collect event to publish after transaction commits
        eventsToPublish.push({
          channel: `org:${config.organizationId}:messages`,
          data: {
            type: 'message_created',
            conversationId: conversation.id,
            messageId: createdMessage.id,
            leadId: lead.id,
            body: messageBody,
            timestamp: messageTimestamp,
            direction,
          }
        });

        successCount++;
        console.log(
          `[MessageHandler] ✓ Transaction complete for message ${createdMessage.id} ` +
          `(lead: ${lead.id}, conversation: ${conversation.id}, ticket: ${ticket.id})`
        );
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

  console.log(
    `[MessageHandler] Processed ${messagesArray.length} ${isEcho ? 'echo' : 'inbound'} messages ` +
    `(${successCount} successful, ${messagesArray.length - successCount} skipped)`
  );

  // Publish all collected events to Centrifugo (after transaction commits)
  console.log(`[MessageHandler] Publishing ${eventsToPublish.length} events to Centrifugo`);
  for (const event of eventsToPublish) {
    try {
      const success = await publishToCentrifugo(event.channel, event.data);
      if (success) {
        console.log(`[MessageHandler] ✓ Published to Centrifugo: ${event.channel}`);
      } else {
        console.warn(`[MessageHandler] ⚠ Failed to publish to Centrifugo: ${event.channel}`);
      }
    } catch (error) {
      console.error('[MessageHandler] ✗ Error publishing to Centrifugo', error);
      // Don't throw - continue even if Centrifugo fails
    }
  }
}
