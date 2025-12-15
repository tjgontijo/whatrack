import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isWhatsAppNumberValid } from '../check'

const mockFetch = vi.fn()
global.fetch = mockFetch as typeof global.fetch

describe('isWhatsAppNumberValid', () => {
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

    it('deve retornar true para número válido no WhatsApp', async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(
                JSON.stringify([
                    {
                        query: '5511999999999',
                        isInWhatsapp: true,
                        jid: '5511999999999@s.whatsapp.net',
                    },
                ]),
                { status: 200 }
            )
        )

        const result = await isWhatsAppNumberValid('5511999999999')

        expect(mockFetch).toHaveBeenCalledWith('https://api.uazapi.com/chat/check', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                token: 'admin-token',
            },
            body: JSON.stringify({
                numbers: ['5511999999999'],
            }),
        })

        expect(result).toBe(true)
    })

    it('deve retornar false para número inválido no WhatsApp', async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(
                JSON.stringify([
                    {
                        query: '5511999999999',
                        isInWhatsapp: false,
                    },
                ]),
                { status: 200 }
            )
        )

        const result = await isWhatsAppNumberValid('5511999999999')
        expect(result).toBe(false)
    })

    it('deve retornar false se a API retornar erro', async () => {
        mockFetch.mockResolvedValueOnce(
            new Response('Erro interno', { status: 500 })
        )

        const result = await isWhatsAppNumberValid('5511999999999')
        expect(result).toBe(false)
    })

    it('deve retornar false se ocorrer erro de rede', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Falha na rede'))

        const result = await isWhatsAppNumberValid('5511999999999')
        expect(result).toBe(false)
    })

    it('deve lançar erro se configuração estiver ausente', async () => {
        delete process.env.UAZAPI_BASE_URL

        await expect(
            isWhatsAppNumberValid('5511999999999')
        ).rejects.toThrow('UAZAPI_BASE_URL is not configured')
    })
})
