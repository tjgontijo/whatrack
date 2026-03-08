import { NextRequest, NextResponse } from 'next/server'

import { getJobTracker } from '@/lib/db/queue'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'
import { drainDueClassifications } from '@/services/ai/ai-classifier.scheduler'
import { dispatchAiEvent } from '@/services/ai/ai-execution.service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/cron/ai/classifier')
  if (rateLimitResponse) return rateLimitResponse

  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return apiError('Unauthorized', 401)
  }

  const jobTracker = getJobTracker()
  const jobId = await jobTracker.acquireLock('ai-classifier')

  if (!jobId) {
    return NextResponse.json({ success: false, message: 'Job already running' }, { status: 429 })
  }

  try {
    const due = await drainDueClassifications(20)

    logger.info(`[AI Classifier Cron] ${due.length} tickets due for analysis`)

    const results = await Promise.allSettled(
      due.map(({ ticketId, organizationId }) =>
        dispatchAiEvent('CONVERSATION_IDLE_3M', ticketId, organizationId),
      ),
    )

    const dispatched = results.filter((result) => result.status === 'fulfilled').length
    const failed = results.filter((result) => result.status === 'rejected').length

    return NextResponse.json({
      success: true,
      processed: due.length,
      dispatched,
      failed,
      timestamp: new Date().toISOString(),
    })
  } finally {
    await jobTracker.releaseLock('ai-classifier', jobId)
  }
}
