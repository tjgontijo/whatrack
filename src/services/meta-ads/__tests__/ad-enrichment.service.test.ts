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

const axiosMock = vi.hoisted(() => ({
  get: vi.fn(),
  isAxiosError: vi.fn((error: unknown) => {
    if (!error || typeof error !== 'object') return false
    return 'isAxiosError' in error
  }),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/services/meta-ads/access-token.service', () => ({
  metaAccessTokenService: metaAccessTokenServiceMock,
}))

vi.mock('axios', () => ({
  default: axiosMock,
}))

import { metaAdEnrichmentService } from '@/services/meta-ads/ad-enrichment.service'

describe('ad-enrichment.service', () => {
  const originalMetaApiVersion = process.env.META_API_VERSION

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.META_API_VERSION = 'v21.0'
  })

  afterEach(() => {
    process.env.META_API_VERSION = originalMetaApiVersion
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

  it('stores failed status with message from axios error payload', async () => {
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

    axiosMock.get.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Request failed',
      response: {
        data: {
          error: {
            message: 'Meta API failed',
          },
        },
      },
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
