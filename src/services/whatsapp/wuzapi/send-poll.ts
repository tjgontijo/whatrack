import { prisma } from '@/lib/prisma'
import { getWuzapiConfig } from './config'

type SendWuzapiPollParams = {
  organizationId: string
  instanceId: string
  groupId: string // Group JID (ex: 120363312246943103@g.us)
  question: string
  options: string[]
  selectableCount?: number // Max options user can select (default: 1)
}

type SendPollResult = {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia enquete para grupo via WuzAPI
 *
 * Endpoint WuzAPI: POST /chat/send/poll
 * Header: token: {userToken}
 * NOTA: Enquetes só funcionam em grupos!
 */
export async function sendWuzapiPoll({
  organizationId,
  instanceId,
  groupId,
  question,
  options,
  selectableCount = 1,
}: SendWuzapiPollParams): Promise<SendPollResult> {
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

  if (options.length < 2) {
    return { success: false, error: 'Enquete precisa de pelo menos 2 opções' }
  }

  if (options.length > 12) {
    return { success: false, error: 'Enquete pode ter no máximo 12 opções' }
  }

  const { baseUrl } = getWuzapiConfig()

  const payload = {
    Group: groupId,
    Question: question,
    Options: options,
    SelectableCount: selectableCount,
  }

  console.log('[wuzapi] Sending poll to group:', groupId)

  try {
    const response = await fetch(`${baseUrl}/chat/send/poll`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: instance.token,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    console.log('[wuzapi] POST /chat/send/poll response:', response.status)

    if (!response.ok) {
      let errorMsg = 'Falha ao enviar enquete'
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
    console.error('[wuzapi] Erro ao enviar enquete:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
