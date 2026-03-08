import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetchMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { metaAdsClient } from '@/lib/meta-ads/client'

describe('metaAdsClient', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('loads insights with organization header context instead of query-string org scope', async () => {
    apiFetchMock.mockResolvedValueOnce({ accountSummary: [], campaigns: [] })

    await metaAdsClient.getInsights('org-1')

    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/meta-ads/insights', {
      orgId: 'org-1',
    })
  })

  it('syncs ad accounts without organizationId in the URL', async () => {
    apiFetchMock.mockResolvedValueOnce([])

    await metaAdsClient.getAdAccounts('org-1', { sync: true })

    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/meta-ads/ad-accounts?sync=true', {
      orgId: 'org-1',
    })
  })

  it('creates pixels without sending organizationId in the body', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'pixel-1' })

    await metaAdsClient.createPixel(
      {
        name: 'Pixel Principal',
        pixelId: '123',
        capiToken: 'token-abc',
      },
      'org-1'
    )

    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/meta-ads/pixels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pixel Principal',
        pixelId: '123',
        capiToken: 'token-abc',
      }),
      orgId: 'org-1',
    })
  })
})
