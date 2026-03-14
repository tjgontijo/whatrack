import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const createIdMock = vi.hoisted(() => vi.fn())
const encryptionMock = vi.hoisted(() => ({
  encrypt: vi.fn(),
}))
const metaCloudMock = vi.hoisted(() => ({
  exchangeCodeForToken: vi.fn(),
  listWabas: vi.fn(),
  listPhoneNumbers: vi.fn(),
  subscribeToWaba: vi.fn(),
}))
const prismaMock = vi.hoisted(() => ({
  whatsAppOnboarding: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  whatsAppConnection: {
    upsert: vi.fn(),
  },
  whatsAppConfig: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  whatsAppAuditLog: {
    create: vi.fn(),
  },
}))

vi.mock('@paralleldrive/cuid2', () => ({
  createId: createIdMock,
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/utils/encryption', () => ({
  encryption: encryptionMock,
}))

vi.mock('@/services/whatsapp/meta-cloud.service', () => ({
  MetaCloudService: metaCloudMock,
}))

import {
  createWhatsAppOnboardingSession,
  handleWhatsAppOnboardingCallback,
} from '@/services/whatsapp/whatsapp-onboarding.service'

const ORIGINAL_ENV = process.env

describe('whatsapp-onboarding.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createIdMock.mockReturnValue('track-123')
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_META_APP_ID: 'app-123',
      NEXT_PUBLIC_META_CONFIG_ID: 'config-456',
      APP_URL: 'https://whatrack.com',
    }
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('creates a hosted embedded signup session with the expected URL contract', async () => {
    prismaMock.whatsAppOnboarding.create.mockResolvedValue(undefined)

    const result = await createWhatsAppOnboardingSession('org-123', undefined)

    expect(prismaMock.whatsAppOnboarding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-123',
        projectId: null,
        trackingCode: 'track-123',
        status: 'pending',
        expiresAt: expect.any(Date),
      }),
    })

    expect('error' in result).toBe(false)

    if ('error' in result) {
      return
    }

    const parsedUrl = new URL(result.onboardingUrl)

    expect(parsedUrl.origin).toBe('https://www.facebook.com')
    expect(parsedUrl.pathname).toBe('/dialog/oauth')
    expect(parsedUrl.searchParams.get('client_id')).toBe('app-123')
    expect(parsedUrl.searchParams.get('config_id')).toBe('config-456')
    expect(parsedUrl.searchParams.get('redirect_uri')).toBe(
      'https://whatrack.com/api/v1/whatsapp/onboarding/callback'
    )
    expect(parsedUrl.searchParams.get('scope')).toBe(
      'whatsapp_business_management,business_management'
    )
    expect(parsedUrl.searchParams.get('response_type')).toBe('code')
    expect(parsedUrl.searchParams.get('state')).toBe('track-123')
    expect(result.trackingCode).toBe('track-123')
    expect(result.expiresIn).toBe(86400)
  })

  it('materializes a pending config when onboarding finishes before Meta exposes phone numbers', async () => {
    prismaMock.whatsAppOnboarding.findUnique.mockResolvedValue({
      id: 'onboarding-1',
      organizationId: 'org-123',
      projectId: null,
      expiresAt: new Date(Date.now() + 60_000),
    })
    metaCloudMock.exchangeCodeForToken.mockResolvedValue({
      access_token: 'meta-token',
    })
    metaCloudMock.listWabas.mockResolvedValue([
      {
        wabaId: 'waba-123',
        wabaName: 'Acme Support',
        businessId: 'business-123',
      },
    ])
    metaCloudMock.listPhoneNumbers.mockResolvedValue([])
    metaCloudMock.subscribeToWaba.mockResolvedValue(undefined)
    encryptionMock.encrypt.mockReturnValue('encrypted-token')
    prismaMock.whatsAppConnection.upsert.mockResolvedValue({ id: 'connection-1' })
    prismaMock.whatsAppConfig.upsert.mockResolvedValue(undefined)
    prismaMock.whatsAppAuditLog.create.mockResolvedValue(undefined)
    prismaMock.whatsAppOnboarding.update.mockResolvedValue(undefined)

    const result = await handleWhatsAppOnboardingCallback({
      code: 'meta-code',
      state: 'track-123',
      error: null,
      errorDescription: null,
    })

    expect(prismaMock.whatsAppConfig.upsert).toHaveBeenCalledWith({
      where: { phoneId: 'pending_waba-123' },
      create: expect.objectContaining({
        organizationId: 'org-123',
        projectId: null,
        connectionId: 'connection-1',
        wabaId: 'waba-123',
        phoneId: 'pending_waba-123',
        verifiedName: 'Acme Support',
        accessToken: 'encrypted-token',
        accessTokenEncrypted: true,
        status: 'pending',
        connectedAt: expect.any(Date),
      }),
      update: expect.objectContaining({
        organizationId: 'org-123',
        projectId: null,
        connectionId: 'connection-1',
        wabaId: 'waba-123',
        verifiedName: 'Acme Support',
        accessToken: 'encrypted-token',
        accessTokenEncrypted: true,
        status: 'pending',
        connectedAt: expect.any(Date),
        disconnectedAt: null,
      }),
    })
    expect(result).toEqual({ success: true, totalPhones: 0 })
  })
})
