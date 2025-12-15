import { prisma } from '@/lib/prisma'
import { normalizeForWuzapi } from '@/lib/mask/phone-mask'
import { getWuzapiConfig } from './config'

type SendWuzapiAudioParams = {
  organizationId: string
  instanceId: string
  phone: string
  audio: string // base64 data URL (opus/ogg format)
}

type SendAudioResult = {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia áudio via WuzAPI
 *
 * Endpoint WuzAPI: POST /chat/send/audio
 * Header: token: {userToken}
 * Formato: audio/ogg (opus codec)
 */
export async function sendWuzapiAudio({
  organizationId,
  instanceId,
  phone,
  audio,
}: SendWuzapiAudioParams): Promise<SendAudioResult> {
  const instance = await prisma.whatsappInstance.findUnique({
    where: {
      organizationId_instanceId: {
        organizationId,
        instanceId,
      },
    },
  })

  if (!instance) {
    return { success: false, error: 'Instância não encontrada' }
  }

  if (!instance.token) {
    return { success: false, error: 'Token da instância não encontrado' }
  }

  const { baseUrl } = getWuzapiConfig()
  const formattedPhone = normalizeForWuzapi(phone)

  const payload = {
    Phone: formattedPhone,
    Audio: audio,
  }

  console.log('[wuzapi] Sending audio to:', formattedPhone)

  try {
    const response = await fetch(`${baseUrl}/chat/send/audio`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: instance.token,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    console.log('[wuzapi] POST /chat/send/audio response:', response.status)

    if (!response.ok) {
      let errorMsg = 'Falha ao enviar áudio'
      try {
        const errorData = JSON.parse(text)
        if (errorData.error) {
          errorMsg = errorData.error
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
    console.error('[wuzapi] Erro ao enviar áudio:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
