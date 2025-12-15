import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { deleteWhatsappInstance } from '../delete-instance'
import { WhatsappInstance } from '@prisma/client'

const mockFetch = vi.fn()
global.fetch = mockFetch as typeof global.fetch

vi.mock('@/lib/prisma', () => ({
    prisma: {
        whatsappInstance: {
            findUnique: vi.fn(),
            delete: vi.fn(),
        },
        instanceWebhook: {
            deleteMany: vi.fn(),
        },
    },
}))

describe('deleteWhatsappInstance', () => {
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

    it('deve deletar a instância da API e do banco', async () => {
        const mockInstance = {
            id: 'db-id-1',
            instanceId: 'inst-1',
            organizationId: 'org-1',
            token: 'test-token',
        }
        vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue(mockInstance as unknown as WhatsappInstance)

        mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }))

        await deleteWhatsappInstance({
            instanceId: 'inst-1',
            organizationId: 'org-1',
        })

        expect(mockFetch).toHaveBeenCalledWith('https://api.uazapi.com/instance', {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                token: 'test-token',
            },
            body: JSON.stringify({ instanceId: 'inst-1' }),
        })

        expect(prisma.instanceWebhook.deleteMany).toHaveBeenCalledWith({
            where: {
                organizationId: 'org-1',
                instanceId: 'inst-1',
            },
        })

        expect(prisma.whatsappInstance.delete).toHaveBeenCalledWith({
            where: {
                organizationId_instanceId: {
                    organizationId: 'org-1',
                    instanceId: 'inst-1',
                },
            },
        })
    })

    it('deve lançar erro se a instância não for encontrada', async () => {
        vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue(null)

        await expect(
            deleteWhatsappInstance({
                instanceId: 'inst-1',
                organizationId: 'org-1',
            })
        ).rejects.toThrow('Instância não vinculada à organização')
    })
})
