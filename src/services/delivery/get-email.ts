import { generateMagicLinkEmail } from '@/services/mail/templates/MagicLinkEmail'
import { generateOtpEmail } from '@/services/mail/templates/OtpEmail'

import { DeliveryData, DeliveryType, EmailTemplate } from './types'

export type GetEmailTemplateParams = {
  type: DeliveryType
  name: string
  data: DeliveryData
}

const otpSubjectMap: Record<Exclude<DeliveryType, 'magic-link'>, string> = {
  otp: '🔐 Seu código de acesso - Kadernim',
  'email-verification': '🔐 Código de verificação - Kadernim',
  'password-reset': '🔐 Código para redefinir senha - Kadernim',
}

export async function getEmailTemplate({
  type,
  name,
  data,
}: GetEmailTemplateParams): Promise<EmailTemplate> {
  if (type === 'magic-link') {
    const url = data.url
    const expiresIn = data.expiresIn ?? 20

    if (!url) {
      throw new Error('URL é obrigatória para envio de magic link')
    }

    return generateMagicLinkEmail({ name, magicLink: url, expiresIn })
  }

  const otp = data.otp
  const expiresIn = data.expiresIn ?? 5

  if (!otp) {
    throw new Error('OTP é obrigatório para envio deste tipo de mensagem')
  }

  const subject = otpSubjectMap[type] ?? '🔐 Código de verificação - Kadernim'

  const template = await generateOtpEmail({ name, otp, expiresIn })

  return {
    ...template,
    subject,
  }
}
