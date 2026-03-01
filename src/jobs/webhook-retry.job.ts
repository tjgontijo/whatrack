import { prisma } from '@/lib/db/prisma'
import { getRedis } from '@/lib/db/redis'
import { WebhookProcessor } from '@/services/whatsapp/webhook-processor'
import { resendProvider } from '@/services/mail/resend'
import { generateWebhookFailureAlertEmail } from '@/services/mail/templates/WebhookFailureAlertEmail'
import { logger } from '@/lib/utils/logger'

const MAX_RETRIES = 3
const ALERT_THROTTLE_SECONDS = 3600 // 1 alert per webhook per hour

async function sendWebhookFailureAlert(log: {
  id: string
  organizationId: string | null
  eventType: string | null
  retryCount: number
  processingError: string | null
  createdAt: Date
}): Promise<void> {
  // Throttle: at most 1 alert per webhook per hour
  const throttleKey = `webhook_alert:${log.id}`
  try {
    const redis = getRedis()
    const alreadySent = await redis.get(throttleKey)
    if (alreadySent) return
    await redis.setex(throttleKey, ALERT_THROTTLE_SECONDS, '1')
  } catch {
    // Redis unavailable — send alert anyway (no throttle)
  }

  if (!log.organizationId) {
    logger.warn(`[WebhookRetryJob] No organizationId for webhook ${log.id}, skipping alert`)
    return
  }

  try {
    // Get organization owner email
    const membership = await prisma.member.findFirst({
      where: { organizationId: log.organizationId, role: 'owner' },
      include: { user: { select: { email: true, name: true } } },
    })

    if (!membership?.user?.email) {
      logger.warn(`[WebhookRetryJob] No owner found for org ${log.organizationId}, skipping alert`)
      return
    }

    const organization = await prisma.organization.findUnique({
      where: { id: log.organizationId },
      select: { name: true },
    })

    const emailContent = await generateWebhookFailureAlertEmail({
      organizationName: organization?.name || log.organizationId,
      webhookId: log.id,
      eventType: log.eventType ?? undefined,
      retryCount: log.retryCount,
      lastError: log.processingError || 'Unknown error',
      createdAt: log.createdAt.toISOString(),
    })

    await resendProvider.send({
      to: membership.user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    logger.info(`[WebhookRetryJob] Alert sent to ${membership.user.email} for webhook ${log.id}`)
  } catch (alertError) {
    logger.error({ err: alertError }, `[WebhookRetryJob] Failed to send alert for webhook ${log.id}`)
  }
}

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
  logger.info('[WebhookRetryJob] Starting webhook retry processing')

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
    })

    logger.info(`[WebhookRetryJob] Found ${failedWebhooks.length} webhooks to retry`)

    let successCount = 0
    let failCount = 0
    let skipCount = 0

    for (const log of failedWebhooks) {
      try {
        // Check if webhook should be retried based on exponential backoff
        const shouldRetry = checkExponentialBackoff(log.createdAt, log.retryCount)

        if (!shouldRetry) {
          logger.info(
            `[WebhookRetryJob] Webhook ${log.id} not ready for retry yet (exponential backoff)`
          )
          skipCount++
          continue
        }

        logger.info(
          `[WebhookRetryJob] Retrying webhook ${log.id} (attempt ${log.retryCount + 1}/3)`
        )

        const processor = new WebhookProcessor()
        await processor.process(log.payload)

        await prisma.whatsAppWebhookLog.update({
          where: { id: log.id },
          data: {
            processed: true,
            processedAt: new Date(),
          },
        })

        logger.info(`[WebhookRetryJob] Successfully retried webhook ${log.id}`)
        successCount++
      } catch (error) {
        logger.error({ err: error }, `[WebhookRetryJob] Error retrying webhook ${log.id}`)

        // Update retry count and last retry time
        await prisma.whatsAppWebhookLog.update({
          where: { id: log.id },
          data: {
            retryCount: { increment: 1 },
            lastRetryAt: new Date(),
            processingError: error instanceof Error ? error.message : 'Unknown error',
          },
        })

        failCount++

        // Alert if webhook exceeded max retries
        if (log.retryCount + 1 >= MAX_RETRIES) {
          logger.error(
            `[WebhookRetryJob] ALERT: Webhook ${log.id} exceeded max retries (${MAX_RETRIES}/${MAX_RETRIES})`
          )
          await sendWebhookFailureAlert({
            ...log,
            retryCount: log.retryCount + 1,
          })
        }
      }
    }

    logger.info(
      `[WebhookRetryJob] Completed: ${successCount} success, ${failCount} failed, ${skipCount} skipped`
    )
  } catch (error) {
    logger.error({ err: error }, '[WebhookRetryJob] Fatal error')
    throw error
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
  const now = new Date()
  const createdTime = new Date(createdAt).getTime()
  const nowTime = now.getTime()
  const elapsedMs = nowTime - createdTime

  // Exponential backoff: 5 min * (attempt + 1)
  const backoffMs = (retryCount + 1) * 5 * 60 * 1000

  return elapsedMs >= backoffMs
}
