import { prisma } from '@/lib/prisma'
import { getMetaCloudConfig } from './config'

type SendMetaCloudMessageParams = {
  organizationId: string
  to: string
  text: string
}

type SendMessageResult = {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia mensagem de texto via Meta Cloud API
 *
 * Usa o token do cliente (organizacao) para enviar em nome dele
 */
export async function sendMetaCloudMessage({
  organizationId,
  to,
  text,
}: SendMetaCloudMessageParams): Promise<SendMessageResult> {
  const credential = await prisma.metaWhatsAppCredential.findUnique({
    where: { organizationId },
  })

  if (!credential) {
    return { success: false, error: 'WhatsApp Business not connected' }
  }

  if (!credential.isActive) {
    return { success: false, error: 'WhatsApp Business credential is inactive' }
  }

  const { graphApiUrl } = getMetaCloudConfig()

  // Formata numero (remove caracteres nao numericos)
  const formattedTo = to.replace(/\D/g, '')

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedTo,
    type: 'text',
    text: { body: text },
  }

  try {
    const response = await fetch(
      `${graphApiUrl}/${credential.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credential.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('[meta-cloud] Falha ao enviar mensagem:', data)
      return {
        success: false,
        error: data.error?.message || `Falha ao enviar: ${response.status}`,
      }
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    }
  } catch (error) {
    console.error('[meta-cloud] Erro ao enviar mensagem:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

type SendTemplateMessageParams = {
  organizationId: string
  to: string
  templateName: string
  languageCode: string
  components?: TemplateComponent[]
}

type TemplateComponent = {
  type: 'header' | 'body' | 'button'
  parameters: TemplateParameter[]
}

type TemplateParameter = {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video'
  text?: string
  image?: { link: string }
  document?: { link: string; filename?: string }
  video?: { link: string }
}

/**
 * Envia mensagem de template via Meta Cloud API
 */
export async function sendMetaCloudTemplate({
  organizationId,
  to,
  templateName,
  languageCode,
  components,
}: SendTemplateMessageParams): Promise<SendMessageResult> {
  const credential = await prisma.metaWhatsAppCredential.findUnique({
    where: { organizationId },
  })

  if (!credential) {
    return { success: false, error: 'WhatsApp Business not connected' }
  }

  if (!credential.isActive) {
    return { success: false, error: 'WhatsApp Business credential is inactive' }
  }

  const { graphApiUrl } = getMetaCloudConfig()

  const formattedTo = to.replace(/\D/g, '')

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedTo,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  }

  try {
    const response = await fetch(
      `${graphApiUrl}/${credential.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credential.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('[meta-cloud] Falha ao enviar template:', data)
      return {
        success: false,
        error: data.error?.message || `Falha ao enviar: ${response.status}`,
      }
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    }
  } catch (error) {
    console.error('[meta-cloud] Erro ao enviar template:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
