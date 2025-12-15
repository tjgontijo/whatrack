import { TemplateCategory } from '@prisma/client'

const toCents = (value: number) => Math.max(0, Math.round(value * 100))

function readPrice(envKey: string, fallback: number) {
  const raw = process.env[envKey]
  if (!raw) return fallback
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function getPricePerMessageCents(category?: TemplateCategory | null) {
  const marketing = toCents(readPrice('CAMPAIGN_MARKETING_PRICE', 0.95))
  const utility = toCents(readPrice('CAMPAIGN_UTILITY_PRICE', 0.45))
  const auth = toCents(readPrice('CAMPAIGN_AUTH_PRICE', 0.4))

  switch (category) {
    case TemplateCategory.UTILITY:
      return utility
    case TemplateCategory.AUTHENTICATION:
      return auth
    case TemplateCategory.MARKETING:
    default:
      return marketing
  }
}
