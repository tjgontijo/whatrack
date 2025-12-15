import { prisma } from '@/lib/prisma'
import { normalizeForWuzapi } from '@/lib/mask/phone-mask'
import { getWuzapiConfig } from './config'

type SendWuzapiMessageParams = {
  organizationId: string
  instanceId: string
  phone: string
  message: string
}

type SendMessageResult = {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia mensagem de texto via WuzAPI
 *
 * Endpoint WuzAPI: POST /chat/send/text
 * Header: token: {userToken}
 */
export async function sendWuzapiMessage({
  organizationId,
  instanceId,
  phone,
  message,
}: SendWuzapiMessageParams): Promise<SendMessageResult> {
  const instance = await prisma.whatsappInstance.findUnique({
    where: {
      organizationId_instanceId: {
        organizationId,
        instanceId,
      },
    },
  })

  if (!instance) {
    return { success: false, error: 'Instancia nao encontrada' }
  }

  if (!instance.token) {
    return { success: false, error: 'Token da instancia nao encontrado' }
  }

  const { baseUrl } = getWuzapiConfig()

  // Normaliza telefone para WuzAPI (remove nono dígito, adiciona 55)
  const formattedPhone = normalizeForWuzapi(phone)

  const payload = {
    Phone: formattedPhone,
    Body: message,
  }

  console.log('[wuzapi] Sending message to:', formattedPhone)

  try {
    const response = await fetch(`${baseUrl}/chat/send/text`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: instance.token,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    console.log('[wuzapi] POST /chat/send/text response:', response.status, text)

    if (!response.ok) {
      // Tenta extrair mensagem de erro do WuzAPI
      let errorMsg = 'Falha ao enviar mensagem'
      try {
        const errorData = JSON.parse(text)
        if (errorData.error) {
          // Traduz erros comuns
          if (errorData.error.includes('no LID found')) {
            errorMsg = 'Número não encontrado no WhatsApp. Verifique se o número está correto.'
          } else if (errorData.error.includes('not connected')) {
            errorMsg = 'WhatsApp não conectado. Reconecte a instância.'
          } else {
            errorMsg = errorData.error
          }
        }
      } catch {
        // Ignora erro de parse
      }
      return { success: false, error: errorMsg }
    }

    const data = JSON.parse(text)

    return {
      success: true,
      messageId: data.data?.Id || data.data?.id,
    }
  } catch (error) {
    console.error('[wuzapi] Erro ao enviar mensagem:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
