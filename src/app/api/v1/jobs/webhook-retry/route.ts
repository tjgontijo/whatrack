/**
 * GET /api/v1/jobs/webhook-retry
 *
 * Trigger webhook retry job (DLQ)
 *
 * Use cases:
 * - Vercel/external cron calls this endpoint every 5 minutes
 * - Manual testing of retry logic
 *
 * Auth: Requires CRON_SECRET header (Vercel cron) for security
 * Locking: Redis-based distributed lock prevents concurrent executions
 * Rate Limiting:
 * - IP: 60 requests/hour
 * - Organization: 100 requests/hour
 * - Burst: 2 requests/minute
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { getJobTracker } from '@/lib/db/queue'
import { webhookRetryJob } from '@/jobs/webhook-retry.job'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'
import { logger } from '@/lib/utils/logger'

const CRON_SECRET = process.env.CRON_SECRET
if (!CRON_SECRET) {
  throw new Error('[WebhookRetry] CRON_SECRET environment variable is required')
}

export const maxDuration = 60 // 60 seconds timeout for retry job

export async function GET(request: NextRequest) {
  // Check rate limits first
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/jobs/webhook-retry')
  if (rateLimitResponse) return rateLimitResponse

  const jobTracker = getJobTracker()

  try {
    // Verify secret (from Vercel Cron authorization header)
    const authHeader = request.headers.get('authorization')

    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      logger.error('[WebhookRetryAPI] Invalid or missing CRON_SECRET')
      return apiError('Unauthorized', 401)
    }

    // Acquire distributed lock to prevent concurrent executions
    const jobId = await jobTracker.acquireLock('webhook-retry')

    if (!jobId) {
      logger.warn('[WebhookRetryAPI] Job already running, skipping')
      return NextResponse.json(
        {
          success: false,
          message: 'Webhook retry already running',
        },
        { status: 429 } // Too Many Requests
      )
    }

    logger.info(`[WebhookRetryAPI] Starting job ${jobId}`)

    try {
      // Execute webhook retry job
      await webhookRetryJob({ id: jobId })

      logger.info(`[WebhookRetryAPI] Job ${jobId} completed successfully`)

      return NextResponse.json({
        success: true,
        jobId,
        message: 'Webhook retry completed',
      })
    } finally {
      // Always release lock, even if job fails
      await jobTracker.releaseLock('webhook-retry', jobId)
    }
  } catch (error) {
    logger.error({ err: error }, '[WebhookRetryAPI] Error')
    return apiError(error instanceof Error ? error.message : 'Unknown error', 500, error)
  }
}
