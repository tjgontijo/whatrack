// src/lib/mail/nodemailer.ts
import nodemailer from 'nodemailer';
import { EmailPayload, EmailResponse, EmailProvider } from './types';

class NodemailerProvider implements EmailProvider {
  private transporter: nodemailer.Transporter | null = null;
  
  constructor() {
    // Inicializar o transporter se as variáveis de ambiente estiverem disponíveis
    if (
      process.env.EMAIL_SERVER_HOST &&
      process.env.EMAIL_SERVER_PORT &&
      process.env.EMAIL_SERVER_USER &&
      process.env.EMAIL_SERVER_PASSWORD
    ) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        secure: Number(process.env.EMAIL_SERVER_PORT) === 465, // true para 465, false para outras portas
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      });
    }
  }
  
  isConfigured(): boolean {
    return !!this.transporter && !!process.env.EMAIL_FROM;
  }
  
  async send(payload: EmailPayload): Promise<EmailResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Nodemailer não está configurado. Verifique as variáveis de ambiente de SMTP.');
      }
      
      const info = await this.transporter!.sendMail({
        from: process.env.EMAIL_FROM,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
      
      return {
        success: true,
        messageId: info.messageId,
        provider: 'nodemailer'
      };
    } catch (error) {
      console.error('[Nodemailer] Erro ao enviar email:', error);
      return {
        success: false,
        provider: 'nodemailer',
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}

// Exportar uma instância única
export const nodemailerProvider = new NodemailerProvider();
