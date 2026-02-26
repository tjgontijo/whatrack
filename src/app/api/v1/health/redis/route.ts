import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { fetchRedisHealthStatus } from '@/services/system/redis-health.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await fetchRedisHealthStatus()
    return NextResponse.json(payload)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return apiError(
      'Redis health check failed',
      500,
      undefined,
      { message, timestamp: new Date().toISOString() }
    )
  }
}
