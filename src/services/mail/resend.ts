// src/lib/mail/resend.ts
import { Resend } from 'resend'
import { requireEnv } from '@/lib/env/require-env.server'
import { EmailPayload, EmailResponse, EmailProvider } from './types'

const RESEND_API_KEY = requireEnv('RESEND_API_KEY')
const RESEND_FROM = requireEnv('RESEND_FROM')
const APP_NAME = requireEnv('APP_NAME')

function resolveFromHeader(from: string, appName: string): string {
  if (from.includes('<') && from.includes('>')) {
    return from
  }
  return `${appName} <${from}>`
}

const RESEND_FROM_HEADER = resolveFromHeader(RESEND_FROM, APP_NAME)

class ResendProvider implements EmailProvider {
  private client: Resend = new Resend(RESEND_API_KEY)

  isConfigured(): boolean {
    return true
  }

  async send(payload: EmailPayload): Promise<EmailResponse> {
    try {
      const { data, error } = await this.client.emails.send({
        from: RESEND_FROM_HEADER,
        to: payload.to,
        subject: payload.subject,
        html: payload.html || '',
        text: payload.text,
      })

      if (error) {
        throw new Error(`Erro Resend: ${error.message}`)
      }

      return {
        success: true,
        messageId: data?.id,
        provider: 'resend',
      }
    } catch (error) {
      console.error('[Resend] Erro ao enviar email:', error)
      return {
        success: false,
        provider: 'resend',
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }
}

// Exportar uma instância única
export const resendProvider = new ResendProvider()
