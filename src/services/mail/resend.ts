// src/lib/mail/resend.ts
import { Resend } from 'resend';
import { EmailPayload, EmailResponse, EmailProvider } from './types';

class ResendProvider implements EmailProvider {
  private client: Resend | null = null;
  
  constructor() {
    // Inicializar o cliente Resend se a chave API estiver disponível
    if (process.env.RESEND_API_KEY) {
      this.client = new Resend(process.env.RESEND_API_KEY);
    }
  }
  
  isConfigured(): boolean {
    return !!this.client && !!process.env.EMAIL_FROM;
  }
  
  async send(payload: EmailPayload): Promise<EmailResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Resend não está configurado. Verifique RESEND_API_KEY e EMAIL_FROM.');
      }
      
      const { data, error } = await this.client!.emails.send({
        from: process.env.RESEND_FROM || 'Kadernim <no-reply@kadernim.com>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html || '',
        text: payload.text,
      });
      
      if (error) {
        throw new Error(`Erro Resend: ${error.message}`);
      }
      
      return {
        success: true,
        messageId: data?.id,
        provider: 'resend'
      };
    } catch (error) {
      console.error('[Resend] Erro ao enviar email:', error);
      return {
        success: false,
        provider: 'resend',
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}

// Exportar uma instância única
export const resendProvider = new ResendProvider();
