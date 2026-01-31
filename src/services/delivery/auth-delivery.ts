import { performance } from 'node:perf_hooks'

import { prisma } from '@/lib/prisma'
import { resendProvider } from '@/services/mail/resend'
import { getEmailTemplate } from './get-email'
import { AuthDeliveryPayload, AuthDeliveryResult } from './types'

interface AuthDeliveryTimingLog {
  event: 'auth_delivery_timings'
  email: string
  type: AuthDeliveryPayload['type']
  timestamp: string
  durations: {
    findUserMs: number
    renderTemplateMs: number
    sendEmailMs: number
    totalMs: number
  }
  outcome: 'success' | 'failure'
  channel: AuthDeliveryResult['channel'] | 'pending'
  error?: string
}

const maskEmail = (email: string): string => email.replace(/(?<=.).(?=[^@]*?@)/g, '*')

class AuthDeliveryService {
  /**
   * Envia mensagem de autenticação via email
   */
  async send(payload: AuthDeliveryPayload): Promise<AuthDeliveryResult> {
    const { email, type, data } = payload
    const maskedEmail = maskEmail(email)
    const start = performance.now()
    let afterFind = start
    let afterTemplate = start
    let afterEmail = start
    let outcome: 'success' | 'failure' = 'success'
    let deliveredChannel: AuthDeliveryResult['channel'] | 'pending' = 'pending'
    let errorMessage: string | undefined

    console.info('[auth_delivery] start', {
      email: maskedEmail,
      type,
      timestamp: new Date().toISOString(),
    })

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
        },
      })
      afterFind = performance.now()

      if (!user) {
        outcome = 'failure'
        errorMessage = 'user_not_found'
        console.error('[AuthDeliveryService] Usuário não encontrado', { email: maskedEmail })
        return {
          success: false,
          channel: 'none',
          error: 'user_not_found',
        }
      }

      const displayName = user.name || 'Usuário'

      const template = await getEmailTemplate({
        type,
        name: displayName,
        data,
      })
      afterTemplate = performance.now()

      const emailResult = await resendProvider.send({
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      })
      afterEmail = performance.now()

      if (emailResult.success) {
        deliveredChannel = 'email'
        return {
          success: true,
          channel: 'email',
        }
      }

      outcome = 'failure'
      errorMessage = 'email_delivery_failed'
      return {
        success: false,
        channel: 'none',
        error: 'email_not_delivered',
      }
    } catch (error) {
      outcome = 'failure'
      errorMessage = error instanceof Error ? error.message : 'unknown_error'
      console.error('[AuthDeliveryService] Erro ao enviar mensagem de autenticação:', error)
      return {
        success: false,
        channel: 'none',
        error: errorMessage,
      }
    } finally {
      const end = performance.now()
      const log: AuthDeliveryTimingLog = {
        event: 'auth_delivery_timings',
        email: maskedEmail,
        type,
        timestamp: new Date().toISOString(),
        durations: {
          findUserMs: afterFind - start,
          renderTemplateMs: afterTemplate - afterFind,
          sendEmailMs: afterEmail - afterTemplate,
          totalMs: end - start,
        },
        outcome,
        channel: deliveredChannel,
        error: errorMessage,
      }

      console.info('[auth_delivery] timings', log)
    }
  }
}

export const authDeliveryService = new AuthDeliveryService()

