export type WhatsappTemplateParams = {
  name: string
  url?: string
  otp?: string
  expiresIn?: number
}

const capitalizeFirstName = (fullName: string): string => {
  const trimmed = fullName.trim()

  if (!trimmed) {
    return ''
  }

  const [firstName] = trimmed.split(/\s+/)
  const lowerCased = firstName.toLowerCase()

  return lowerCased.charAt(0).toUpperCase() + lowerCased.slice(1)
}

export function buildMagicLinkWhatsappMessage({
  name,
  url,
  expiresIn = 20,
}: WhatsappTemplateParams): string {
  if (!url) {
    throw new Error('URL é obrigatória para template de WhatsApp (magic link)')
  }

  const firstName = capitalizeFirstName(name) || name

  return (
    `Olá ${firstName}! 🎉\n\n` +
    `🔐 *Acesse sua conta Kadernim:*\n\n${url}\n\n` +
    `⏰ Este link é válido por ${expiresIn} minutos.\n\n` +
    `_Não compartilhe este link com ninguém._`
  )
}

export function buildOtpWhatsappMessage({
  name,
  otp,
  expiresIn = 5,
}: WhatsappTemplateParams): string {
  if (!otp) {
    throw new Error('OTP é obrigatório para template de WhatsApp (código)')
  }

  const firstName = capitalizeFirstName(name) || name

  return (
    `Olá ${firstName}! 🎉\n\n` +
    `🔐 *Seu código de acesso:*\n\n*${otp}*\n\n` +
    `⏰ Este código é válido por ${expiresIn} minutos.\n\n` +
    `_Não compartilhe este código com ninguém._`
  )
}
