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
  kind: string
  addonType: string | null
  monthlyPrice: Prisma.Decimal
  currency: string
  includedProjects: number
  includedWhatsAppPerProject: number
  includedMetaAdAccountsPerProject: number
  includedConversionsPerProject: number
  includedAiCreditsPerProject: number
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
  if (plan.kind === 'addon') {
    switch (plan.addonType) {
      case 'project':
        return 'Cliente ativo extra com franquia completa'
      case 'whatsapp_number':
        return 'Número extra no mesmo cliente'
      case 'meta_ad_account':
        return 'Conta Meta extra no mesmo cliente'
      default:
        return 'Add-on operacional'
    }
  }

  return `Até ${plan.includedProjects.toLocaleString('pt-BR')} clientes ativos incluídos`
}

export function buildBillingPlanPresentation(plan: BillingPlanRecord) {
  const metadata = parseBillingPlanMetadata(plan.metadata)
  const subtitle = metadata.subtitle ?? getDefaultSubtitle(plan)
  const cta =
    metadata.cta ??
    (plan.kind === 'base' ? 'Teste grátis por 14 dias' : 'Adicionado automaticamente conforme uso')
  const trialDays =
    typeof metadata.trialDays === 'number'
      ? metadata.trialDays
      : plan.kind === 'base'
        ? 14
        : 0
  const features =
    toArray(metadata.features).length > 0
      ? toArray(metadata.features)
      : [
          `${plan.includedProjects} clientes ativos incluídos`,
          `${plan.includedWhatsAppPerProject} WhatsApp por cliente`,
          `${plan.includedMetaAdAccountsPerProject} conta Meta Ads por cliente`,
          `${plan.includedConversionsPerProject} conversões por cliente / mês`,
          `${plan.includedAiCreditsPerProject.toLocaleString('pt-BR')} créditos de IA por cliente / mês`,
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

  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    kind: plan.kind as PublicBillingPlan['kind'],
    addonType: plan.addonType as PublicBillingPlan['addonType'],
    subtitle: presentation.subtitle,
    cta: presentation.cta,
    trialDays: presentation.trialDays,
    features: presentation.features,
    additionals: presentation.additionals,
    monthlyPrice: Number(plan.monthlyPrice),
    currency: plan.currency,
    includedProjects: plan.includedProjects,
    includedWhatsAppPerProject: plan.includedWhatsAppPerProject,
    includedMetaAdAccountsPerProject: plan.includedMetaAdAccountsPerProject,
    includedConversionsPerProject: plan.includedConversionsPerProject,
    includedAiCreditsPerProject: plan.includedAiCreditsPerProject,
    supportLevel: plan.supportLevel,
    isHighlighted: plan.isHighlighted,
    contactSalesOnly: plan.contactSalesOnly,
    displayOrder: plan.displayOrder,
    syncStatus: plan.syncStatus as PublicBillingPlan['syncStatus'],
    stripePriceId: plan.stripePriceId,
  }
}

export const billingPlanSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  kind: true,
  addonType: true,
  monthlyPrice: true,
  currency: true,
  includedProjects: true,
  includedWhatsAppPerProject: true,
  includedMetaAdAccountsPerProject: true,
  includedConversionsPerProject: true,
  includedAiCreditsPerProject: true,
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
      ...(options?.selfServeOnly ? { kind: 'base', contactSalesOnly: false } : {}),
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
      kind: 'base',
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

  if (!plan || !plan.isActive || plan.deletedAt) {
    throw new BillingPlanCatalogError('Plano não encontrado', 404)
  }

  if (plan.kind !== 'base') {
    throw new BillingPlanCatalogError('Apenas o plano base pode iniciar checkout', 400)
  }

  if (plan.contactSalesOnly) {
    throw new BillingPlanCatalogError('Este plano exige contato comercial', 400)
  }

  if (!plan.stripePriceId || plan.syncStatus !== 'synced') {
    throw new BillingPlanCatalogError('Plano ainda não sincronizado com a Stripe', 409)
  }

  return plan
}

export async function getBillingAddonPlans() {
  return prisma.billingPlan.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      kind: 'addon',
      syncStatus: 'synced',
      stripePriceId: { not: null },
    },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    select: billingPlanSelect,
  })
}
