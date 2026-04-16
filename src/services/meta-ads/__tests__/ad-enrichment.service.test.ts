import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  ticketTracking: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  metaConnection: {
    findFirst: vi.fn(),
  },
}))

const metaAccessTokenServiceMock = vi.hoisted(() => ({
  getDecryptedToken: vi.fn(),
}))

const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/services/meta-ads/access-token.service', () => ({
  metaAccessTokenService: metaAccessTokenServiceMock,
}))

import { metaAdEnrichmentService } from '@/services/meta-ads/ad-enrichment.service'

describe('ad-enrichment.service', () => {
  const originalMetaApiVersion = process.env.META_API_VERSION
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.META_API_VERSION = 'v21.0'
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    process.env.META_API_VERSION = originalMetaApiVersion
    global.fetch = originalFetch
  })

  it('does nothing when tracking has no meta ad id', async () => {
    prismaMock.ticketTracking.findUnique.mockResolvedValueOnce({
      metaAdId: null,
      metaEnrichmentStatus: 'PENDING',
      ticket: {
        id: 'ticket-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
        project: { id: 'proj-1', organizationId: 'org-1' },
      },
    })

    await metaAdEnrichmentService.enrichTicket('ticket-1')

    expect(metaAccessTokenServiceMock.getDecryptedToken).not.toHaveBeenCalled()
    expect(prismaMock.ticketTracking.update).not.toHaveBeenCalled()
  })

  it('stores failed status with message from meta api payload', async () => {
    prismaMock.ticketTracking.findUnique.mockResolvedValueOnce({
      metaAdId: 'ad-1',
      metaEnrichmentStatus: 'PENDING',
      ticket: {
        id: 'ticket-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
        project: { id: 'proj-1', organizationId: 'org-1' },
      },
    })

    prismaMock.metaConnection.findFirst.mockResolvedValueOnce({ id: 'conn-1' })

    metaAccessTokenServiceMock.getDecryptedToken.mockResolvedValueOnce('token-1')

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: {
        get: vi.fn(() => 'application/json'),
      },
      json: vi.fn(async () => ({
        error: {
          message: 'Meta API failed',
        },
      })),
    })

    await metaAdEnrichmentService.enrichTicket('ticket-1')

    expect(prismaMock.ticketTracking.update).toHaveBeenCalledWith({
      where: { ticketId: 'ticket-1' },
      data: {
        metaEnrichmentStatus: 'FAILED',
        metaEnrichmentError: 'Meta API failed',
        lastEnrichmentAt: expect.any(Date),
      },
    })
  })
})
