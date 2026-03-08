import type { Prisma } from '@db/client'

import { prisma } from '@/lib/db/prisma'
import type {
  BillingPlanDetail,
  BillingPlanHistoryQuery,
  BillingPlanHistoryResponse,
  BillingPlanListItem,
  BillingPlanListQuery,
  BillingPlanListResponse,
} from '@/schemas/billing/billing-plan-schemas'
import { buildBillingPlanPresentation } from './billing-plan-catalog.service'

function buildBillingPlanWhere(
  query: BillingPlanListQuery,
): Prisma.BillingPlanWhereInput {
  const search = query.query?.trim()

  return {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.status === 'active'
      ? { isActive: true, deletedAt: null }
      : query.status === 'inactive'
        ? {
            OR: [{ isActive: false }, { deletedAt: { not: null } }],
          }
        : {}),
    ...(query.syncStatus !== 'all' ? { syncStatus: query.syncStatus } : {}),
  }
}

function mapBillingPlan(
  plan: {
    id: string
    name: string
    slug: string
    description: string | null
    monthlyPrice: { toString(): string }
    currency: string
    eventLimitPerMonth: number
    overagePricePerEvent: { toString(): string }
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
    _count: {
      subscriptions: number
    }
  },
): BillingPlanListItem {
  const presentation = buildBillingPlanPresentation({
    ...plan,
    monthlyPrice: plan.monthlyPrice as Prisma.Decimal,
    overagePricePerEvent: plan.overagePricePerEvent as Prisma.Decimal,
  })

  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    subtitle: presentation.subtitle,
    cta: presentation.cta,
    trialDays: presentation.trialDays,
    features: presentation.features,
    additionals: presentation.additionals,
    monthlyPrice: plan.monthlyPrice.toString(),
    currency: plan.currency,
    eventLimitPerMonth: plan.eventLimitPerMonth,
    overagePricePerEvent: plan.overagePricePerEvent.toString(),
    maxWhatsAppNumbers: plan.maxWhatsAppNumbers,
    maxAdAccounts: plan.maxAdAccounts,
    maxTeamMembers: plan.maxTeamMembers,
    supportLevel: plan.supportLevel,
    stripeProductId: plan.stripeProductId,
    stripePriceId: plan.stripePriceId,
    syncStatus: plan.syncStatus as BillingPlanListItem['syncStatus'],
    syncError: plan.syncError,
    syncedAt: plan.syncedAt?.toISOString() ?? null,
    isActive: plan.isActive,
    isHighlighted: plan.isHighlighted,
    contactSalesOnly: plan.contactSalesOnly,
    displayOrder: plan.displayOrder,
    deletedAt: plan.deletedAt?.toISOString() ?? null,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    subscriptionCount: plan._count.subscriptions,
  }
}

export async function listBillingPlans(
  query: BillingPlanListQuery,
): Promise<BillingPlanListResponse> {
  const where = buildBillingPlanWhere(query)
  const skip = (query.page - 1) * query.pageSize

  const [plans, total] = await Promise.all([
    prisma.billingPlan.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      skip,
      take: query.pageSize,
      select: {
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
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
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
    select: {
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
      _count: {
        select: {
          subscriptions: true,
        },
      },
    },
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
