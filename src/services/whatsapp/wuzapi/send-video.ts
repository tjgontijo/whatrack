import { prisma } from '@/lib/prisma'
import { normalizeForWuzapi } from '@/lib/mask/phone-mask'
import { getWuzapiConfig } from './config'

type SendWuzapiVideoParams = {
  organizationId: string
  instanceId: string
  phone: string
  video: string // base64 data URL (mp4/3gpp format, H.264 codec)
  caption?: string
}

type SendVideoResult = {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia vídeo via WuzAPI
 *
 * Endpoint WuzAPI: POST /chat/send/video
 * Header: token: {userToken}
 * Formato: video/mp4 ou video/3gpp (H.264 + AAC)
 */
export async function sendWuzapiVideo({
  organizationId,
  instanceId,
  phone,
  video,
  caption,
}: SendWuzapiVideoParams): Promise<SendVideoResult> {
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

  const payload: Record<string, unknown> = {
    Phone: formattedPhone,
    Video: video,
  }

  if (caption) {
    payload.Caption = caption
  }

  console.log('[wuzapi] Sending video to:', formattedPhone)

  try {
    const response = await fetch(`${baseUrl}/chat/send/video`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: instance.token,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    console.log('[wuzapi] POST /chat/send/video response:', response.status)

    if (!response.ok) {
      let errorMsg = 'Falha ao enviar vídeo'
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
    console.error('[wuzapi] Erro ao enviar vídeo:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
