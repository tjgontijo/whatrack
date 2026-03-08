import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { cronTriggerBodySchema } from '@/schemas/cron/cron-schemas'
import { authorizeCronRequest } from '@/server/cron/cron-auth'
import { runWhatsAppHealthCheckCronJob } from '@/services/cron/whatsapp-health-check-cron.service'

export const maxDuration = 300
const ENDPOINT = '/api/v1/cron/whatsapp/health-check'

export async function POST(request: NextRequest) {
  const authorizationError = await authorizeCronRequest(request, ENDPOINT)
  if (authorizationError) return authorizationError

  const parseResult = cronTriggerBodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parseResult.success) {
    return apiError('Invalid cron payload', 400, parseResult.error.flatten())
  }

  try {
    const result = await runWhatsAppHealthCheckCronJob()

    if (result.status === 'already-running') {
      return apiSuccess({ success: false, message: 'Health check already running' }, 429)
    }

    return apiSuccess({
      success: true,
      jobId: result.jobId,
      ...result.data,
    })
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Unknown error', 500, error)
  }
}
