import { prisma } from '@/lib/prisma'
import { normalizeForWuzapi } from '@/lib/mask/phone-mask'
import { getWuzapiConfig } from './config'

type SendWuzapiStickerParams = {
  organizationId: string
  instanceId: string
  phone: string
  sticker: string // base64 data URL (webp or mp4)
}

type SendStickerResult = {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia sticker via WuzAPI
 *
 * Endpoint WuzAPI: POST /chat/send/sticker
 * Header: token: {userToken}
 * Formato: image/webp ou video/mp4
 */
export async function sendWuzapiSticker({
  organizationId,
  instanceId,
  phone,
  sticker,
}: SendWuzapiStickerParams): Promise<SendStickerResult> {
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
    Sticker: sticker,
  }

  console.log('[wuzapi] Sending sticker to:', formattedPhone)

  try {
    const response = await fetch(`${baseUrl}/chat/send/sticker`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: instance.token,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    console.log('[wuzapi] POST /chat/send/sticker response:', response.status)

    if (!response.ok) {
      let errorMsg = 'Falha ao enviar sticker'
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
    console.error('[wuzapi] Erro ao enviar sticker:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
