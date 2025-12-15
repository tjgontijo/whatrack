import { prisma } from '@/lib/prisma'
import { normalizeForWuzapi } from '@/lib/mask/phone-mask'
import { getWuzapiConfig } from './config'

type ButtonType = 'quickreply' | 'url' | 'call'

type Button = {
  text: string
  type?: ButtonType
  url?: string
  phoneNumber?: string
}

type SendWuzapiButtonsParams = {
  organizationId: string
  instanceId: string
  phone: string
  title: string
  body: string
  footer?: string
  buttons: Button[]
}

type SendButtonsResult = {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia mensagem com botões via WuzAPI
 *
 * Endpoint WuzAPI: POST /chat/send/buttons
 * Header: token: {userToken}
 * NOTA: Botões podem não funcionar em todas as versões do WhatsApp
 */
export async function sendWuzapiButtons({
  organizationId,
  instanceId,
  phone,
  title,
  body,
  footer,
  buttons,
}: SendWuzapiButtonsParams): Promise<SendButtonsResult> {
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

  if (buttons.length < 1 || buttons.length > 3) {
    return { success: false, error: 'Deve ter entre 1 e 3 botões' }
  }

  const { baseUrl } = getWuzapiConfig()
  const formattedPhone = normalizeForWuzapi(phone)

  const payload: Record<string, unknown> = {
    Phone: formattedPhone,
    Title: title,
    Body: body,
    Buttons: buttons.map((btn) => {
      const buttonObj: Record<string, string> = {
        DisplayText: btn.text,
        Type: btn.type || 'quickreply',
      }
      if (btn.type === 'url' && btn.url) {
        buttonObj.Url = btn.url
      }
      if (btn.type === 'call' && btn.phoneNumber) {
        buttonObj.PhoneNumber = btn.phoneNumber
      }
      return buttonObj
    }),
  }

  if (footer) {
    payload.Footer = footer
  }

  console.log('[wuzapi] Sending buttons to:', formattedPhone)

  try {
    const response = await fetch(`${baseUrl}/chat/send/buttons`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: instance.token,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    console.log('[wuzapi] POST /chat/send/buttons response:', response.status)

    if (!response.ok) {
      let errorMsg = 'Falha ao enviar botões'
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
    console.error('[wuzapi] Erro ao enviar botões:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
