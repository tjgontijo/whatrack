import type { NextRequest } from 'next/server'

import { requireEnv } from '@/lib/env/require-env'
import { apiError } from '@/lib/utils/api-response'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'

export async function authorizeCronRequest(request: NextRequest, endpoint: string) {
  const rateLimitResponse = await rateLimitMiddleware(request, endpoint)
  if (rateLimitResponse) return rateLimitResponse

  if (request.headers.get('authorization') !== `Bearer ${requireEnv('CRON_SECRET')}`) {
    return apiError('Unauthorized', 401)
  }

  return null
}
