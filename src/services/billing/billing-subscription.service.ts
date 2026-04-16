import { prisma } from '@/lib/db/prisma'
import { isSubscriptionStatus, type SubscriptionStatus } from '@/types/billing/billing'
import { getBillingPlanBySlug, getDefaultTrialBillingPlan } from './billing-plan-catalog.service'

const DEFAULT_TRIAL_PROJECT_LIMIT = 1
const DEFAULT_TRIAL_RESOURCE_LIMIT = 1

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
  offerId?: string | null
  provider?: string
  providerCustomerId?: string
  providerSubscriptionId?: string | null
  asaasCustomerId?: string | null
  asaasId?: string | null
  paymentMethod?: string | null
  status?: SubscriptionStatus
  billingCycleStartDate?: Date
  billingCycleEndDate?: Date
  nextResetDate?: Date
  purchaseDate?: Date | null
  expiresAt?: Date | null
  trialEndsAt?: Date | null
  canceledAtPeriodEnd?: boolean
  isActive?: boolean
  pixAutomaticAuthId?: string | null
  failureReason?: string | null
  failureCount?: number
  lastFailureAt?: Date | null
  nextRetryAt?: Date | null
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
        status: 'connected',
      },
      _count: { _all: true },
    }),
    prisma.metaAdAccount.groupBy({
      by: ['projectId'],
      where: {
        organizationId,
        isActive: true,
      },
      _count: { _all: true },
    }),
  ])

  return {
    projects,
    whatsappByProject: whatsappByProject.map((entry: { _count: { _all: number } }) => entry._count._all),
    metaByProject: metaByProject.map((entry: { _count: { _all: number } }) => entry._count._all),
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
  }
}

async function getTrialSubscription(organizationId: string) {
  return prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: {
      trialEndsAt: true,
      isActive: true,
      paymentMethod: true,
    },
  })
}

function isTrialStillActive(trialEndsAt: Date | null | undefined) {
  return Boolean(trialEndsAt && trialEndsAt.getTime() > Date.now())
}

export async function assertProjectCreationAllowed(organizationId: string) {
  const subscription = await getTrialSubscription(organizationId)
  if (!subscription || subscription.isActive || !isTrialStillActive(subscription.trialEndsAt)) {
    return
  }

  const currentProjects = await prisma.project.count({
    where: { organizationId },
  })

  if (currentProjects >= DEFAULT_TRIAL_PROJECT_LIMIT) {
    throw new Error('O trial libera apenas 1 cliente ativo. Contrate um plano para criar outro projeto.')
  }
}

export async function assertWhatsAppAllowedForProject(input: {
  organizationId: string
  projectId: string | null
}) {
  if (!input.projectId) return

  const subscription = await getTrialSubscription(input.organizationId)
  if (!subscription || subscription.isActive || !isTrialStillActive(subscription.trialEndsAt)) {
    return
  }

  const count = await prisma.whatsAppConfig.count({
    where: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      status: 'connected',
    },
  })

  if (count >= DEFAULT_TRIAL_RESOURCE_LIMIT) {
    throw new Error('O trial libera apenas 1 número de WhatsApp por cliente.')
  }
}

export async function assertMetaAdAccountAllowedForProject(input: {
  organizationId: string
  projectId: string | null
}) {
  if (!input.projectId) return

  const subscription = await getTrialSubscription(input.organizationId)
  if (!subscription || subscription.isActive || !isTrialStillActive(subscription.trialEndsAt)) {
    return
  }

  const count = await prisma.metaAdAccount.count({
    where: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      isActive: true,
    },
  })

  if (count >= DEFAULT_TRIAL_RESOURCE_LIMIT) {
    throw new Error('O trial libera apenas 1 conta Meta Ads por cliente.')
  }
}

export async function createSubscription(params: CreateSubscriptionParams): Promise<void> {
  const existing = await prisma.billingSubscription.findUnique({
    where: { organizationId: params.organizationId },
  })

  if (existing && existing.isActive && params.status === 'active') {
    throw new SubscriptionAlreadyExistsError(params.organizationId)
  }

  const plan = await getBillingPlanBySlug(params.planType)
  if (!plan) {
    throw new Error(`Billing plan not found for slug: ${params.planType}`)
  }

  const cycleStartDate = params.billingCycleStartDate ?? new Date()
  const cycleEndDate = params.billingCycleEndDate ?? new Date(cycleStartDate)
  const nextResetDate = params.nextResetDate ?? cycleEndDate

  const subscriptionData = {
    organizationId: params.organizationId,
    planId: plan.id,
    offerId: params.offerId ?? null,
    provider: params.provider ?? 'asaas',
    providerCustomerId: params.providerCustomerId ?? params.organizationId,
    providerSubscriptionId: params.providerSubscriptionId ?? null,
    asaasCustomerId: params.asaasCustomerId ?? null,
    asaasId: params.asaasId ?? null,
    billingCycleStartDate: cycleStartDate,
    billingCycleEndDate: cycleEndDate,
    nextResetDate,
    trialEndsAt: params.trialEndsAt ?? null,
    purchaseDate: params.purchaseDate ?? null,
    expiresAt: params.expiresAt ?? null,
    status: params.status ?? 'pending',
    canceledAtPeriodEnd: params.canceledAtPeriodEnd ?? false,
    paymentMethod: params.paymentMethod ?? null,
    isActive: params.isActive ?? false,
    pixAutomaticAuthId: params.pixAutomaticAuthId ?? null,
    failureReason: params.failureReason ?? null,
    failureCount: params.failureCount ?? 0,
    lastFailureAt: params.lastFailureAt ?? null,
    nextRetryAt: params.nextRetryAt ?? null,
  }

  if (existing) {
    await prisma.billingSubscription.update({
      where: { id: existing.id },
      data: subscriptionData,
    })
    return
  }

  await prisma.billingSubscription.create({
    data: subscriptionData,
  })
}

export async function startOrganizationTrial(params: StartOrganizationTrialParams) {
  const existing = await prisma.billingSubscription.findUnique({
    where: { organizationId: params.organizationId },
    select: {
      id: true,
      organizationId: true,
      trialEndsAt: true,
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
      provider: 'asaas',
      providerCustomerId: `trial_${params.organizationId}`,
      providerSubscriptionId: null,
      planId: plan.id,
      billingCycleStartDate: cycleStartDate,
      billingCycleEndDate: cycleEndDate,
      nextResetDate: cycleEndDate,
      trialEndsAt: cycleEndDate,
      purchaseDate: null,
      expiresAt: cycleEndDate,
      status: 'pending',
      canceledAtPeriodEnd: false,
      paymentMethod: null,
      isActive: false,
    },
    select: {
      id: true,
      organizationId: true,
      trialEndsAt: true,
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
      plan: {
        select: {
          includedProjects: true,
          includedWhatsAppPerProject: true,
          includedMetaAdAccountsPerProject: true,
          includedConversionsPerProject: true,
        },
      },
    },
  })

  if (!subscription?.plan) {
    return null
  }

  return getOrganizationBillingEntitlements(organizationId, {
    includedProjects: subscription.plan.includedProjects,
    includedWhatsAppPerProject: subscription.plan.includedWhatsAppPerProject,
    includedMetaAdAccountsPerProject: subscription.plan.includedMetaAdAccountsPerProject,
    includedConversionsPerProject: subscription.plan.includedConversionsPerProject,
  })
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
      asaasId: true,
      asaasCustomerId: true,
      paymentMethod: true,
      isActive: true,
      purchaseDate: true,
      expiresAt: true,
      failureReason: true,
      failureCount: true,
      plan: {
        select: {
          slug: true,
          name: true,
          includedProjects: true,
          includedWhatsAppPerProject: true,
          includedMetaAdAccountsPerProject: true,
          includedConversionsPerProject: true,
        },
      },
      offer: {
        select: {
          code: true,
        },
      },
      invoices: {
        orderBy: [{ createdAt: 'desc' }],
        take: 1,
        select: {
          id: true,
          asaasId: true,
          status: true,
          paymentMethod: true,
          value: true,
          dueDate: true,
          paidAt: true,
          invoiceUrl: true,
          pixQrCodePayload: true,
          pixQrCodeImage: true,
          pixExpirationDate: true,
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
  })

  const lastInvoice = subscription.invoices[0] ?? null

  return {
    ...subscription,
    planType: subscription.plan?.slug ?? 'monthly',
    planName: subscription.plan?.name ?? null,
    offerCode: subscription.offer?.code ?? null,
    entitlements,
    lastInvoice: lastInvoice
      ? {
          ...lastInvoice,
          value: Number(lastInvoice.value),
        }
      : null,
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
      isActive: validatedStatus === 'active',
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
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: {
      id: true,
      status: true,
    },
  })

  if (!subscription) {
    throw new SubscriptionNotFoundError(organizationId)
  }

  const updatedSubscription = await prisma.billingSubscription.update({
    where: { id: subscription.id },
    data: atPeriodEnd
      ? {
          canceledAtPeriodEnd: true,
        }
      : {
          status: 'canceled',
          isActive: false,
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
