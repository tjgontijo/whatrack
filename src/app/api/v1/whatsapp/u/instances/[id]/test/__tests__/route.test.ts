import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'

vi.mock('@/server/auth/validate-organization-access', () => ({
  validateFullAccess: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    whatsappInstance: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/services/whatsapp/uazapi/send-whatsapp-message', () => ({
  sendWhatsappMessage: vi.fn(),
}))

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { prisma } from '@/lib/prisma'
import { sendWhatsappMessage } from '@/services/whatsapp/uazapi/send-whatsapp-message'

describe('POST /api/v1/whatsapp/instances/[id]/test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 when access denied', async () => {
    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: false,
      error: 'Acesso negado',
    })

    const request = new Request('http://localhost/api/v1/whatsapp/instances/inst-1/test', {
      method: 'POST',
      body: JSON.stringify({ phone: '5511999999999', message: 'Test' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'inst-1' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Acesso negado')
  })

  it('returns 400 when phone is missing', async () => {
    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: true,
      organizationId: 'org-123',
    })

    const request = new Request('http://localhost/api/v1/whatsapp/instances/inst-1/test', {
      method: 'POST',
      body: JSON.stringify({ message: 'Test' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'inst-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Dados inválidos')
  })

  it('returns 400 when message is missing', async () => {
    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: true,
      organizationId: 'org-123',
    })

    const request = new Request('http://localhost/api/v1/whatsapp/instances/inst-1/test', {
      method: 'POST',
      body: JSON.stringify({ phone: '5511999999999' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'inst-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Dados inválidos')
  })

  it('returns 404 when instance not found', async () => {
    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: true,
      organizationId: 'org-123',
    })
    vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue(null)

    const request = new Request('http://localhost/api/v1/whatsapp/instances/inst-1/test', {
      method: 'POST',
      body: JSON.stringify({ phone: '5511999999999', message: 'Test' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'inst-1' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Instância não encontrada')
  })

  it('sends test message successfully', async () => {
    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: true,
      organizationId: 'org-123',
    })
    vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue({
      id: 'db-id-1',
      instanceId: 'inst-1',
      organizationId: 'org-123',
    } as any)
    vi.mocked(sendWhatsappMessage).mockResolvedValue({
      messageId: 'msg-123',
    })

    const request = new Request('http://localhost/api/v1/whatsapp/instances/inst-1/test', {
      method: 'POST',
      body: JSON.stringify({ phone: '5511999999999', message: 'Test message' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'inst-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.messageId).toBe('msg-123')
  })

  it('formats phone number by removing non-digits', async () => {
    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: true,
      organizationId: 'org-123',
    })
    vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue({
      id: 'db-id-1',
      instanceId: 'inst-1',
      organizationId: 'org-123',
    } as any)
    vi.mocked(sendWhatsappMessage).mockResolvedValue({
      messageId: 'msg-123',
    })

    const request = new Request('http://localhost/api/v1/whatsapp/instances/inst-1/test', {
      method: 'POST',
      body: JSON.stringify({ phone: '+55 (11) 99999-9999', message: 'Test' }),
    })

    await POST(request, { params: Promise.resolve({ id: 'inst-1' }) })

    expect(sendWhatsappMessage).toHaveBeenCalledWith({
      instanceId: 'inst-1',
      organizationId: 'org-123',
      to: '5511999999999',
      type: 'text',
      text: 'Test',
    })
  })

  it('looks up instance with correct compound key', async () => {
    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: true,
      organizationId: 'org-123',
    })
    vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue(null)

    const request = new Request('http://localhost/api/v1/whatsapp/instances/inst-1/test', {
      method: 'POST',
      body: JSON.stringify({ phone: '5511999999999', message: 'Test' }),
    })

    await POST(request, { params: Promise.resolve({ id: 'inst-1' }) })

    expect(prisma.whatsappInstance.findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_instanceId: {
          organizationId: 'org-123',
          instanceId: 'inst-1',
        },
      },
    })
  })

  it('returns 500 on sendWhatsappMessage error', async () => {
    vi.mocked(validateFullAccess).mockResolvedValue({
      hasAccess: true,
      organizationId: 'org-123',
    })
    vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue({
      id: 'db-id-1',
      instanceId: 'inst-1',
      organizationId: 'org-123',
    } as any)
    vi.mocked(sendWhatsappMessage).mockRejectedValue(new Error('WhatsApp API Error'))

    const request = new Request('http://localhost/api/v1/whatsapp/instances/inst-1/test', {
      method: 'POST',
      body: JSON.stringify({ phone: '5511999999999', message: 'Test' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'inst-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('WhatsApp API Error')
  })
})
