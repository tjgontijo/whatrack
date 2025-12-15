export type DeliveryType = 'magic-link' | 'otp' | 'password-reset' | 'email-verification'
export type DeliveryChannel = 'email' | 'whatsapp'

export interface DeliveryData {
  url?: string           // para magic-link
  otp?: string          // para otp
  name?: string
  expiresIn?: number
}

export interface AuthDeliveryPayload {
  email: string
  type: DeliveryType
  data: DeliveryData
  channels?: DeliveryChannel[]
}

export interface AuthDeliveryResult {
  success: boolean
  channel: DeliveryChannel | 'none'
  error?: string
}

export interface EmailTemplate {
  subject: string
  text: string
  html: string
}
