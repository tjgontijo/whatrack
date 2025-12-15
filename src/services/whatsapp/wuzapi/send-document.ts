import { prisma } from '@/lib/prisma'
import { normalizeForWuzapi } from '@/lib/mask/phone-mask'
import { getWuzapiConfig } from './config'

type SendWuzapiDocumentParams = {
  organizationId: string
  instanceId: string
  phone: string
  document: string // base64 data URL
  filename?: string
  caption?: string
}

type SendDocumentResult = {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia documento via WuzAPI
 *
 * Endpoint WuzAPI: POST /chat/send/document
 * Header: token: {userToken}
 * Formato: qualquer arquivo (application/octet-stream)
 */
export async function sendWuzapiDocument({
  organizationId,
  instanceId,
  phone,
  document,
  filename,
  caption,
}: SendWuzapiDocumentParams): Promise<SendDocumentResult> {
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
    Document: document,
  }

  if (filename) {
    payload.FileName = filename
  }

  if (caption) {
    payload.Caption = caption
  }

  console.log('[wuzapi] Sending document to:', formattedPhone, filename)

  try {
    const response = await fetch(`${baseUrl}/chat/send/document`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: instance.token,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    console.log('[wuzapi] POST /chat/send/document response:', response.status)

    if (!response.ok) {
      let errorMsg = 'Falha ao enviar documento'
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
    console.error('[wuzapi] Erro ao enviar documento:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
