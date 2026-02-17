import { prisma } from '@/lib/prisma';
import { publishToCentrifugo } from '@/lib/centrifugo/server';

/**
 * Status Handler
 * Handles message status updates from WhatsApp (sent, delivered, read, failed)
 *
 * Flow:
 * 1. Extract status data from webhook
 * 2. Find message by wamid
 * 3. Update message status
 * 4. Publish real-time event to Centrifugo
 */

export async function statusHandler(payload: any): Promise<void> {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  if (!value?.statuses || !Array.isArray(value.statuses)) {
    console.warn('[StatusHandler] No statuses found in payload');
    return;
  }

  const metadata = value.metadata;
  const phoneNumberId = metadata?.phone_number_id;

  if (!phoneNumberId) {
    console.warn('[StatusHandler] Missing phone_number_id');
    return;
  }

  // Find WhatsAppConfig to get organizationId
  const config = await prisma.whatsAppConfig.findUnique({
    where: { phoneId: phoneNumberId },
  });

  if (!config) {
    console.warn(`[StatusHandler] Config not found for phoneId: ${phoneNumberId}`);
    return;
  }

  console.log(`[StatusHandler] Processing ${value.statuses.length} status updates`);

  for (const status of value.statuses) {
    try {
      const wamid = status.id;
      const newStatus = status.status; // sent, delivered, read, failed
      const timestamp = status.timestamp;

      if (!wamid || !newStatus) {
        console.warn('[StatusHandler] Status missing id or status field');
        continue;
      }

      // Find message by wamid
      const message = await prisma.message.findUnique({
        where: { wamid },
        include: { conversation: true },
      });

      if (!message) {
        // Message not found - could be a message we didn't track
        console.log(`[StatusHandler] Message not found: ${wamid}`);
        continue;
      }

      // Only update if new status is "better" than current
      const statusPriority: Record<string, number> = {
        pending: 0,
        sent: 1,
        delivered: 2,
        read: 3,
        failed: -1,
      };

      const currentPriority = statusPriority[message.status] ?? 0;
      const newPriority = statusPriority[newStatus] ?? 0;

      // Always update if failed, or if new status is better
      if (newStatus !== 'failed' && newPriority <= currentPriority) {
        console.log(`[StatusHandler] Skipping ${wamid}: ${message.status} -> ${newStatus} (not an upgrade)`);
        continue;
      }

      // Update message status
      await prisma.message.update({
        where: { id: message.id },
        data: { status: newStatus },
      });

      console.log(`[StatusHandler] Updated ${wamid}: ${message.status} -> ${newStatus}`);

      // Publish real-time event
      await publishToCentrifugo(`org:${config.organizationId}:messages`, {
        type: 'message_status_updated',
        messageId: message.id,
        wamid,
        conversationId: message.conversationId,
        status: newStatus,
        timestamp,
      });

      console.log(`[StatusHandler] ✓ Published status update for ${wamid}`);
    } catch (error) {
      console.error('[StatusHandler] Error processing status', error);
      // Continue with next status
    }
  }
}
