import { NextResponse } from 'next/server'

import { fetchRedisHealthStatus } from '@/services/system/redis-health.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await fetchRedisHealthStatus()
    return NextResponse.json(payload)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Redis health check failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
