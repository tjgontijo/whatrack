import { prisma } from '@/lib/prisma'
import { normalizeForWuzapi } from '@/lib/mask/phone-mask'
import { getWuzapiConfig } from './config'

type SendWuzapiLocationParams = {
  organizationId: string
  instanceId: string
  phone: string
  latitude: number
  longitude: number
  name?: string
}

type SendLocationResult = {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia localização via WuzAPI
 *
 * Endpoint WuzAPI: POST /chat/send/location
 * Header: token: {userToken}
 */
export async function sendWuzapiLocation({
  organizationId,
  instanceId,
  phone,
  latitude,
  longitude,
  name,
}: SendWuzapiLocationParams): Promise<SendLocationResult> {
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
    Latitude: latitude,
    Longitude: longitude,
  }

  if (name) {
    payload.Name = name
  }

  console.log('[wuzapi] Sending location to:', formattedPhone, `(${latitude}, ${longitude})`)

  try {
    const response = await fetch(`${baseUrl}/chat/send/location`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: instance.token,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    console.log('[wuzapi] POST /chat/send/location response:', response.status, text)

    if (!response.ok) {
      let errorMsg = 'Falha ao enviar localização'
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
    console.error('[wuzapi] Erro ao enviar localização:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
