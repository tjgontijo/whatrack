import { getUazapiConfig } from './config'

/**
 * UAZAPI - Envio de mensagens via WhatsApp
 * Documentação: https://docs.uazapi.com/endpoint/post/send~text
 */

interface SendTextMessageParams {
  phone: string // Número no formato internacional sem +, ex: 5511999999999
  message: string
}

interface UazapiResponse {
  status: boolean
  message?: string
  error?: string
}

/**
 * Envia mensagem de texto via UAZAPI
 * @param phone - Número do WhatsApp no formato internacional (ex: 5511999999999)
 * @param message - Texto da mensagem
 * @returns Promise com resposta da API
 */
export async function sendTextMessage({
  phone,
  message,
}: SendTextMessageParams): Promise<UazapiResponse> {
  const { baseUrl, adminToken } = getUazapiConfig()

  try {
    const response = await fetch(`${baseUrl}/send/text`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: adminToken,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Erro ao enviar mensagem via UAZAPI:', data)
      return {
        status: false,
        error: typeof data === 'object' && data !== null && 'message' in data
          ? String(data.message)
          : 'Erro ao enviar mensagem'
      }
    }

    return {
      status: true,
      message: 'Mensagem enviada com sucesso'
    }
  } catch (error) {
    console.error('Erro na requisição UAZAPI:', error)
    return {
      status: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

