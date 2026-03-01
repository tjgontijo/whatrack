import { performance } from 'node:perf_hooks'

import { prisma } from '@/lib/db/prisma'
import { resendProvider } from '@/services/mail/resend'
import { getEmailTemplate } from './get-email'
import { AuthDeliveryPayload, AuthDeliveryResult } from './types'
import { logger } from '@/lib/utils/logger'

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

    logger.info({ context: { email: maskedEmail, type, timestamp: new Date().toISOString() } }, '[auth_delivery] start')

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
        logger.error({ err: { email: maskedEmail } }, '[AuthDeliveryService] Usuário não encontrado')
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
      logger.error({ err: error }, '[AuthDeliveryService] Erro ao enviar mensagem de autenticação')
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

      logger.info({ context: log }, '[auth_delivery] timings')
    }
  }
}

export const authDeliveryService = new AuthDeliveryService()
