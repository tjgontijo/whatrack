import { prisma } from '@/lib/prisma';

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

  // Process each message
  for (const message of value.messages) {
    try {
      const fromPhone = message.from;
      const messageId = message.id;
      const timestamp = message.timestamp;

      if (!fromPhone) {
        console.warn('[MessageHandler] Message missing "from" field');
        continue;
      }

      // Find or create Lead
      let lead = await prisma.lead.findFirst({
        where: {
          organizationId: config.organizationId,
          phone: fromPhone,
        },
      });

      if (!lead) {
        lead = await prisma.lead.create({
          data: {
            organizationId: config.organizationId,
            phone: fromPhone,
            waId: message.from, // Meta's WAId format
          },
        });
        console.log(`[MessageHandler] Created new lead: ${lead.id}`);
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

      // Create Message record
      const createdMessage = await prisma.message.create({
        data: {
          wamid: messageId,
          leadId: lead.id,
          instanceId: config.id,
          direction: 'INBOUND',
          type: messageType,
          body: messageBody || null,
          status: 'delivered',
          timestamp: new Date(parseInt(timestamp) * 1000),
          conversationId: value.conversation_id || null,
        },
      });

      console.log(`[MessageHandler] Message saved: ${createdMessage.id}`);
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
