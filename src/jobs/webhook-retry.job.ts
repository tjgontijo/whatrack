import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/whatsapp/webhook-signature';
import { WebhookProcessor } from '@/services/whatsapp/webhook-processor';
import { WhatsAppChatService } from '@/services/whatsapp-chat.service';

/**
 * Webhook Retry Job (DLQ)
 *
 * Runs every 5 minutes to retry failed webhooks
 * 1. Find unprocessed webhooks in whatsapp_webhook_logs
 * 2. For each webhook:
 *    - Verify signature is valid
 *    - Retry processing with WebhookProcessor
 *    - Increment retryCount
 *    - Mark as processed if success
 * 3. Stop after 3 attempts per webhook
 * 4. Log failures for monitoring
 *
 * Backoff: Exponential (5min, 10min, 15min)
 */

export async function webhookRetryJob(job: any): Promise<void> {
  console.log('[WebhookRetryJob] Starting webhook retry processing');

  try {
    // Find all unprocessed webhooks that haven't exceeded max retries
    const failedWebhooks = await prisma.whatsAppWebhookLog.findMany({
      where: {
        processed: false,
        retryCount: { lt: 3 },
        signatureValid: true, // Only retry valid signatures
      },
      orderBy: { createdAt: 'asc' },
      take: 50, // Process max 50 per job
    });

    console.log(`[WebhookRetryJob] Found ${failedWebhooks.length} webhooks to retry`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const log of failedWebhooks) {
      try {
        // Check if webhook should be retried based on exponential backoff
        const shouldRetry = checkExponentialBackoff(log.createdAt, log.retryCount);

        if (!shouldRetry) {
          console.log(
            `[WebhookRetryJob] Webhook ${log.id} not ready for retry yet (exponential backoff)`
          );
          skipCount++;
          continue;
        }

        console.log(
          `[WebhookRetryJob] Retrying webhook ${log.id} (attempt ${log.retryCount + 1}/3)`
        );

        try {
          // Retry with WebhookProcessor (v2 events)
          const processor = new WebhookProcessor();
          await processor.process(log.payload);

          // If we get here, processing succeeded
          await prisma.whatsAppWebhookLog.update({
            where: { id: log.id },
            data: {
              processed: true,
              processedAt: new Date(),
            },
          });

          console.log(`[WebhookRetryJob] Successfully retried webhook ${log.id}`);
          successCount++;
          continue;
        } catch (processorError) {
          console.warn(
            `[WebhookRetryJob] Processor failed for ${log.id}:`,
            processorError instanceof Error ? processorError.message : 'Unknown error'
          );
          // Fall through to legacy processing
        }

        // Fallback: Retry legacy message processing
        if (!log.payload || typeof log.payload !== 'object') {
          throw new Error('Invalid webhook payload');
        }

        const payload = log.payload as any;
        const changes = payload.entry?.[0]?.changes?.[0];
        const value = changes?.value;
        const metadata = value?.metadata;
        const phoneId = metadata?.phone_number_id;
        const wabaId = payload.entry?.[0]?.id;

        let instanceId: string | null = null;

        if (phoneId || wabaId) {
          const config = await prisma.whatsAppConfig.findFirst({
            where: {
              OR: [
                phoneId ? { phoneId: phoneId } : null,
                wabaId ? { wabaId: wabaId } : null,
              ].filter((cond): cond is { phoneId: string } | { wabaId: string } =>
                cond !== null
              ),
            },
            select: { id: true },
          });

          instanceId = config?.id ?? null;
        }

        // Process messages
        if (value?.messages && instanceId) {
          for (const msg of value.messages) {
            try {
              const contactProfile = value.contacts?.find((c: any) => c.wa_id === msg.from);
              await WhatsAppChatService.processIncomingMessage(
                instanceId,
                msg,
                contactProfile ? { name: contactProfile.profile.name } : undefined
              );
            } catch (err) {
              console.warn('[WebhookRetryJob] Error processing message:', msg.id, err);
            }
          }
        }

        // Process statuses
        if (value?.statuses && instanceId) {
          for (const status of value.statuses) {
            try {
              await WhatsAppChatService.processStatusUpdate(instanceId, status);
            } catch (err) {
              console.warn('[WebhookRetryJob] Error processing status:', status.id, err);
            }
          }
        }

        // Mark as processed since we tried both processors
        await prisma.whatsAppWebhookLog.update({
          where: { id: log.id },
          data: {
            processed: true,
            processedAt: new Date(),
          },
        });

        console.log(`[WebhookRetryJob] Successfully processed webhook ${log.id} via legacy`);
        successCount++;
      } catch (error) {
        console.error(`[WebhookRetryJob] Error retrying webhook ${log.id}:`, error);

        // Update retry count and last retry time
        await prisma.whatsAppWebhookLog.update({
          where: { id: log.id },
          data: {
            retryCount: { increment: 1 },
            lastRetryAt: new Date(),
            processingError: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        failCount++;

        // Alert if webhook exceeded max retries
        if (log.retryCount + 1 >= 3) {
          console.error(
            `[WebhookRetryJob] ALERT: Webhook ${log.id} exceeded max retries (3/3)`
          );
          // TODO: Send notification to admin/monitoring system
        }
      }
    }

    console.log(
      `[WebhookRetryJob] Completed: ${successCount} success, ${failCount} failed, ${skipCount} skipped`
    );
  } catch (error) {
    console.error('[WebhookRetryJob] Fatal error:', error);
    throw error;
  }
}

/**
 * Check if webhook is ready for retry based on exponential backoff
 * Retry schedule:
 * - Attempt 1: Immediate (retry after 5 min)
 * - Attempt 2: After 5 more minutes (10 min from creation)
 * - Attempt 3: After 5 more minutes (15 min from creation)
 */
function checkExponentialBackoff(createdAt: Date, retryCount: number): boolean {
  const now = new Date();
  const createdTime = new Date(createdAt).getTime();
  const nowTime = now.getTime();
  const elapsedMs = nowTime - createdTime;

  // Exponential backoff: 5 min * (attempt + 1)
  const backoffMs = (retryCount + 1) * 5 * 60 * 1000;

  return elapsedMs >= backoffMs;
}
