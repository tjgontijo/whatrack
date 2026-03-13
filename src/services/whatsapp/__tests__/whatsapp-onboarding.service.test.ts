import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const createIdMock = vi.hoisted(() => vi.fn())
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
  encryption: {
    encrypt: vi.fn(),
  },
}))

vi.mock('@/services/whatsapp/meta-cloud.service', () => ({
  MetaCloudService: {},
}))

import { createWhatsAppOnboardingSession } from '@/services/whatsapp/whatsapp-onboarding.service'

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

    const result = await createWhatsAppOnboardingSession('org-123')

    expect(prismaMock.whatsAppOnboarding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-123',
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

    expect(parsedUrl.origin).toBe('https://business.facebook.com')
    expect(parsedUrl.pathname).toBe('/messaging/whatsapp/onboard/')
    expect(parsedUrl.searchParams.get('app_id')).toBe('app-123')
    expect(parsedUrl.searchParams.get('config_id')).toBe('config-456')
    expect(parsedUrl.searchParams.get('redirect_uri')).toBe(
      'https://whatrack.com/api/v1/whatsapp/onboarding/callback'
    )
    expect(parsedUrl.searchParams.get('response_type')).toBe('code')
    expect(parsedUrl.searchParams.get('display')).toBe('popup')
    expect(parsedUrl.searchParams.get('state')).toBe('track-123')
    expect(result.trackingCode).toBe('track-123')
    expect(result.expiresIn).toBe(86400)
  })
})
