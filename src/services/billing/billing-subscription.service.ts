import { Prisma } from '@db/client'

import { prisma } from '@/lib/db/prisma'
import type { SubscriptionStatus } from '@/types/billing/billing'
import { isSubscriptionStatus } from '@/types/billing/billing'
import {
  getBillingAddonPlans,
  getBillingPlanBySlug,
  getDefaultTrialBillingPlan,
} from './billing-plan-catalog.service'

const BILLING_CYCLE_DAYS = 30

export class SubscriptionNotFoundError extends Error {
  constructor(organizationId: string) {
    super(`Subscription not found for organization ${organizationId}`)
    this.name = 'SubscriptionNotFoundError'
  }
}

export class SubscriptionAlreadyExistsError extends Error {
  constructor(organizationId: string) {
    super(`Organization ${organizationId} already has an active subscription`)
    this.name = 'SubscriptionAlreadyExistsError'
  }
}

function ensureSubscriptionStatus(status: string): SubscriptionStatus {
  if (!isSubscriptionStatus(status)) {
    throw new Error(`Invalid subscription status: ${status}`)
  }

  return status
}

export interface CreateSubscriptionParams {
  organizationId: string
  planType: string
  provider?: string
  providerCustomerId?: string
  providerSubscriptionId?: string | null
  status?: SubscriptionStatus
  billingCycleStartDate?: Date
  billingCycleEndDate?: Date
  nextResetDate?: Date
  trialEndsAt?: Date | null
  canceledAtPeriodEnd?: boolean
}

export interface StartOrganizationTrialParams {
  organizationId: string
  planType?: string
  trialDays?: number
}

type EntitlementCounts = {
  includedProjects: number
  activeProjects: number
  additionalProjects: number
  includedWhatsAppPerProject: number
  additionalWhatsAppNumbers: number
  includedMetaAdAccountsPerProject: number
  additionalMetaAdAccounts: number
  includedConversionsPerProject: number
  includedAiCreditsPerProject: number
}

async function getOrganizationResourceCounts(organizationId: string) {
  const [projects, whatsappByProject, metaByProject] = await Promise.all([
    prisma.project.count({
      where: { organizationId },
    }),
    prisma.whatsAppConfig.groupBy({
      by: ['projectId'],
      where: {
        organizationId,
        projectId: { not: null },
        status: 'connected',
      },
      _count: { _all: true },
    }),
    prisma.metaAdAccount.groupBy({
      by: ['projectId'],
      where: {
        organizationId,
        projectId: { not: null },
        isActive: true,
      },
      _count: { _all: true },
    }),
  ])

  return {
    projects,
    whatsappByProject: whatsappByProject.map((entry) => entry._count._all),
    metaByProject: metaByProject.map((entry) => entry._count._all),
  }
}

function calculateExtraCounts(input: {
  projects: number
  includedProjects: number
  includedWhatsAppPerProject: number
  whatsappByProject: number[]
  includedMetaAdAccountsPerProject: number
  metaByProject: number[]
}) {
  const additionalProjects = Math.max(0, input.projects - input.includedProjects)
  const additionalWhatsAppNumbers = input.whatsappByProject.reduce((total, count) => {
    return total + Math.max(0, count - input.includedWhatsAppPerProject)
  }, 0)
  const additionalMetaAdAccounts = input.metaByProject.reduce((total, count) => {
    return total + Math.max(0, count - input.includedMetaAdAccountsPerProject)
  }, 0)

  return {
    additionalProjects,
    additionalWhatsAppNumbers,
    additionalMetaAdAccounts,
  }
}

export async function getOrganizationBillingEntitlements(
  organizationId: string,
  options?: {
    includedProjects?: number
    includedWhatsAppPerProject?: number
    includedMetaAdAccountsPerProject?: number
    includedConversionsPerProject?: number
    includedAiCreditsPerProject?: number
  },
): Promise<EntitlementCounts> {
  const includedProjects = options?.includedProjects ?? 0
  const includedWhatsAppPerProject = options?.includedWhatsAppPerProject ?? 0
  const includedMetaAdAccountsPerProject = options?.includedMetaAdAccountsPerProject ?? 0

  const counts = await getOrganizationResourceCounts(organizationId)
  const extras = calculateExtraCounts({
    projects: counts.projects,
    includedProjects,
    includedWhatsAppPerProject,
    whatsappByProject: counts.whatsappByProject,
    includedMetaAdAccountsPerProject,
    metaByProject: counts.metaByProject,
  })

  return {
    includedProjects,
    activeProjects: counts.projects,
    additionalProjects: extras.additionalProjects,
    includedWhatsAppPerProject,
    additionalWhatsAppNumbers: extras.additionalWhatsAppNumbers,
    includedMetaAdAccountsPerProject,
    additionalMetaAdAccounts: extras.additionalMetaAdAccounts,
    includedConversionsPerProject: options?.includedConversionsPerProject ?? 0,
    includedAiCreditsPerProject: options?.includedAiCreditsPerProject ?? 0,
  }
}

export async function assertProjectCreationAllowed(organizationId: string) {
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: {
      providerSubscriptionId: true,
      trialEndsAt: true,
      plan: {
        select: {
          includedProjects: true,
        },
      },
    },
  })

  if (!subscription) return

  const trialActive =
    subscription.trialEndsAt != null && subscription.trialEndsAt.getTime() > Date.now()
  const localTrial = trialActive && !subscription.providerSubscriptionId

  if (!localTrial) return

  const currentProjects = await prisma.project.count({
    where: { organizationId },
  })

  if (currentProjects >= 1) {
    throw new Error('O trial libera apenas 1 cliente ativo. Faça upgrade para criar outro projeto.')
  }
}

export async function assertWhatsAppAllowedForProject(input: {
  organizationId: string
  projectId: string | null
}) {
  if (!input.projectId) return

  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId: input.organizationId },
    select: {
      providerSubscriptionId: true,
      trialEndsAt: true,
    },
  })

  if (!subscription) return

  const trialActive =
    subscription.trialEndsAt != null && subscription.trialEndsAt.getTime() > Date.now()
  const localTrial = trialActive && !subscription.providerSubscriptionId
  if (!localTrial) return

  const count = await prisma.whatsAppConfig.count({
    where: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      status: 'connected',
    },
  })

  if (count >= 1) {
    throw new Error('O trial libera apenas 1 número de WhatsApp por cliente.')
  }
}

export async function assertMetaAdAccountAllowedForProject(input: {
  organizationId: string
  projectId: string | null
}) {
  if (!input.projectId) return

  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId: input.organizationId },
    select: {
      providerSubscriptionId: true,
      trialEndsAt: true,
    },
  })

  if (!subscription) return

  const trialActive =
    subscription.trialEndsAt != null && subscription.trialEndsAt.getTime() > Date.now()
  const localTrial = trialActive && !subscription.providerSubscriptionId
  if (!localTrial) return

  const count = await prisma.metaAdAccount.count({
    where: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      isActive: true,
    },
  })

  if (count >= 1) {
    throw new Error('O trial libera apenas 1 conta Meta Ads por cliente.')
  }
}

export async function createSubscription(params: CreateSubscriptionParams): Promise<void> {
  const existing = await prisma.billingSubscription.findUnique({
    where: { organizationId: params.organizationId },
  })

  if (existing && existing.status === 'active') {
    throw new SubscriptionAlreadyExistsError(params.organizationId)
  }

  const plan = await getBillingPlanBySlug(params.planType)
  if (!plan) {
    throw new Error(`Billing plan not found for slug: ${params.planType}`)
  }

  const cycleStartDate = params.billingCycleStartDate ?? new Date()
  const cycleEndDate =
    params.billingCycleEndDate ??
    new Date(cycleStartDate.getTime() + BILLING_CYCLE_DAYS * 24 * 60 * 60 * 1000)

  const subscriptionData = {
    organizationId: params.organizationId,
    provider: params.provider || 'stripe',
    providerCustomerId: params.providerCustomerId || `cust_${params.organizationId}`,
    providerSubscriptionId: params.providerSubscriptionId ?? null,
    planId: plan.id,
    billingCycleStartDate: cycleStartDate,
    billingCycleEndDate: cycleEndDate,
    nextResetDate: params.nextResetDate ?? cycleEndDate,
    trialEndsAt: params.trialEndsAt ?? null,
    status: params.status || 'active',
    canceledAtPeriodEnd: params.canceledAtPeriodEnd ?? false,
  }

  if (existing) {
    await prisma.billingSubscription.update({
      where: { id: existing.id },
      data: subscriptionData,
    })
  } else {
    await prisma.billingSubscription.create({
      data: subscriptionData,
    })
  }
}

export async function startOrganizationTrial(params: StartOrganizationTrialParams) {
  const existing = await prisma.billingSubscription.findUnique({
    where: { organizationId: params.organizationId },
    select: {
      id: true,
      organizationId: true,
      trialEndsAt: true,
      providerSubscriptionId: true,
      status: true,
      plan: {
        select: { slug: true },
      },
    },
  })

  if (existing) {
    return {
      ...existing,
      planType: existing.plan?.slug ?? null,
    }
  }

  const plan = params.planType
    ? await getBillingPlanBySlug(params.planType)
    : await getDefaultTrialBillingPlan()

  if (!plan) {
    throw new Error('Billing plan not found for trial start')
  }

  const cycleStartDate = new Date()
  const cycleEndDate = new Date(cycleStartDate)
  cycleEndDate.setDate(cycleEndDate.getDate() + (params.trialDays ?? 14))

  const created = await prisma.billingSubscription.create({
    data: {
      organizationId: params.organizationId,
      provider: 'stripe',
      providerCustomerId: `trial_${params.organizationId}`,
      providerSubscriptionId: null,
      planId: plan.id,
      billingCycleStartDate: cycleStartDate,
      billingCycleEndDate: cycleEndDate,
      nextResetDate: cycleEndDate,
      trialEndsAt: cycleEndDate,
      status: 'active',
      canceledAtPeriodEnd: false,
    },
    select: {
      id: true,
      organizationId: true,
      trialEndsAt: true,
      providerSubscriptionId: true,
      status: true,
      plan: {
        select: { slug: true },
      },
    },
  })

  return {
    ...created,
    planType: created.plan?.slug ?? null,
  }
}

export async function syncOrganizationSubscriptionItems(organizationId: string) {
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: {
      id: true,
      providerSubscriptionId: true,
      plan: {
        select: {
          id: true,
          stripePriceId: true,
          includedProjects: true,
          includedWhatsAppPerProject: true,
          includedMetaAdAccountsPerProject: true,
          includedConversionsPerProject: true,
          includedAiCreditsPerProject: true,
        },
      },
    },
  })

  if (!subscription?.plan) {
    return null
  }

  const entitlements = await getOrganizationBillingEntitlements(organizationId, {
    includedProjects: subscription.plan.includedProjects,
    includedWhatsAppPerProject: subscription.plan.includedWhatsAppPerProject,
    includedMetaAdAccountsPerProject: subscription.plan.includedMetaAdAccountsPerProject,
    includedConversionsPerProject: subscription.plan.includedConversionsPerProject,
    includedAiCreditsPerProject: subscription.plan.includedAiCreditsPerProject,
  })

  const addonPlans = await getBillingAddonPlans()
  const additionalProjectPlan = addonPlans.find((plan) => plan.addonType === 'project')
  const additionalWhatsAppPlan = addonPlans.find((plan) => plan.addonType === 'whatsapp_number')
  const additionalMetaPlan = addonPlans.find((plan) => plan.addonType === 'meta_ad_account')

  const desiredItems = [
    {
      planId: subscription.plan.id,
      stripePriceId: subscription.plan.stripePriceId,
      quantity: 1,
      unitPrice: null,
    },
    additionalProjectPlan
      ? {
          planId: additionalProjectPlan.id,
          stripePriceId: additionalProjectPlan.stripePriceId,
          quantity: entitlements.additionalProjects,
          unitPrice: additionalProjectPlan.monthlyPrice,
        }
      : null,
    additionalWhatsAppPlan
      ? {
          planId: additionalWhatsAppPlan.id,
          stripePriceId: additionalWhatsAppPlan.stripePriceId,
          quantity: entitlements.additionalWhatsAppNumbers,
          unitPrice: additionalWhatsAppPlan.monthlyPrice,
        }
      : null,
    additionalMetaPlan
      ? {
          planId: additionalMetaPlan.id,
          stripePriceId: additionalMetaPlan.stripePriceId,
          quantity: entitlements.additionalMetaAdAccounts,
          unitPrice: additionalMetaPlan.monthlyPrice,
        }
      : null,
  ].filter(
    (
      item,
    ): item is {
      planId: string
      stripePriceId: string
      quantity: number
      unitPrice: Prisma.Decimal | null
    } => Boolean(item?.stripePriceId),
  )

  let syncedItems: Array<{
    planId: string
    stripeSubscriptionItemId: string | null
    quantity: number
  }> = desiredItems.map((item) => ({
    planId: item.planId,
    stripeSubscriptionItemId: null,
    quantity: item.quantity,
  }))

  if (subscription.providerSubscriptionId) {
    const { providerRegistry, ensurePaymentProviders } = await import('@/lib/billing/providers/init')
    ensurePaymentProviders()
    const provider = providerRegistry.getActive()

    if (!provider.syncSubscriptionItems) {
      throw new Error('Active payment provider does not support multi-item sync')
    }

    syncedItems = await provider.syncSubscriptionItems({
      subscriptionId: subscription.providerSubscriptionId,
      items: desiredItems.map((item) => ({
        planId: item.planId,
        stripePriceId: item.stripePriceId,
        quantity: item.quantity,
      })),
    })
  }

  const existingItems = await prisma.billingSubscriptionItem.findMany({
    where: { subscriptionId: subscription.id },
    select: { id: true, planId: true },
  })

  const existingPlanIds = new Set(existingItems.map((item) => item.planId))
  const desiredPlanIds = new Set(syncedItems.map((item) => item.planId))

  for (const item of syncedItems) {
    const unitPrice = desiredItems.find((desired) => desired.planId === item.planId)?.unitPrice
    if (!unitPrice) continue

    await prisma.billingSubscriptionItem.upsert({
      where: {
        subscriptionId_planId: {
          subscriptionId: subscription.id,
          planId: item.planId,
        },
      },
      update: {
        quantity: item.quantity,
        stripeSubscriptionItemId: item.stripeSubscriptionItemId,
        unitPrice,
      },
      create: {
        subscriptionId: subscription.id,
        planId: item.planId,
        quantity: item.quantity,
        stripeSubscriptionItemId: item.stripeSubscriptionItemId,
        unitPrice,
      },
    })
  }

  const removableIds = existingItems
    .filter((item) => existingPlanIds.has(item.planId) && !desiredPlanIds.has(item.planId))
    .map((item) => item.id)

  if (removableIds.length > 0) {
    await prisma.billingSubscriptionItem.deleteMany({
      where: { id: { in: removableIds } },
    })
  }

  return entitlements
}

export async function getActiveSubscription(organizationId: string) {
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: {
      id: true,
      organizationId: true,
      status: true,
      canceledAtPeriodEnd: true,
      billingCycleStartDate: true,
      billingCycleEndDate: true,
      nextResetDate: true,
      trialEndsAt: true,
      createdAt: true,
      canceledAt: true,
      provider: true,
      providerSubscriptionId: true,
      plan: {
        select: {
          id: true,
          slug: true,
          name: true,
          includedProjects: true,
          includedWhatsAppPerProject: true,
          includedMetaAdAccountsPerProject: true,
          includedConversionsPerProject: true,
          includedAiCreditsPerProject: true,
        },
      },
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          currency: true,
          plan: {
            select: {
              slug: true,
              name: true,
              kind: true,
              addonType: true,
            },
          },
        },
      },
    },
  })

  if (!subscription) {
    throw new SubscriptionNotFoundError(organizationId)
  }

  const entitlements = await getOrganizationBillingEntitlements(organizationId, {
    includedProjects: subscription.plan?.includedProjects ?? 0,
    includedWhatsAppPerProject: subscription.plan?.includedWhatsAppPerProject ?? 0,
    includedMetaAdAccountsPerProject: subscription.plan?.includedMetaAdAccountsPerProject ?? 0,
    includedConversionsPerProject: subscription.plan?.includedConversionsPerProject ?? 0,
    includedAiCreditsPerProject: subscription.plan?.includedAiCreditsPerProject ?? 0,
  })

  return {
    ...subscription,
    planType: subscription.plan?.slug ?? 'platform_base',
    items: subscription.items.map((item) => ({
      planSlug: item.plan.slug,
      planName: item.plan.name,
      kind: item.plan.kind,
      addonType: item.plan.addonType,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      currency: item.currency,
    })),
    entitlements,
  }
}

export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: string,
): Promise<void> {
  const validatedStatus = ensureSubscriptionStatus(status)

  await prisma.billingSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: validatedStatus,
      ...(validatedStatus === 'canceled' && { canceledAt: new Date() }),
    },
  })
}

export async function cancelSubscription(
  organizationId: string,
  atPeriodEnd: boolean = false,
): Promise<{
  status: SubscriptionStatus
  canceledAtPeriodEnd: boolean
  canceledAt: Date | null
}> {
  const subscription = await getActiveSubscription(organizationId)
  const subscriptionId = subscription.providerSubscriptionId

  if (!subscriptionId) {
    throw new Error('Subscription is missing provider subscription ID')
  }

  const { providerRegistry, ensurePaymentProviders } = await import('@/lib/billing/providers/init')
  ensurePaymentProviders()

  const provider = providerRegistry.getActive()
  await provider.cancelSubscription(subscriptionId, atPeriodEnd)

  const updatedSubscription = await prisma.billingSubscription.update({
    where: { id: subscription.id },
    data: atPeriodEnd
      ? {
          canceledAtPeriodEnd: true,
        }
      : {
          status: 'canceled',
          canceledAtPeriodEnd: false,
          canceledAt: new Date(),
        },
    select: {
      status: true,
      canceledAtPeriodEnd: true,
      canceledAt: true,
    },
  })

  return {
    ...updatedSubscription,
    status: ensureSubscriptionStatus(updatedSubscription.status),
  }
}
