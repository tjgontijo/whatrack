import type { Prisma } from '@db/client'

import { prisma } from '@/lib/db/prisma'
import {
  billingPlanMetadataSchema,
  type BillingPlanMetadata,
  type PublicBillingPlan,
} from '@/schemas/billing/billing-plan-schemas'

type BillingPlanRecord = {
  id: string
  name: string
  slug: string
  description: string | null
  monthlyPrice: Prisma.Decimal
  currency: string
  eventLimitPerMonth: number
  overagePricePerEvent: Prisma.Decimal
  maxWhatsAppNumbers: number
  maxAdAccounts: number
  maxTeamMembers: number
  supportLevel: string
  stripeProductId: string | null
  stripePriceId: string | null
  syncStatus: string
  syncError: string | null
  syncedAt: Date | null
  isActive: boolean
  isHighlighted: boolean
  contactSalesOnly: boolean
  displayOrder: number
  metadata: Prisma.JsonValue | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class BillingPlanCatalogError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'BillingPlanCatalogError'
  }
}

function toArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function getSupportLabel(level: string) {
  switch (level) {
    case 'priority':
      return 'prioritário'
    case 'dedicated':
      return 'dedicado'
    default:
      return 'por e-mail'
  }
}

export function parseBillingPlanMetadata(
  metadata: Prisma.JsonValue | null | undefined,
): BillingPlanMetadata {
  const parsed = billingPlanMetadataSchema.safeParse(metadata ?? {})

  return parsed.success
    ? parsed.data
    : {
        features: [],
        additionals: [],
      }
}

export function buildBillingPlanPresentation(plan: BillingPlanRecord) {
  const metadata = parseBillingPlanMetadata(plan.metadata)
  const subtitle =
    metadata.subtitle ??
    (plan.contactSalesOnly
      ? 'Fluxo comercial sob consulta'
      : `Até ${plan.eventLimitPerMonth.toLocaleString('pt-BR')} eventos / mês`)
  const cta =
    metadata.cta ??
    (plan.contactSalesOnly ? 'Falar com vendas' : 'Testar grátis por 14 dias')
  const trialDays =
    typeof metadata.trialDays === 'number'
      ? metadata.trialDays
      : plan.contactSalesOnly
        ? 0
        : 14
  const features =
    toArray(metadata.features).length > 0
      ? toArray(metadata.features)
      : [
          `${plan.eventLimitPerMonth.toLocaleString('pt-BR')} eventos/mês`,
          `${plan.maxWhatsAppNumbers} número(s) de WhatsApp`,
          `${plan.maxAdAccounts} conta(s) Meta Ads`,
          `${plan.maxTeamMembers} membro(s) na equipe`,
          `Suporte ${getSupportLabel(plan.supportLevel)}`,
        ]
  const additionals =
    toArray(metadata.additionals).length > 0
      ? toArray(metadata.additionals)
      : plan.contactSalesOnly
        ? []
        : [`R$ ${plan.overagePricePerEvent.toString()} por evento extra`]

  return {
    subtitle,
    cta,
    trialDays,
    features,
    additionals,
  }
}

export function mapBillingPlanToPublic(plan: BillingPlanRecord): PublicBillingPlan {
  const presentation = buildBillingPlanPresentation(plan)

  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    subtitle: presentation.subtitle,
    cta: presentation.cta,
    trialDays: presentation.trialDays,
    features: presentation.features,
    additionals: presentation.additionals,
    monthlyPrice: Number(plan.monthlyPrice),
    currency: plan.currency,
    eventLimitPerMonth: plan.eventLimitPerMonth,
    overagePricePerEvent: Number(plan.overagePricePerEvent),
    maxWhatsAppNumbers: plan.maxWhatsAppNumbers,
    maxAdAccounts: plan.maxAdAccounts,
    maxTeamMembers: plan.maxTeamMembers,
    supportLevel: plan.supportLevel,
    isHighlighted: plan.isHighlighted,
    contactSalesOnly: plan.contactSalesOnly,
    displayOrder: plan.displayOrder,
    syncStatus: plan.syncStatus as PublicBillingPlan['syncStatus'],
    stripePriceId: plan.stripePriceId,
  }
}

const billingPlanSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  monthlyPrice: true,
  currency: true,
  eventLimitPerMonth: true,
  overagePricePerEvent: true,
  maxWhatsAppNumbers: true,
  maxAdAccounts: true,
  maxTeamMembers: true,
  supportLevel: true,
  stripeProductId: true,
  stripePriceId: true,
  syncStatus: true,
  syncError: true,
  syncedAt: true,
  isActive: true,
  isHighlighted: true,
  contactSalesOnly: true,
  displayOrder: true,
  metadata: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function listPublicBillingPlans(options?: {
  selfServeOnly?: boolean
}): Promise<PublicBillingPlan[]> {
  const plans = await prisma.billingPlan.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      ...(options?.selfServeOnly ? { contactSalesOnly: false } : {}),
      OR: [
        { contactSalesOnly: true },
        {
          AND: [{ stripePriceId: { not: null } }, { syncStatus: 'synced' }],
        },
      ],
    },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    select: billingPlanSelect,
  })

  return plans.map(mapBillingPlanToPublic)
}

export async function getBillingPlanById(planId: string) {
  return prisma.billingPlan.findUnique({
    where: { id: planId },
    select: billingPlanSelect,
  })
}

export async function getBillingPlanBySlug(slug: string) {
  return prisma.billingPlan.findUnique({
    where: { slug },
    select: billingPlanSelect,
  })
}

export async function getBillingPlanByStripePriceId(priceId: string) {
  return prisma.billingPlan.findFirst({
    where: { stripePriceId: priceId },
    select: billingPlanSelect,
  })
}

export async function getDefaultTrialBillingPlan() {
  const plan = await prisma.billingPlan.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      contactSalesOnly: false,
    },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    select: billingPlanSelect,
  })

  if (!plan) {
    throw new BillingPlanCatalogError('Nenhum plano self-serve disponível para iniciar trial', 409)
  }

  return plan
}

export async function requireCheckoutReadyBillingPlan(slug: string) {
  const plan = await getBillingPlanBySlug(slug)

  if (!plan || !plan.isActive || plan.deletedAt) {
    throw new BillingPlanCatalogError('Plano não encontrado', 404)
  }

  if (plan.contactSalesOnly) {
    throw new BillingPlanCatalogError('Este plano exige contato comercial', 400)
  }

  if (!plan.stripePriceId || plan.syncStatus !== 'synced') {
    throw new BillingPlanCatalogError('Plano ainda não sincronizado com a Stripe', 409)
  }

  return plan
}
