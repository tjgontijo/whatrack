import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendTextMessage } from '../send-message'

const mockFetch = vi.fn()
global.fetch = mockFetch as typeof global.fetch

describe('sendTextMessage', () => {
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

    it('deve enviar mensagem com sucesso', async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ status: true, message: 'Mensagem enviada' }), {
                status: 200,
            })
        )

        const result = await sendTextMessage({
            phone: '5511999999999',
            message: 'Olá, teste!',
        })

        expect(mockFetch).toHaveBeenCalledWith('https://api.uazapi.com/send/text', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                token: 'admin-token',
            },
            body: JSON.stringify({
                number: '5511999999999',
                text: 'Olá, teste!',
            }),
        })

        expect(result).toEqual({
            status: true,
            message: 'Mensagem enviada com sucesso',
        })
    })

    it('deve retornar erro quando a API falha', async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ message: 'Número inválido' }), {
                status: 400,
            })
        )

        const result = await sendTextMessage({
            phone: '123',
            message: 'Teste',
        })

        expect(result).toEqual({
            status: false,
            error: 'Número inválido',
        })
    })

    it('deve retornar erro genérico quando a API falha sem mensagem', async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({}), {
                status: 500,
            })
        )

        const result = await sendTextMessage({
            phone: '5511999999999',
            message: 'Teste',
        })

        expect(result).toEqual({
            status: false,
            error: 'Erro ao enviar mensagem',
        })
    })

    it('deve tratar exceções de rede', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Falha na rede'))

        const result = await sendTextMessage({
            phone: '5511999999999',
            message: 'Teste',
        })

        expect(result).toEqual({
            status: false,
            error: 'Falha na rede',
        })
    })

    it('deve lançar erro se configuração estiver ausente', async () => {
        delete process.env.UAZAPI_BASE_URL

        await expect(
            sendTextMessage({
                phone: '5511999999999',
                message: 'Teste',
            })
        ).rejects.toThrow('UAZAPI_BASE_URL is not configured')
    })
})
