import { NextRequest, NextResponse } from 'next/server'

import { getJobTracker } from '@/lib/db/queue'
import { webhookRetryJob } from '@/jobs/webhook-retry.job'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'

const CRON_SECRET = process.env.CRON_SECRET
if (!CRON_SECRET) {
  throw new Error('[WebhookRetryCron] CRON_SECRET environment variable is required')
}

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/cron/system/webhook-retry')
  if (rateLimitResponse) return rateLimitResponse

  const jobTracker = getJobTracker()

  try {
    const authHeader = request.headers.get('authorization')

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      logger.error('[WebhookRetryCron] Invalid or missing CRON_SECRET')
      return apiError('Unauthorized', 401)
    }

    const jobId = await jobTracker.acquireLock('webhook-retry')

    if (!jobId) {
      logger.warn('[WebhookRetryCron] Job already running, skipping')
      return NextResponse.json(
        {
          success: false,
          message: 'Webhook retry already running',
        },
        { status: 429 },
      )
    }

    logger.info(`[WebhookRetryCron] Starting job ${jobId}`)

    try {
      await webhookRetryJob({ id: jobId })

      logger.info(`[WebhookRetryCron] Job ${jobId} completed successfully`)

      return NextResponse.json({
        success: true,
        jobId,
        message: 'Webhook retry completed',
      })
    } finally {
      await jobTracker.releaseLock('webhook-retry', jobId)
    }
  } catch (error) {
    logger.error({ err: error }, '[WebhookRetryCron] Error')
    return apiError(error instanceof Error ? error.message : 'Unknown error', 500, error)
  }
}
