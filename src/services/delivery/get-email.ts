import { generateMagicLinkEmail } from '@/services/mail/templates/MagicLinkEmail'
import { generateOtpEmail } from '@/services/mail/templates/OtpEmail'
import { generatePasswordResetEmail } from '@/services/mail/templates/PasswordResetEmail'
import { resolveAppName } from '@/services/mail/templates/shared/app-name.server'

import { DeliveryData, DeliveryType, EmailTemplate } from './types'

export type GetEmailTemplateParams = {
  type: DeliveryType
  name: string
  data: DeliveryData
}

type OtpDeliveryType = Extract<DeliveryType, 'otp' | 'email-verification'>

const buildOtpSubjectMap = (appName: string): Record<OtpDeliveryType, string> => ({
  otp: `🔐 Seu código de acesso - ${appName}`,
  'email-verification': `🔐 Código de verificação - ${appName}`,
})

const resolveOtpSubject = (type: OtpDeliveryType): string => {
  const appName = resolveAppName()
  const subjectMap = buildOtpSubjectMap(appName)
  return subjectMap[type]
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

  if (type === 'password-reset') {
    const url = data.url
    const expiresIn = data.expiresIn ?? 60

    if (!url) {
      throw new Error('URL é obrigatória para envio de redefinição de senha')
    }

    return generatePasswordResetEmail({
      name,
      resetLink: url,
      expiresIn,
    })
  }

  const otp = data.otp
  const expiresIn = data.expiresIn ?? 5

  if (!otp) {
    throw new Error('OTP é obrigatório para envio deste tipo de mensagem')
  }

  const subject = resolveOtpSubject(type)

  const template = await generateOtpEmail({ name, otp, expiresIn })

  return {
    ...template,
    subject,
  }
}
