import type { WhatsappInstance } from '@prisma/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { createWhatsappInstance } from '../create-instance'
import { prisma } from '@/lib/prisma'

const mockFetch = vi.fn()

global.fetch = mockFetch as typeof global.fetch

vi.mock('@/lib/prisma', () => ({
    prisma: {
        whatsappInstance: {
            upsert: vi.fn(),
        },
    },
}))

describe('createWhatsappInstance', () => {
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

    it('chama a API externa, persiste e retorna a instância normalizada', async () => {
        const apiPayload = {
            connected: false,
            loggedIn: false,
            jid: null,
            instance: {
                id: 'inst-123',
                token: 'abc123',
                status: 'pending',
                paircode: '1234-5678',
                qrcode: 'data:image/png;base64,...',
                name: 'Instância Principal',
                profileName: 'Loja ABC',
                profilePicUrl: 'https://example.com/profile.jpg',
                isBusiness: true,
                plataform: 'Android',
                systemName: 'uazapi',
                owner: 'user@example.com',
                lastDisconnect: '2025-01-24T14:00:00Z',
                lastDisconnectReason: 'Network error',
                created: '2025-01-24T14:00:00Z',
                updated: '2025-01-24T14:30:00Z',
                delayMin: 2,
                delayMax: 4,
                chatbot_enabled: true,
                chatbot_ignoreGroups: true,
                chatbot_stopConversation: 'parar',
                chatbot_stopMinutes: 60,
            },
        }

        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify(apiPayload), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        )

        const persistedInstance: WhatsappInstance = {
            id: 'db-id',
            organizationId: 'org-1',
            instanceId: 'inst-123',
            phone: '5561999999999',
            label: 'Principal',
            token: 'abc123',
            status: 'pending',
            connected: false,
            loggedIn: false,
            jid: null,
            instanceName: null,
            profileName: null,
            profilePicUrl: null,
            owner: null,
            isBusiness: null,
            platform: null,
            systemName: null,
            qrcode: null,
            paircode: null,
            lastDisconnect: null,
            lastDisconnectReason: null,
            delayMin: null,
            delayMax: null,
            chatbotEnabled: null,
            chatbotIgnoreGroups: null,
            chatbotStopConversation: null,
            chatbotStopMinutes: null,
            metadata: null,
            createdAt: new Date('2025-01-24T14:00:00Z'),
            updatedAt: new Date('2025-01-24T14:30:00Z'),
        }

        vi.mocked(prisma.whatsappInstance.upsert).mockResolvedValue(persistedInstance)

        const result = await createWhatsappInstance({
            organizationId: 'org-1',
            phone: '5561999999999',
            name: 'Principal',
        })

        expect(mockFetch).toHaveBeenCalledWith('https://elev8.uazapi.com/instance/init', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                admintoken: 'admin-token',
            },
            body: expect.stringContaining('"name":"Principal"'),
        })

        expect(prisma.whatsappInstance.upsert).toHaveBeenCalledWith({
            where: { organizationId_instanceId: { organizationId: 'org-1', instanceId: 'inst-123' } },
            create: {
                organizationId: 'org-1',
                instanceId: 'inst-123',
                phone: '5561999999999',
                label: 'Principal',
                token: 'abc123',
            },
            update: {
                label: 'Principal',
                phone: '5561999999999',
                token: 'abc123',
            },
        })

        // A função retorna um objeto simplificado, não o persistedInstance completo
        expect(result).toMatchObject({
            id: 'inst-123',
            instanceId: 'inst-123',
            label: expect.any(String),
            phone: '5561999999999',
            status: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
        })
    })

    it('deve tratar erro quando response.json() falha ao ler erro da API', async () => {
        // API retorna erro com body inválido (não-JSON)
        mockFetch.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }))

        await expect(
            createWhatsappInstance({
                organizationId: 'org-1',
                phone: '5561999999999',
                name: 'Test',
            })
        ).rejects.toThrow('Falha ao criar instância: 500')
    })

    it('deve lançar erro quando payload não tem instance.id', async () => {
        // API retorna 200 mas sem instance.id
        mockFetch.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    connected: false,
                    loggedIn: false,
                    instance: {}, // Sem 'id'
                }),
                { status: 200 }
            )
        )

        await expect(
            createWhatsappInstance({
                organizationId: 'org-1',
                phone: '5561999999999',
                name: 'Test',
            })
        ).rejects.toThrow('Resposta inválida da UAZApi - instance id ausente')
    })

    it('deve tratar erro quando errorPayload.message não é string', async () => {
        // API retorna erro com message como number
        mockFetch.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    message: 12345, // Não é string
                }),
                { status: 400 }
            )
        )

        await expect(
            createWhatsappInstance({
                organizationId: 'org-1',
                phone: '5561999999999',
                name: 'Test',
            })
        ).rejects.toThrow('Falha ao criar instância: 400')
    })
})
