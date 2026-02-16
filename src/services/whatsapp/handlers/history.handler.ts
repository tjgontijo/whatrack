import { prisma } from '@/lib/prisma';

/**
 * History Handler - PRD: WhatsApp History Sync
 * Handles history webhooks from Meta (coexistence mode)
 *
 * CRITICAL:
 * - Creates/updates Leads with source='history_sync'
 * - Creates Messages with source='history'
 * - ❌ NEVER creates Tickets
 * - Idempotency via wamid
 *
 * Flow:
 * 1. Extract history chunks from webhook
 * 2. Find or create Lead (source='history_sync')
 * 3. Find or create Conversation
 * 4. Upsert Message records (source='history')
 * 5. Create WhatsAppHistorySync log entry
 * 6. Update progress in WhatsAppConfig
 */

function resolveMessageTimestamp(rawTimestamp: string | number | undefined): Date {
  const parsed = Number.parseInt(String(rawTimestamp ?? ''), 10);
  if (Number.isFinite(parsed)) {
    return new Date(parsed * 1000);
  }
  return new Date();
}

export async function historyHandler(payload: any): Promise<void> {
  const metadata = payload.metadata;
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

  console.log('[HistoryHandler] Processing history webhook');

  const historyData = payload.history || [];
  if (!Array.isArray(historyData) || historyData.length === 0) {
    console.warn('[HistoryHandler] No history data found in payload');
    return;
  }

  // Get metadata from first chunk
  const firstChunk = historyData[0];
  const chunkMetadata = firstChunk?.metadata || {};
  const phase = chunkMetadata.phase;
  const chunkOrder = chunkMetadata.chunk_order;
  const progress = chunkMetadata.progress || 0;

  console.log(`[HistoryHandler] Phase: ${phase}, Chunk: ${chunkOrder}, Progress: ${progress}%`);

  // Create sync log entry
  const syncLog = await prisma.whatsAppHistorySync.create({
    data: {
      id: `${config.id}-${phase}-${chunkOrder}`,
      connectionId: config.id,
      status: 'processing',
      phase,
      chunkOrder,
      progress,
      lastPayloadAt: new Date(),
    },
  });

  let totalMessagesImported = 0;
  let totalThreadsProcessed = 0;

  // Process each thread (conversation)
  const threads = firstChunk?.threads || [];

  for (const thread of threads) {
    try {
      const waId = thread.context?.wa_id;
      const username = thread.context?.username;

      if (!waId) {
        console.warn('[HistoryHandler] Thread missing wa_id');
        continue;
      }

      // Normalize phone number
      const normalizedPhone = waId.startsWith('+') ? waId : `+${waId}`;

      // 1. UPSERT Lead with source='history_sync'
      const lead = await prisma.lead.upsert({
        where: {
          organizationId_waId: {
            organizationId: config.organizationId,
            waId,
          },
        },
        create: {
          organizationId: config.organizationId,
          waId,
          phone: normalizedPhone,
          pushName: username,
          source: 'history_sync', // ✅ Mark as history source
          lastSyncedAt: new Date(),
        },
        update: {
          lastSyncedAt: new Date(),
          // Don't override source if already set
          pushName: username ?? undefined,
        },
      });

      // 2. UPSERT Conversation
      const conversation = await prisma.conversation.upsert({
        where: {
          leadId_instanceId: {
            leadId: lead.id,
            instanceId: config.id,
          },
        },
        create: {
          organizationId: config.organizationId,
          leadId: lead.id,
          instanceId: config.id,
        },
        update: {
          updatedAt: new Date(),
        },
      });

      // 3. UPSERT Messages with source='history'
      const messages = thread.messages || [];

      for (const msg of messages) {
        try {
          const messageTimestamp = resolveMessageTimestamp(msg.timestamp);
          const fromPhone = msg.from;
          const messageId = msg.id;

          if (!messageId || !fromPhone) {
            console.warn('[HistoryHandler] Message missing id or from');
            continue;
          }

          // Determine direction based on history_context
          const fromMe = msg.history_context?.from_me || false;
          const direction = fromMe ? 'OUTBOUND' : 'INBOUND';

          // Extract message content
          let messageBody = '';
          let messageType = msg.type || 'text';

          if (msg.text?.body) {
            messageBody = msg.text.body;
          }

          // UPSERT with idempotency
          const createdMessage = await prisma.message.upsert({
            where: { wamid: messageId },
            create: {
              wamid: messageId,
              leadId: lead.id,
              instanceId: config.id,
              conversationId: conversation.id,
              ticketId: null, // ❌ NO TICKET FOR HISTORY
              direction,
              type: messageType,
              body: messageBody || null,
              status: msg.history_context?.status || 'read',
              timestamp: messageTimestamp,
              source: 'history', // ✅ Mark as history source
              rawMeta: msg, // Store raw payload
            },
            update: {
              // On duplicate, update minimal fields
              status: msg.history_context?.status || 'read',
              updatedAt: new Date(),
            },
          });

          totalMessagesImported++;
          console.log(`[HistoryHandler] Message upserted: ${createdMessage.id}`);
        } catch (msgError) {
          console.error('[HistoryHandler] Error importing message', msgError);
          // Continue with next message instead of failing
        }
      }

      totalThreadsProcessed++;
      console.log(`[HistoryHandler] Thread processed: ${thread.id}, ${messages.length} messages`);
    } catch (threadError) {
      console.error('[HistoryHandler] Error processing thread', threadError);
      // Continue with next thread instead of failing
    }
  }

  // 4. Update sync log as completed
  await prisma.whatsAppHistorySync.update({
    where: { id: syncLog.id },
    data: {
      status: 'completed',
      lastPayloadAt: new Date(),
    },
  });

  // 5. Update WhatsAppConfig with progress
  await prisma.whatsAppConfig.update({
    where: { id: config.id },
    data: {
      historySyncProgress: progress,
      historySyncPhase: phase,
      historySyncChunkOrder: chunkOrder,
      // If final chunk (progress=100), mark as completed
      ...(progress === 100 && {
        historySyncStatus: 'completed',
        historySyncCompletedAt: new Date(),
      }),
      // Otherwise mark as syncing
      ...(progress < 100 && {
        historySyncStatus: 'syncing',
        historySyncStartedAt: config.historySyncStartedAt ?? new Date(),
      }),
      lastWebhookAt: new Date(),
    },
  });

  console.log(
    `[HistoryHandler] Completed: ${totalThreadsProcessed} threads, ` +
    `${totalMessagesImported} messages imported, progress: ${progress}%`
  );
}
