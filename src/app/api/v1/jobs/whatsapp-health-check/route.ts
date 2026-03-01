/**
 * GET /api/v1/jobs/whatsapp-health-check
 *
 * Trigger WhatsApp health check job
 *
 * Use cases:
 * - Vercel cron calls this endpoint at 2 AM
 * - External cron service (EasyCron, etc.)
 * - Manual testing
 *
 * Auth: Requires CRON_SECRET header (Vercel cron) for security
 * Locking: Redis-based distributed lock prevents duplicate runs
 * Rate Limiting:
 * - IP: 60 requests/hour
 * - Organization: 100 requests/hour
 * - Burst: 2 requests/minute
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { getJobTracker } from '@/lib/db/queue'
import { whatsappHealthCheckJob } from '@/jobs/whatsapp-health-check.job'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'
import { logger } from '@/lib/utils/logger'

const CRON_SECRET = process.env.CRON_SECRET
if (!CRON_SECRET) {
  throw new Error('[HealthCheck] CRON_SECRET environment variable is required')
}

export const maxDuration = 300 // 5 minutes timeout for health check

export async function GET(request: NextRequest) {
  // Check rate limits first
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/jobs/whatsapp-health-check')
  if (rateLimitResponse) return rateLimitResponse

  const jobTracker = getJobTracker()

  try {
    // Verify secret (from Vercel Cron authorization header)
    const authHeader = request.headers.get('authorization')

    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      logger.error('[HealthCheckAPI] Invalid or missing CRON_SECRET')
      return apiError('Unauthorized', 401)
    }

    // Acquire distributed lock to prevent concurrent executions
    const jobId = await jobTracker.acquireLock('whatsapp-health-check')

    if (!jobId) {
      logger.warn('[HealthCheckAPI] Job already running, skipping')
      return NextResponse.json(
        {
          success: false,
          message: 'Health check already running',
        },
        { status: 429 } // Too Many Requests
      )
    }

    logger.info(`[HealthCheckAPI] Starting job ${jobId}`)

    try {
      // Execute health check job
      await whatsappHealthCheckJob({ id: jobId })

      logger.info(`[HealthCheckAPI] Job ${jobId} completed successfully`)

      return NextResponse.json({
        success: true,
        jobId,
        message: 'WhatsApp health check completed',
      })
    } finally {
      // Always release lock, even if job fails
      await jobTracker.releaseLock('whatsapp-health-check', jobId)
    }
  } catch (error) {
    logger.error({ err: error }, '[HealthCheckAPI] Error')
    return apiError(error instanceof Error ? error.message : 'Unknown error', 500, error)
  }
}
