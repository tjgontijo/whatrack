import type { Prisma } from '@generated/prisma/client'

import { prisma } from '@/lib/db/prisma'
import {
  billingPlanMetadataSchema,
  type BillingPlanMetadata,
  type PublicBillingPlan,
} from '@/schemas/billing/billing-plan-schemas'

type BillingPlanRecord = {
  id: string
  code: string
  name: string
  cycle: string
  accessDays: number
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  includedProjects: number
  includedWhatsAppPerProject: number
  includedMetaAdAccountsPerProject: number
  includedConversionsPerProject: number
  supportLevel: string
  displayOrder: number
  isHighlighted: boolean
  contactSalesOnly: boolean
  metadata: Prisma.JsonValue | null
  offers: Array<{
    id: string
    code: string
    paymentMethod: string
    amount: Prisma.Decimal
    currency: string
    maxInstallments: number
    installmentRate: Prisma.Decimal | null
    isActive: boolean
    validUntil: Date | null
  }>
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

function isMissingBillingPlanTableError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2021'
  )
}

function toArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
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

function getDefaultSubtitle(plan: BillingPlanRecord) {
  return `Até ${plan.includedProjects.toLocaleString('pt-BR')} projetos incluídos`
}

function getDefaultPriceFromOffers(offers: BillingPlanRecord['offers']): number {
  const activeOffer = offers.find((o) => o.isActive && !o.validUntil)
  return activeOffer ? Number(activeOffer.amount) : 0
}

export function buildBillingPlanPresentation(plan: BillingPlanRecord) {
  const metadata = parseBillingPlanMetadata(plan.metadata)
  const subtitle = metadata.subtitle ?? getDefaultSubtitle(plan)
  const cta = metadata.cta ?? 'Teste grátis por 14 dias'
  const trialDays = typeof metadata.trialDays === 'number' ? metadata.trialDays : 14
  const features =
    toArray(metadata.features).length > 0
      ? toArray(metadata.features)
      : [
          `${plan.includedProjects} projetos incluídos`,
          `${plan.includedWhatsAppPerProject} instância WhatsApp por projeto`,
          `${plan.includedMetaAdAccountsPerProject} conta Meta Ads por projeto`,
        ]
  const additionals = toArray(metadata.additionals)

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
  const metadata = parseBillingPlanMetadata(plan.metadata)

  return {
    id: plan.id,
    slug: metadata.slug ?? plan.code,
    code: plan.code,
    name: plan.name,
    description: metadata.description ?? null,
    cycle: plan.cycle,
    accessDays: plan.accessDays,
    kind: (metadata.kind as PublicBillingPlan['kind']) ?? 'base',
    addonType: (metadata.addonType as PublicBillingPlan['addonType']) ?? null,
    subtitle: presentation.subtitle,
    cta: presentation.cta,
    trialDays: presentation.trialDays,
    features: presentation.features,
    additionals: presentation.additionals,
    monthlyPrice: metadata.monthlyPrice ?? getDefaultPriceFromOffers(plan.offers),
    currency: 'BRL',
    includedProjects: plan.includedProjects,
    includedWhatsAppPerProject: plan.includedWhatsAppPerProject,
    includedMetaAdAccountsPerProject: plan.includedMetaAdAccountsPerProject,
    includedConversionsPerProject: plan.includedConversionsPerProject,
    supportLevel: plan.supportLevel,
    isHighlighted: plan.isHighlighted,
    contactSalesOnly: plan.contactSalesOnly,
    displayOrder: plan.displayOrder,
    syncStatus: 'synced' as const,
    stripePriceId: null,
    offers: plan.offers
      .filter(
        (offer: BillingPlanRecord['offers'][number]) =>
          offer.isActive && (!offer.validUntil || offer.validUntil > new Date()),
      )
      .map((offer: BillingPlanRecord['offers'][number]) => ({
        id: offer.id,
        code: offer.code,
        paymentMethod: offer.paymentMethod as PublicBillingPlan['offers'][number]['paymentMethod'],
        amount: Number(offer.amount),
        currency: offer.currency,
        maxInstallments: offer.maxInstallments,
        installmentRate: offer.installmentRate ? Number(offer.installmentRate) : null,
      })),
  }
}

export const billingPlanSelect = {
  id: true,
  code: true,
  name: true,
  cycle: true,
  accessDays: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  includedProjects: true,
  includedWhatsAppPerProject: true,
  includedMetaAdAccountsPerProject: true,
  includedConversionsPerProject: true,
  supportLevel: true,
  displayOrder: true,
  isHighlighted: true,
  contactSalesOnly: true,
  metadata: true,
  offers: {
    select: {
      id: true,
      code: true,
      paymentMethod: true,
      amount: true,
      currency: true,
      maxInstallments: true,
      installmentRate: true,
      isActive: true,
      validUntil: true,
    },
  },
} as const

export async function listPublicBillingPlans(options?: {
  selfServeOnly?: boolean
}): Promise<PublicBillingPlan[]> {
  let plans: BillingPlanRecord[]

  try {
    plans = await prisma.billingPlan.findMany({
      where: {
        isActive: true,
        ...(options?.selfServeOnly ? { contactSalesOnly: false } : {}),
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      select: billingPlanSelect,
    })
  } catch (error) {
    if (isMissingBillingPlanTableError(error)) {
      return []
    }

    throw error
  }

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
    where: { code: slug },
    select: billingPlanSelect,
  })
}


export async function getDefaultTrialBillingPlan() {
  const plan = await prisma.billingPlan.findFirst({
    where: {
      isActive: true,
      contactSalesOnly: false,
    },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    select: billingPlanSelect,
  })

  if (!plan) {
    throw new BillingPlanCatalogError('Nenhum plano base disponível para iniciar trial', 409)
  }

  return plan
}

export async function requireCheckoutReadyBillingPlan(slug: string) {
  const plan = await getBillingPlanBySlug(slug)

  if (!plan || !plan.isActive) {
    throw new BillingPlanCatalogError('Plano não encontrado', 404)
  }

  if (plan.contactSalesOnly) {
    throw new BillingPlanCatalogError('Este plano exige contato comercial', 400)
  }

  if (!plan.offers.some((offer) => offer.isActive && !offer.validUntil)) {
    throw new BillingPlanCatalogError('Plano sem ofertas ativas para checkout', 409)
  }

  return plan
}

export async function getBillingAddonPlans() {
  return prisma.billingPlan.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    select: billingPlanSelect,
  })
}
