import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { logoutWhatsappInstance } from '../logout-instance'
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

describe('logoutWhatsappInstance', () => {
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

    it('deve desconectar a instância e atualizar o banco', async () => {
        const mockInstance = {
            id: 'db-id-1',
            instanceId: 'inst-1',
            organizationId: 'org-1',
            token: 'test-token',
        }
        vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue(mockInstance as unknown as WhatsappInstance)

        mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }))

        await logoutWhatsappInstance({
            instanceId: 'inst-1',
            organizationId: 'org-1',
        })

        expect(mockFetch).toHaveBeenCalledWith('https://api.uazapi.com/instance/disconnect', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                token: 'test-token',
            },
            body: JSON.stringify({ instanceId: 'inst-1' }),
        })
    })

    it('deve lançar erro se a instância não for encontrada', async () => {
        vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue(null)

        await expect(
            logoutWhatsappInstance({
                instanceId: 'inst-1',
                organizationId: 'org-1',
            })
        ).rejects.toThrow('Instância não vinculada à organização')
    })
})
