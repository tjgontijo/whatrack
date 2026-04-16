import type { Prisma, BillingCycle } from '@generated/prisma/client'

import { prisma } from '@/lib/db/prisma'
import type {
  BillingPlanDetail,
  BillingPlanHistoryQuery,
  BillingPlanHistoryResponse,
  BillingPlanListItem,
  BillingPlanListQuery,
  BillingPlanListResponse,
} from '@/schemas/billing/billing-plan-schemas'
import { buildBillingPlanPresentation, parseBillingPlanMetadata } from './billing-plan-catalog.service'

function buildBillingPlanWhere(query: BillingPlanListQuery): Prisma.BillingPlanWhereInput {
  const search = query.query?.trim()

  return {
    ...(search
      ? {
          OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }],
        }
      : {}),
    ...(query.status === 'active' ? { isActive: true } : query.status === 'inactive' ? { isActive: false } : {}),
  }
}

function mapBillingPlan(plan: any): BillingPlanListItem {
  const metadata = parseBillingPlanMetadata(plan.metadata)
  const presentation = {
    subtitle: metadata.subtitle ?? `Até ${plan.includedProjects.toLocaleString('pt-BR')} clientes ativos incluídos`,
    cta: metadata.cta ?? 'Teste grátis por 14 dias',
    trialDays: typeof metadata.trialDays === 'number' ? metadata.trialDays : 14,
    features:
      metadata.features && metadata.features.length > 0
        ? metadata.features
        : [
            `${plan.includedProjects} clientes ativos incluídos`,
            `${plan.includedWhatsAppPerProject} WhatsApp por cliente`,
            `${plan.includedMetaAdAccountsPerProject} conta Meta Ads por cliente`,
            `${plan.includedConversionsPerProject} conversões por cliente / mês`,
          ],
    additionals: metadata.additionals ?? [],
  }

  return {
    id: plan.id,
    name: plan.name,
    slug: metadata.slug ?? plan.code,
    description: metadata.description ?? null,
    kind: (metadata.kind as BillingPlanListItem['kind']) ?? 'base',
    addonType: (metadata.addonType as BillingPlanListItem['addonType']) ?? null,
    subtitle: presentation.subtitle,
    cta: presentation.cta,
    trialDays: presentation.trialDays,
    features: presentation.features,
    additionals: presentation.additionals,
    monthlyPrice: String(metadata.monthlyPrice ?? 0),
    currency: 'BRL',
    includedProjects: plan.includedProjects,
    includedWhatsAppPerProject: plan.includedWhatsAppPerProject,
    includedMetaAdAccountsPerProject: plan.includedMetaAdAccountsPerProject,
    includedConversionsPerProject: plan.includedConversionsPerProject,
    supportLevel: plan.supportLevel,
    stripeProductId: null,
    stripePriceId: null,
    syncStatus: 'synced' as const,
    syncError: null,
    syncedAt: null,
    isActive: plan.isActive,
    isHighlighted: plan.isHighlighted,
    contactSalesOnly: plan.contactSalesOnly,
    displayOrder: plan.displayOrder,
    deletedAt: null,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    subscriptionCount: 0,
  }
}

const planSelect = {
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

export async function listBillingPlans(query: BillingPlanListQuery): Promise<BillingPlanListResponse> {
  const where = buildBillingPlanWhere(query)
  const skip = (query.page - 1) * query.pageSize

  const [plans, total] = await Promise.all([
    prisma.billingPlan.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      skip,
      take: query.pageSize,
      select: planSelect,
    }),
    prisma.billingPlan.count({ where }),
  ])

  return {
    items: plans.map(mapBillingPlan),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.ceil(total / query.pageSize),
  }
}

export async function getBillingPlanDetail(planId: string): Promise<BillingPlanDetail | null> {
  const plan = await prisma.billingPlan.findUnique({
    where: { id: planId },
    select: planSelect,
  })

  return plan ? mapBillingPlan(plan) : null
}

export async function listBillingPlanHistory(
  planId: string,
  query: BillingPlanHistoryQuery,
): Promise<BillingPlanHistoryResponse> {
  const skip = (query.page - 1) * query.pageSize

  const [items, total] = await Promise.all([
    prisma.orgAuditLog.findMany({
      where: {
        resourceType: 'billing-plan',
        resourceId: planId,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.pageSize,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        createdAt: true,
        before: true,
        after: true,
        metadata: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.orgAuditLog.count({
      where: {
        resourceType: 'billing-plan',
        resourceId: planId,
      },
    }),
  ])

  return {
    items: items.map((item) => ({
      id: item.id,
      action: item.action,
      resourceType: item.resourceType,
      resourceId: item.resourceId,
      createdAt: item.createdAt.toISOString(),
      before: item.before,
      after: item.after,
      metadata: item.metadata,
      user: item.user,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.ceil(total / query.pageSize),
  }
}
