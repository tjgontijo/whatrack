// src/lib/mail/types.ts

export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: Error | string;
}

export interface EmailProvider {
  send: (payload: EmailPayload) => Promise<EmailResponse>;
  isConfigured: () => boolean;
}
