import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { updateWebhook } from '../update-webhook'
import type { WhatsappInstance, InstanceWebhook } from '@prisma/client'

const mockFetch = vi.fn()
global.fetch = mockFetch as typeof global.fetch

vi.mock('@/lib/prisma', () => ({
    prisma: {
        whatsappInstance: {
            findUnique: vi.fn(),
        },
        instanceWebhook: {
            upsert: vi.fn(),
            update: vi.fn(),
        },
    },
}))

// Mock createAppBaseUrl
vi.mock('@/lib/util/url', () => ({
    createAppBaseUrl: () => 'https://app.example.com',
}))

describe('updateWebhook', () => {
    const originalEnv = process.env

    beforeEach(() => {
        vi.clearAllMocks()
        process.env = { ...originalEnv }
        process.env.UAZAPI_BASE_URL = 'https://api.uazapi.com'
        process.env.UAZAPI_ADMIN_TOKEN = 'admin-token'
    })

    afterEach(() => {
        process.env = originalEnv
    })

    it('deve atualizar o webhook na API', async () => {
        const mockInstance = {
            id: 'db-id-1',
            instanceId: 'inst-1',
            organizationId: 'org-1',
            token: 'test-token',
        }
        vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue(mockInstance as unknown as WhatsappInstance)

        const mockWebhook = {
            id: 'webhook-id-1',
            organizationId: 'org-1',
            instanceId: 'inst-1',
            url: '',
        }
        vi.mocked(prisma.instanceWebhook.upsert).mockResolvedValue(mockWebhook as Partial<InstanceWebhook> as InstanceWebhook)
        vi.mocked(prisma.instanceWebhook.update).mockResolvedValue(mockWebhook as Partial<InstanceWebhook> as InstanceWebhook)

        mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))

        await updateWebhook({
            instanceId: 'inst-1',
            organizationId: 'org-1',
            enabled: true,
        })

        expect(mockFetch).toHaveBeenCalledWith('https://api.uazapi.com/webhook', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                token: 'test-token',
            },
            body: expect.stringContaining('inst-1'),
        })

        expect(prisma.instanceWebhook.update).toHaveBeenCalled()
    })

    it('deve lançar erro se a instância não for encontrada', async () => {
        vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue(null)

        await expect(
            updateWebhook({
                instanceId: 'inst-1',
                organizationId: 'org-1',
                webhookUrl: 'https://meu-webhook.com',
            })
        ).rejects.toThrow('Instância não vinculada à organização')
    })
})
