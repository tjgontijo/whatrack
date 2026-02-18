import { prisma } from '@/lib/prisma';
import { getDefaultTicketStage } from '@/services/tickets/ensure-ticket-stages';
import { publishToCentrifugo } from '@/lib/centrifugo/server';

const WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_EXPIRATION_DAYS = 30;

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

  // Meta Ads Specific Fields
  if (referral.source_id) tracking.metaAdId = referral.source_id;
  if (referral.source_type) tracking.metaSourceType = referral.source_type;
  if (referral.media_type) tracking.metaPlacement = referral.media_type;

  if (referral.source_url) {
    tracking.referrerUrl = referral.source_url;
    tracking.landingPage = referral.source_url;

    try {
      const url = new URL(referral.source_url);
      const params = url.searchParams;

      const utmFields = ['source', 'medium', 'campaign', 'term', 'content'];
      utmFields.forEach(field => {
        const val = params.get(`utm_${field}`);
        if (val) tracking[`utm${field.charAt(0).toUpperCase() + field.slice(1)}`] = val;
      });

      const otherFields = ['gclid', 'fbclid', 'ttclid'];
      otherFields.forEach(field => {
        const val = params.get(field);
        if (val) tracking[field] = val;
      });

      const ctwaclid = params.get('ctwaclid') || params.get('ctwa_clid');
      if (ctwaclid) tracking.ctwaclid = ctwaclid;

    } catch {
      // ignore invalid URLs
    }
  }

  if (Object.keys(tracking).length === 0) return null;

  const sourceType =
    referral.source_type === 'ad' ||
      tracking.ctwaclid ||
      tracking.metaAdId ||
      tracking.gclid ||
      tracking.fbclid ||
      tracking.ttclid
      ? 'paid'
      : 'organic';

  return { ...tracking, sourceType };
}

interface MessageHandlerOptions {
  isEcho?: boolean;
}

export async function messageHandler(payload: any, options: MessageHandlerOptions = {}): Promise<void> {
  const { isEcho = false } = options;
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  const messagesArray = isEcho ? value?.message_echoes : value?.messages;

  if (!messagesArray || !Array.isArray(messagesArray)) {
    console.warn(`[MessageHandler] No ${isEcho ? 'message_echoes' : 'messages'} found in payload`);
    return;
  }

  const metadata = value.metadata;
  const phoneNumberId = metadata?.phone_number_id;

  if (!phoneNumberId) {
    throw new Error('Invalid payload: missing phone_number_id');
  }

  // Find Config + Organization Profile (for expiration rules)
  const config = await prisma.whatsAppConfig.findUnique({
    where: { phoneId: phoneNumberId },
    include: {
      organization: {
        include: { profile: true }
      }
    },
  });

  if (!config) {
    throw new Error(`WhatsAppConfig not found for phoneId: ${phoneNumberId}`);
  }

  console.log(`[MessageHandler] Processing for Organization: ${config.organizationId}`);

  const defaultStage = await getDefaultTicketStage(prisma, config.organizationId);
  const expirationDays = config.organization.profile?.ticketExpirationDays || DEFAULT_EXPIRATION_DAYS;

  // Collect events
  const eventsToPublish: any[] = [];
  let successCount = 0;

  for (const message of messagesArray) {
    try {
      const contactPhone = isEcho ? message.to : message.from;
      const messageId = message.id;
      const messageTimestamp = resolveMessageTimestamp(message.timestamp);

      if (!contactPhone) continue;

      const existingMessage = await prisma.message.findUnique({ where: { wamid: messageId } });
      if (existingMessage) continue;

      const contactProfile = value.contacts?.find((contact: any) => contact.wa_id === contactPhone);
      const pushName = contactProfile?.profile?.name;

      // START TRANSACTION
      // ----------------------------------------------------------------------
      await prisma.$transaction(async (tx) => {
        // 1. Find/Create Lead
        let lead = await tx.lead.findFirst({
          where: {
            organizationId: config.organizationId,
            OR: [{ waId: contactPhone }, { phone: contactPhone }],
          },
        });

        const wasHistoryLead = lead?.source === 'history_sync';

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
        } else {
          lead = await tx.lead.update({
            where: { id: lead.id },
            data: {
              lastMessageAt: messageTimestamp,
              pushName: pushName ?? lead.pushName ?? undefined,
            },
          });
        }

        // 2. Conversation
        const conversation = await tx.conversation.upsert({
          where: {
            leadId_instanceId: { leadId: lead.id, instanceId: config.id },
          },
          update: { metaConversationId: value.conversation_id ?? undefined },
          create: {
            organizationId: config.organizationId,
            leadId: lead.id,
            instanceId: config.id,
            metaConversationId: value.conversation_id || null,
          },
        });

        // 3. Ticket Management (Expiry & Last-Touch)
        let ticket = await tx.ticket.findFirst({
          where: { conversationId: conversation.id, status: 'open' },
          orderBy: { createdAt: 'desc' },
        });

        // Check Expiration
        if (ticket) {
          const daysSinceCreation = (messageTimestamp.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60 * 24);

          // Only expire if it's an INBOUND message that would restart the conversation flow
          // If it's just an echo, we usually keep the ticket open unless specific rules apply
          if (!isEcho && daysSinceCreation > expirationDays) {
            console.log(`[MessageHandler] Ticket ${ticket.id} expired (${daysSinceCreation.toFixed(1)} days). Closing.`);

            await tx.ticket.update({
              where: { id: ticket.id },
              data: {
                status: 'closed',
                closedReason: 'expired_attribution',
                closedAt: messageTimestamp
              }
            });
            ticket = null; // Force create new ticket
          }
        }

        const isNewTicket = !ticket;
        const windowExpiresAt = wasHistoryLead ? null : new Date(messageTimestamp.getTime() + WINDOW_MS);

        if (!ticket) {
          ticket = await tx.ticket.create({
            data: {
              organizationId: config.organizationId,
              leadId: lead.id,
              conversationId: conversation.id,
              stageId: defaultStage.id,
              windowExpiresAt,
              windowOpen: true,
              status: 'open',
              createdBy: 'SYSTEM',
              messagesCount: 0,
              source: 'incoming_message',
              originatedFrom: wasHistoryLead ? 'history_lead' : 'new_contact',
            },
          });
        } else {
          // Renew window
          if (!isEcho) {
            await tx.ticket.update({
              where: { id: ticket.id },
              data: { windowExpiresAt, windowOpen: true },
            });
          }
        }

        // 4. Message Creation
        let messageBody = '';
        const messageType = message.type || 'text';
        if (message.text?.body) messageBody = message.text.body;
        else if (message.image?.caption) messageBody = message.image.caption;
        else if (message.document?.caption) messageBody = message.document.caption;

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

        // Update counts
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { messagesCount: { increment: 1 } },
        });
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { messagesCount: { increment: 1 } },
        });

        // 5. Attribution Logic (Last-Touch)
        if (!isEcho) {
          const trackingData = extractTrackingFromMessage(message) as any;
          if (trackingData) {
            const existingTracking = await tx.ticketTracking.findUnique({
              where: { ticketId: ticket.id },
            });

            if (!existingTracking) {
              // New Tracking
              await tx.ticketTracking.create({
                data: {
                  ticketId: ticket.id,
                  ...trackingData,
                  // Initialize Enrichment Status if ad is present
                  metaEnrichmentStatus: trackingData.metaAdId ? 'PENDING' : 'PENDING'
                },
              });

              // Trigger Enrichment (Queue)
              // if (trackingData.metaAdId) addToEnrichmentQueue(ticket.id);

            } else {
              // Update Existing Tracking (Last-Touch)
              const hasNewAd = trackingData.metaAdId && trackingData.metaAdId !== existingTracking.metaAdId;

              if (hasNewAd) {
                // Log History
                await tx.metaAttributionHistory.create({
                  data: {
                    ticketId: ticket.id,
                    oldAdId: existingTracking.metaAdId,
                    newAdId: trackingData.metaAdId,
                  }
                });
              }

              // Update fields
              await tx.ticketTracking.update({
                where: { ticketId: ticket.id },
                data: {
                  ...trackingData,
                  // Reset enrichment if ad changed
                  metaEnrichmentStatus: hasNewAd ? 'PENDING' : existingTracking.metaEnrichmentStatus,
                  metaEnrichmentError: hasNewAd ? null : existingTracking.metaEnrichmentError
                }
              });
            }
          }
        }

        // Collect event
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
      });
      // END TRANSACTION
      // ----------------------------------------------------------------------

    } catch (error) {
      console.error('[MessageHandler] Error processing message', error);
      // Continue to next message if one fails
    }
  }

  // Update lastWebhookAt
  await prisma.whatsAppConfig.update({
    where: { id: config.id },
    data: { lastWebhookAt: new Date() },
  });

  console.log(`[MessageHandler] Processed ${successCount}/${messagesArray.length} messages`);

  // Publish events
  for (const event of eventsToPublish) {
    publishToCentrifugo(event.channel, event.data).catch(err =>
      console.error('[MessageHandler] Centrifugo publish failed', err)
    );
  }
}
