/**
 * GET /api/v1/jobs/ai-classifier
 *
 * Polls the Redis sorted set for tickets whose idle window has passed
 * and dispatches the CONVERSATION_IDLE_3M AI event for each one.
 *
 * Designed to be called by an external cron service (cron-job.org, EasyCron, etc.)
 * every 1 minute — works on free plans, no Vercel Pro required.
 *
 * Auth: Bearer CRON_SECRET header
 * Locking: Redis distributed lock prevents overlapping runs
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { getJobTracker } from '@/lib/db/queue'
import { drainDueClassifications } from '@/services/ai/ai-classifier.scheduler'
import { dispatchAiEvent } from '@/services/ai/ai-execution.service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
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

    console.log(`[AI Classifier Job] ${due.length} tickets due for analysis`)

    const results = await Promise.allSettled(
      due.map(({ ticketId, organizationId }) =>
        dispatchAiEvent('CONVERSATION_IDLE_3M', ticketId, organizationId),
      ),
    )

    const dispatched = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

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
