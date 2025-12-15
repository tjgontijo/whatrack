import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { connectWhatsappInstance } from '../connect-instance'
import { WhatsappInstance } from '@prisma/client'

const mockFetch = vi.fn()
global.fetch = mockFetch as typeof global.fetch

vi.mock('@/lib/prisma', () => ({
    prisma: {
        whatsappInstance: {
            findUnique: vi.fn(),
        },
    },
}))

// Mock provision webhook (called but errors are caught)
vi.mock('../provision-webhook', () => ({
    provisionInstanceWebhook: vi.fn().mockResolvedValue(undefined),
}))

describe('connectWhatsappInstance', () => {
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

    it('deve retornar o QR code se a API retornar sucesso', async () => {
        // Mock do banco
        const mockInstance = {
            id: 'db-id-1',
            instanceId: 'inst-1',
            organizationId: 'org-1',
            token: 'test-token',
        }
        vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue(mockInstance as unknown as WhatsappInstance)

        // Mock da API
        const apiResponse = {
            qrcode: 'base64-qrcode',
            paircode: '1234',
            instance: {
                status: 'qrcode',
            },
        }
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify(apiResponse), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        )

        const result = await connectWhatsappInstance({
            instanceId: 'inst-1',
            organizationId: 'org-1',
        })

        // Verifica chamada à API
        expect(mockFetch).toHaveBeenCalledWith('https://api.uazapi.com/instance/connect', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                token: 'test-token',
            },
            body: JSON.stringify({}),
        })

        expect(result).toEqual({
            id: 'inst-1',
            instanceId: 'inst-1',
            status: 'waiting_pair',
            qr: 'base64-qrcode',
            pairCode: '1234',
            expiresAt: null,
        })
    })

    it('deve lançar erro se a instância não for encontrada no banco', async () => {
        vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue(null)

        await expect(
            connectWhatsappInstance({
                instanceId: 'inst-1',
                organizationId: 'org-1',
            })
        ).rejects.toThrow('Instância não vinculada à organização')
    })

    it('deve lançar erro se a API falhar', async () => {
        const mockInstance = {
            id: 'db-id-1',
            instanceId: 'inst-1',
            organizationId: 'org-1',
            token: 'test-token',
        }
        vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue(mockInstance as unknown as WhatsappInstance)

        mockFetch.mockResolvedValueOnce(new Response('Error', { status: 500 }))

        await expect(
            connectWhatsappInstance({
                instanceId: 'inst-1',
                organizationId: 'org-1',
            })
        ).rejects.toThrow('Falha ao conectar instância: 500')
    })
})
