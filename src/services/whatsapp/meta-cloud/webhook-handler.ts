import { prisma } from '@/lib/prisma'

// Tipos do webhook da Meta
type MetaWebhookPayload = {
  object: string
  entry: MetaWebhookEntry[]
}

type MetaWebhookEntry = {
  id: string
  changes: MetaWebhookChange[]
}

type MetaWebhookChange = {
  value: MetaWebhookValue
  field: string
}

type MetaWebhookValue = {
  messaging_product: string
  metadata: {
    display_phone_number: string
    phone_number_id: string
  }
  contacts?: MetaContact[]
  messages?: MetaMessage[]
  statuses?: MetaStatus[]
}

type MetaContact = {
  profile: { name: string }
  wa_id: string
}

type MetaMessage = {
  id: string
  from: string
  timestamp: string
  type: string
  text?: { body: string }
  image?: { id: string; mime_type: string; sha256: string; caption?: string }
  document?: { id: string; mime_type: string; sha256: string; filename?: string; caption?: string }
  audio?: { id: string; mime_type: string; sha256: string }
  video?: { id: string; mime_type: string; sha256: string; caption?: string }
  location?: { latitude: number; longitude: number; name?: string; address?: string }
  contacts?: MetaContactCard[]
  button?: { payload: string; text: string }
  interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string; description?: string } }
}

type MetaContactCard = {
  name: { formatted_name: string; first_name?: string; last_name?: string }
  phones?: { phone: string; type?: string }[]
}

type MetaStatus = {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  errors?: { code: number; title: string }[]
}

export type ProcessedMessage = {
  organizationId: string
  phoneNumberId: string
  messageId: string
  from: string
  timestamp: string
  type: string
  text?: string
  contact?: {
    name: string
    waId: string
  }
}

export type ProcessedStatus = {
  organizationId: string
  messageId: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipientId: string
  error?: { code: number; title: string }
}

type WebhookHandlerResult = {
  success: boolean
  messages: ProcessedMessage[]
  statuses: ProcessedStatus[]
  error?: string
}

/**
 * Processa webhook recebido da Meta
 *
 * Endpoint: POST /api/v1/whatsapp/meta-cloud/webhook
 */
export async function handleMetaWebhook(
  payload: MetaWebhookPayload
): Promise<WebhookHandlerResult> {
  const messages: ProcessedMessage[] = []
  const statuses: ProcessedStatus[] = []

  if (payload.object !== 'whatsapp_business_account') {
    return { success: false, messages, statuses, error: 'Invalid object type' }
  }

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue

      const value = change.value
      const phoneNumberId = value.metadata.phone_number_id

      // Encontra organizacao pelo phoneNumberId
      const credential = await prisma.metaWhatsAppCredential.findUnique({
        where: { phoneNumberId },
      })

      if (!credential || !credential.isActive) continue

      // Processa mensagens
      if (value.messages) {
        for (const msg of value.messages) {
          const contact = value.contacts?.[0]

          let text: string | undefined
          if (msg.type === 'text' && msg.text) {
            text = msg.text.body
          }

          messages.push({
            organizationId: credential.organizationId,
            phoneNumberId,
            messageId: msg.id,
            from: msg.from,
            timestamp: msg.timestamp,
            type: msg.type,
            text,
            contact: contact
              ? {
                  name: contact.profile.name,
                  waId: contact.wa_id,
                }
              : undefined,
          })
        }
      }

      // Processa status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          statuses.push({
            organizationId: credential.organizationId,
            messageId: status.id,
            status: status.status,
            timestamp: status.timestamp,
            recipientId: status.recipient_id,
            error: status.errors?.[0],
          })
        }
      }
    }
  }

  return { success: true, messages, statuses }
}
