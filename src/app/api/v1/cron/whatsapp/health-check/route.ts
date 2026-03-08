import { NextRequest, NextResponse } from 'next/server'

import { getJobTracker } from '@/lib/db/queue'
import { whatsappHealthCheckJob } from '@/jobs/whatsapp-health-check.job'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'

const CRON_SECRET = process.env.CRON_SECRET
if (!CRON_SECRET) {
  throw new Error('[WhatsAppHealthCheckCron] CRON_SECRET environment variable is required')
}

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/cron/whatsapp/health-check')
  if (rateLimitResponse) return rateLimitResponse

  const jobTracker = getJobTracker()

  try {
    const authHeader = request.headers.get('authorization')

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      logger.error('[WhatsAppHealthCheckCron] Invalid or missing CRON_SECRET')
      return apiError('Unauthorized', 401)
    }

    const jobId = await jobTracker.acquireLock('whatsapp-health-check')

    if (!jobId) {
      logger.warn('[WhatsAppHealthCheckCron] Job already running, skipping')
      return NextResponse.json(
        {
          success: false,
          message: 'Health check already running',
        },
        { status: 429 },
      )
    }

    logger.info(`[WhatsAppHealthCheckCron] Starting job ${jobId}`)

    try {
      await whatsappHealthCheckJob({ id: jobId })

      logger.info(`[WhatsAppHealthCheckCron] Job ${jobId} completed successfully`)

      return NextResponse.json({
        success: true,
        jobId,
        message: 'WhatsApp health check completed',
      })
    } finally {
      await jobTracker.releaseLock('whatsapp-health-check', jobId)
    }
  } catch (error) {
    logger.error({ err: error }, '[WhatsAppHealthCheckCron] Error')
    return apiError(error instanceof Error ? error.message : 'Unknown error', 500, error)
  }
}
