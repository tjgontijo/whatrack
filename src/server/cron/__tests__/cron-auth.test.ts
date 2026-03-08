import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const rateLimitMiddlewareMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/utils/rate-limit.middleware', () => ({
  rateLimitMiddleware: rateLimitMiddlewareMock,
}))

import { authorizeCronRequest } from '@/server/cron/cron-auth'

describe('authorizeCronRequest', () => {
  beforeEach(() => {
    rateLimitMiddlewareMock.mockReset()
    process.env.CRON_SECRET = 'x'.repeat(32)
  })

  it('returns the rate limit response when throttled', async () => {
    const response = NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    rateLimitMiddlewareMock.mockResolvedValueOnce(response)

    const request = new NextRequest('https://whatrack.com/api/v1/cron/ai/classifier', {
      method: 'POST',
    })

    const result = await authorizeCronRequest(request, '/api/v1/cron/ai/classifier')

    expect(result).toBe(response)
  })

  it('rejects requests with an invalid bearer token', async () => {
    rateLimitMiddlewareMock.mockResolvedValueOnce(null)

    const request = new NextRequest('https://whatrack.com/api/v1/cron/ai/classifier', {
      method: 'POST',
      headers: {
        authorization: 'Bearer invalid',
      },
    })

    const result = await authorizeCronRequest(request, '/api/v1/cron/ai/classifier')

    expect(result?.status).toBe(401)
  })

  it('allows authorized requests to continue', async () => {
    rateLimitMiddlewareMock.mockResolvedValueOnce(null)

    const request = new NextRequest('https://whatrack.com/api/v1/cron/ai/classifier', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${'x'.repeat(32)}`,
      },
    })

    const result = await authorizeCronRequest(request, '/api/v1/cron/ai/classifier')

    expect(result).toBeNull()
  })
})
