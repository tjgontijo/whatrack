import { prisma } from '@/lib/prisma'
import { normalizeForWuzapi } from '@/lib/mask/phone-mask'
import { getWuzapiConfig } from './config'

type SendWuzapiContactParams = {
  organizationId: string
  instanceId: string
  phone: string
  contactName: string
  contactPhone: string
}

type SendContactResult = {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Gera vCard para contato
 */
function generateVCard(name: string, phone: string): string {
  const formattedPhone = phone.replace(/\D/g, '')
  return `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;type=CELL:+${formattedPhone}
END:VCARD`
}

/**
 * Envia contato via WuzAPI
 *
 * Endpoint WuzAPI: POST /chat/send/contact
 * Header: token: {userToken}
 * Formato: vCard
 */
export async function sendWuzapiContact({
  organizationId,
  instanceId,
  phone,
  contactName,
  contactPhone,
}: SendWuzapiContactParams): Promise<SendContactResult> {
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
  const vcard = generateVCard(contactName, contactPhone)

  const payload = {
    Phone: formattedPhone,
    Name: contactName,
    Vcard: vcard,
  }

  console.log('[wuzapi] Sending contact to:', formattedPhone)

  try {
    const response = await fetch(`${baseUrl}/chat/send/contact`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: instance.token,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    console.log('[wuzapi] POST /chat/send/contact response:', response.status)

    if (!response.ok) {
      let errorMsg = 'Falha ao enviar contato'
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
    console.error('[wuzapi] Erro ao enviar contato:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
