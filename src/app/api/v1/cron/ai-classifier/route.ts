import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { runAiClassifierCron } from '@/services/ai/ai-classifier-cron.service'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiError('Unauthorized', 401)
  }

  try {
    const result = await runAiClassifierCron()

    return NextResponse.json({
      success: true,
      found: result.found,
      approvalsCreated: result.approvalsCreated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ err: error }, '[Cron AI Copilot] Fatal error')
    return apiError('Internal Server Error', 500, error)
  }
}
