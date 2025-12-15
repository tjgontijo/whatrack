import { prisma } from '@/lib/prisma'
import { normalizeForWuzapi } from '@/lib/mask/phone-mask'
import { getWuzapiConfig } from './config'

type SendWuzapiImageParams = {
  organizationId: string
  instanceId: string
  phone: string
  image: string // base64 data URL
  caption?: string
}

type SendImageResult = {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia imagem via WuzAPI
 *
 * Endpoint WuzAPI: POST /chat/send/image
 * Header: token: {userToken}
 */
export async function sendWuzapiImage({
  organizationId,
  instanceId,
  phone,
  image,
  caption,
}: SendWuzapiImageParams): Promise<SendImageResult> {
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

  const payload: Record<string, unknown> = {
    Phone: formattedPhone,
    Image: image,
  }

  if (caption) {
    payload.Caption = caption
  }

  console.log('[wuzapi] Sending image to:', formattedPhone)

  try {
    const response = await fetch(`${baseUrl}/chat/send/image`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: instance.token,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    console.log('[wuzapi] POST /chat/send/image response:', response.status, text.slice(0, 200))

    if (!response.ok) {
      let errorMsg = 'Falha ao enviar imagem'
      try {
        const errorData = JSON.parse(text)
        if (errorData.error) {
          if (errorData.error.includes('not connected')) {
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
    console.error('[wuzapi] Erro ao enviar imagem:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
