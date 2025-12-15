import { prisma } from '@/lib/prisma'
import { getWuzapiConfig } from './config'

type WuzapiContact = {
  BusinessName: string
  FirstName: string
  Found: boolean
  FullName: string
  PushName: string
}

type WuzapiContactsResponse = {
  code: number
  data: Record<string, WuzapiContact>
  success: boolean
}

type SyncContactsParams = {
  organizationId: string
  instanceId: string
  token: string
}

type SyncContactsResult = {
  success: boolean
  contactsCreated: number
  contactsUpdated: number
  conversationsCreated: number
  error?: string
}

/**
 * Sincroniza contatos da WUZAPI com o banco de dados local
 * 
 * Endpoint WUZAPI: GET /user/contacts
 * Header: token: {userToken}
 * 
 * Fluxo:
 * 1. Busca contatos da WUZAPI
 * 2. Para cada contato, cria/atualiza Lead
 * 3. Para cada Lead, cria Conversation (se não existir)
 */
export async function syncWuzapiContacts({
  organizationId,
  instanceId,
  token,
}: SyncContactsParams): Promise<SyncContactsResult> {
  const { baseUrl } = getWuzapiConfig()

  console.log('[wuzapi] Iniciando sincronização de contatos', { organizationId, instanceId })

  try {
    // 1. Buscar contatos da WUZAPI
    const response = await fetch(`${baseUrl}/user/contacts`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        token,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[wuzapi] Erro ao buscar contatos:', response.status, errorText)
      return {
        success: false,
        contactsCreated: 0,
        contactsUpdated: 0,
        conversationsCreated: 0,
        error: `Falha ao buscar contatos: ${response.status}`,
      }
    }

    const payload: WuzapiContactsResponse = await response.json()
    
    if (!payload.success || !payload.data) {
      return {
        success: false,
        contactsCreated: 0,
        contactsUpdated: 0,
        conversationsCreated: 0,
        error: 'Resposta inválida da WUZAPI',
      }
    }

    const contacts = Object.entries(payload.data)
    console.log(`[wuzapi] ${contacts.length} contatos encontrados`)

    let contactsCreated = 0
    let contactsUpdated = 0
    let conversationsCreated = 0

    // 2. Processar cada contato
    for (const [jid, contact] of contacts) {
      // Ignorar grupos (terminam com @g.us)
      if (jid.endsWith('@g.us')) {
        continue
      }

      // Extrair telefone do JID (ex: 5511999999999@s.whatsapp.net -> +5511999999999)
      const phone = extractPhoneFromJid(jid)
      if (!phone) {
        continue
      }

      // Determinar nome do contato
      const name = contact.PushName || contact.FullName || contact.FirstName || contact.BusinessName || phone

      try {
        // 3. Upsert Lead
        const existingLead = await prisma.lead.findFirst({
          where: {
            organizationId,
            OR: [
              { remoteJid: jid },
              { phone },
            ],
          },
        })

        let lead
        if (existingLead) {
          // Atualizar se nome mudou
          if (existingLead.name !== name) {
            lead = await prisma.lead.update({
              where: { id: existingLead.id },
              data: { name, remoteJid: jid },
            })
            contactsUpdated++
          } else {
            lead = existingLead
          }
        } else {
          // Criar novo Lead
          lead = await prisma.lead.create({
            data: {
              organizationId,
              name,
              phone,
              remoteJid: jid,
              firstSource: 'WHATSAPP',
              status: 'new',
            },
          })
          contactsCreated++
        }

        // 4. Criar Conversation se não existir (usando unique composto)
        const existingConversation = await prisma.conversation.findFirst({
          where: {
            leadId: lead.id,
            instanceId,
          },
        })

        if (!existingConversation) {
          await prisma.conversation.create({
            data: {
              organizationId,
              leadId: lead.id,
              instanceId,
              status: 'OPEN',
            },
          })
          conversationsCreated++
        }
      } catch (contactError) {
        console.error(`[wuzapi] Erro ao processar contato ${jid}:`, contactError)
        // Continua com próximo contato
      }
    }

    console.log('[wuzapi] Sincronização concluída', {
      contactsCreated,
      contactsUpdated,
      conversationsCreated,
    })

    return {
      success: true,
      contactsCreated,
      contactsUpdated,
      conversationsCreated,
    }
  } catch (error) {
    console.error('[wuzapi] Erro na sincronização de contatos:', error)
    return {
      success: false,
      contactsCreated: 0,
      contactsUpdated: 0,
      conversationsCreated: 0,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Extrai número de telefone do JID do WhatsApp
 * Ex: 5511999999999@s.whatsapp.net -> +5511999999999
 */
function extractPhoneFromJid(jid: string): string | null {
  const match = jid.match(/^(\d+)@/)
  if (!match || !match[1]) {
    return null
  }
  return `+${match[1]}`
}
