import { NextResponse } from 'next/server'

import { runAiClassifierCron } from '@/services/ai/ai-classifier-cron.service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    console.error('[Cron AI Copilot] Fatal error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
