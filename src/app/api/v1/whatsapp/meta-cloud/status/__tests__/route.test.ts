import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { SubscriptionStatus } from '@prisma/client'

vi.mock('@/lib/auth/validate-organization-access', () => ({
  validateFullAccess: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: {
      findFirst: vi.fn(),
    },
    metaWhatsAppCredential: {
      findUnique: vi.fn(),
    },
  },
}))

import { validateFullAccess } from '@/lib/auth/validate-organization-access'
import { prisma } from '@/lib/prisma'

describe('GET /api/v1/whatsapp/meta-cloud/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 when access denied', async () => {
    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: false,
      error: 'Acesso negado',
    })

    const request = new Request('http://localhost/api/v1/whatsapp/meta-cloud/status')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Acesso negado')
  })

  it('returns hasAddon: false when no subscription', async () => {
    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: true,
      organizationId: 'org-123',
    })
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.metaWhatsAppCredential.findUnique).mockResolvedValue(null)

    const request = new Request('http://localhost/api/v1/whatsapp/meta-cloud/status')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.hasAddon).toBe(false)
    expect(data.credential).toBeNull()
  })

  it('returns hasAddon: false when subscription is free plan', async () => {
    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: true,
      organizationId: 'org-123',
    })
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      id: 'sub-1',
      plan: { slug: 'free' },
    } as any)
    vi.mocked(prisma.metaWhatsAppCredential.findUnique).mockResolvedValue(null)

    const request = new Request('http://localhost/api/v1/whatsapp/meta-cloud/status')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.hasAddon).toBe(false)
  })

  it('returns hasAddon: true when subscription is paid plan', async () => {
    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: true,
      organizationId: 'org-123',
    })
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      id: 'sub-1',
      plan: { slug: 'pro' },
    } as any)
    vi.mocked(prisma.metaWhatsAppCredential.findUnique).mockResolvedValue(null)

    const request = new Request('http://localhost/api/v1/whatsapp/meta-cloud/status')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.hasAddon).toBe(true)
    expect(data.credential).toBeNull()
  })

  it('returns credential when exists', async () => {
    const mockCredential = {
      id: 'cred-1',
      phoneNumberId: '123456789',
      wabaId: '987654321',
      phoneNumber: '5511999999999',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }

    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: true,
      organizationId: 'org-123',
    })
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      id: 'sub-1',
      plan: { slug: 'pro' },
    } as any)
    vi.mocked(prisma.metaWhatsAppCredential.findUnique).mockResolvedValue(mockCredential as any)

    const request = new Request('http://localhost/api/v1/whatsapp/meta-cloud/status')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.hasAddon).toBe(true)
    expect(data.credential).toMatchObject({
      id: 'cred-1',
      phoneNumberId: '123456789',
      wabaId: '987654321',
      phoneNumber: '5511999999999',
      isActive: true,
    })
  })

  it('returns 500 on database error', async () => {
    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: true,
      organizationId: 'org-123',
    })
    vi.mocked(prisma.subscription.findFirst).mockRejectedValue(new Error('DB Error'))

    const request = new Request('http://localhost/api/v1/whatsapp/meta-cloud/status')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Falha ao carregar status')
  })

  it('queries subscription with correct filters', async () => {
    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: true,
      organizationId: 'org-123',
    })
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.metaWhatsAppCredential.findUnique).mockResolvedValue(null)

    const request = new Request('http://localhost/api/v1/whatsapp/meta-cloud/status')
    await GET(request)

    expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
      where: {
        billingCustomer: { organizationId: 'org-123' },
        status: {
          in: [
            SubscriptionStatus.active,
            SubscriptionStatus.trialing,
            SubscriptionStatus.past_due,
          ],
        },
      },
      select: {
        id: true,
        plan: {
          select: {
            slug: true,
          },
        },
      },
    })
  })
})
