import { prisma } from '@/lib/prisma'
import { normalizeForWuzapi } from '@/lib/mask/phone-mask'
import { getWuzapiConfig } from './config'

type ListItem = {
  rowId: string
  title: string
  desc?: string
}

type SendWuzapiListParams = {
  organizationId: string
  instanceId: string
  phone: string
  topText: string
  desc: string
  footerText?: string
  buttonText: string
  list: ListItem[]
}

type SendListResult = {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia mensagem com lista via WuzAPI
 *
 * Endpoint WuzAPI: POST /chat/send/list
 * Header: token: {userToken}
 * NOTA: Listas podem não funcionar em todas as versões do WhatsApp
 */
export async function sendWuzapiList({
  organizationId,
  instanceId,
  phone,
  topText,
  desc,
  footerText,
  buttonText,
  list,
}: SendWuzapiListParams): Promise<SendListResult> {
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

  if (list.length < 1) {
    return { success: false, error: 'Deve ter pelo menos 1 item na lista' }
  }

  const { baseUrl } = getWuzapiConfig()
  const formattedPhone = normalizeForWuzapi(phone)

  const payload: Record<string, unknown> = {
    Phone: formattedPhone,
    TopText: topText,
    Desc: desc,
    ButtonText: buttonText,
    List: list.map((item) => ({
      title: item.title,
      desc: item.desc || '',
      RowId: item.rowId,
    })),
  }

  if (footerText) {
    payload.FooterText = footerText
  }

  console.log('[wuzapi] Sending list to:', formattedPhone)

  try {
    const response = await fetch(`${baseUrl}/chat/send/list`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: instance.token,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    console.log('[wuzapi] POST /chat/send/list response:', response.status)

    if (!response.ok) {
      let errorMsg = 'Falha ao enviar lista'
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
    console.error('[wuzapi] Erro ao enviar lista:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
