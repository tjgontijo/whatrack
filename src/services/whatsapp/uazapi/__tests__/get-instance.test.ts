import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { getWhatsappInstance } from '../get-instance'
import { WhatsappInstance } from '@prisma/client'
import { listWhatsappInstances } from '../list-instances'
import type { WhatsappInstance as WIType } from '@/lib/schema/whatsapp'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        whatsappInstance: {
            findUnique: vi.fn(),
        },
    },
}))

vi.mock('../list-instances', () => ({
    listWhatsappInstances: vi.fn(),
}))

describe('getWhatsappInstance', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('deve retornar a instância quando encontrada', async () => {
        const mockInstance = {
            id: 'inst-1',
            organizationId: 'org-1',
            instanceId: 'wpp-1',
            phone: '5511999999999',
        }

        vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue(mockInstance as unknown as WhatsappInstance)
        vi.mocked(listWhatsappInstances).mockResolvedValue([
            {
                id: 'inst-1',
                instanceId: 'wpp-1',
                label: 'Test',
                phone: '5511999999999',
                status: 'connected',
                connected: true,
                loggedIn: true,
                qrcode: null,
                paircode: null,
                profileName: null,
                createdAt: '2025-01-01T00:00:00.000Z',
                updatedAt: '2025-01-01T00:00:00.000Z',
            }
        ] as WIType[])

        const result = await getWhatsappInstance({
            instanceId: 'wpp-1',
            organizationId: 'org-1',
        })

        expect(prisma.whatsappInstance.findUnique).toHaveBeenCalledWith({
            where: {
                organizationId_instanceId: {
                    organizationId: 'org-1',
                    instanceId: 'wpp-1',
                },
            },
        })
        expect(result).toBeDefined()
        expect(result?.instanceId).toBe('wpp-1')
    })

    it('deve retornar null quando a instância não for encontrada', async () => {
        vi.mocked(prisma.whatsappInstance.findUnique).mockResolvedValue(null)

        const result = await getWhatsappInstance({
            instanceId: 'wpp-1',
            organizationId: 'org-1',
        })

        expect(result).toBeNull()
    })
})
