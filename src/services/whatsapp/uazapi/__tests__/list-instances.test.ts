import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { listWhatsappInstances } from '../list-instances'
import { WhatsappInstance } from '@prisma/client'

const mockFetch = vi.fn()

global.fetch = mockFetch as typeof global.fetch

vi.mock('@/lib/prisma', () => ({
    prisma: {
        whatsappInstance: {
            findMany: vi.fn(),
        },
    },
}))

describe('listWhatsappInstances', () => {
    const originalEnv = process.env

    beforeEach(() => {
        vi.clearAllMocks()
        process.env = { ...originalEnv }
        process.env.UAZAPI_BASE_URL = 'https://elev8.uazapi.com'
        process.env.UAZAPI_ADMIN_TOKEN = 'admin-token'
    })

    afterEach(() => {
        process.env = originalEnv
    })

    it('retorna instâncias do banco com status atualizado da API', async () => {
        // 1. Mock do Banco de Dados
        const dbInstances = [
            {
                id: 'db-id-1',
                organizationId: 'org-1',
                instanceId: 'inst-1',
                phone: '5561999999999',
                label: 'Linha Principal',
                status: 'disconnected', // Status antigo no banco
                connected: false,
                loggedIn: false,
                profileName: null,
                createdAt: new Date('2025-01-01T10:00:00Z'),
                updatedAt: new Date('2025-01-01T10:00:00Z'),
            },
        ]
        vi.mocked(prisma.whatsappInstance.findMany).mockResolvedValue(dbInstances as unknown as WhatsappInstance[])

        // 2. Mock da API Externa (Status atualizado)
        const apiInstances = [
            {
                id: 'inst-1',
                name: 'Linha Principal',
                status: 'connected',
                connected: true,
                loggedIn: true,
                qrcode: 'qr',
                paircode: '1234',
            },
        ]
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ instances: apiInstances }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        )

        const result = await listWhatsappInstances('org-1')

        // Verifica chamada ao Prisma
        expect(prisma.whatsappInstance.findMany).toHaveBeenCalledWith({
            where: { organizationId: 'org-1' },
        })

        // Verifica chamada à API
        expect(mockFetch).toHaveBeenCalledWith('https://elev8.uazapi.com/instance/all', {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                admintoken: 'admin-token',
            },
            cache: 'no-store',
        })

        // Verifica merge dos dados (retorna dados da API, não do banco)
        expect(result).toEqual([
            {
                id: 'inst-1',
                instanceId: 'inst-1',
                label: 'Linha Principal',
                phone: '5561999999999',
                status: 'connected', // Veio da API
                connected: true,     // Veio da API
                loggedIn: true,      // Veio da API
                qrcode: 'qr',
                paircode: '1234',
                createdAt: null,
                updatedAt: null,
            },
        ])
    })

    it('retorna instâncias do banco mesmo se API falhar', async () => {
        // 1. Mock do Banco
        const dbInstances = [
            {
                id: 'db-id-1',
                organizationId: 'org-1',
                instanceId: 'inst-1',
                phone: '5561999999999',
                label: 'Linha Principal',
                status: 'disconnected',
                connected: false,
                loggedIn: false,
                createdAt: new Date('2025-01-01T10:00:00Z'),
                updatedAt: new Date('2025-01-01T10:00:00Z'),
            },
        ]
        vi.mocked(prisma.whatsappInstance.findMany).mockResolvedValue(dbInstances as unknown as WhatsappInstance[])

        // 2. Mock da API (Erro)
        mockFetch.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }))

        const result = await listWhatsappInstances('org-1')

        // Quando a API falha, a implementação atual retorna array vazio
        expect(result).toHaveLength(0)
    })

    it('retorna array vazio se não houver instâncias no banco', async () => {
        vi.mocked(prisma.whatsappInstance.findMany).mockResolvedValue([])

        const result = await listWhatsappInstances('org-1')

        expect(result).toEqual([])
        // Não deve chamar API se não tem instâncias no banco (otimização)
        expect(mockFetch).not.toHaveBeenCalled()
    })
})
