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
  asaasCustomerId?: string | null
  asaasId?: string | null
  paymentMethod?: string | null
  status?: SubscriptionStatus
  purchaseDate?: Date | null
  expiresAt?: Date | null
  trialEndsAt?: Date | null
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

  if (existing && existing.isActive && params.status === 'ACTIVE' && !existing.canceledAt) {
    throw new SubscriptionAlreadyExistsError(params.organizationId)
  }

  const plan = await getBillingPlanBySlug(params.planType)
  if (!plan) {
    throw new Error(`Billing plan not found for slug: ${params.planType}`)
  }

  const status: SubscriptionStatus = params.status ?? 'PENDING'
  const paymentMethod = params.paymentMethod as any

  const subscriptionCreateData = {
    organizationId: params.organizationId,
    offerId: params.offerId ?? null,
    asaasCustomerId: params.asaasCustomerId ?? null,
    asaasId: params.asaasId ?? null,
    trialEndsAt: params.trialEndsAt,
    expiresAt: params.expiresAt,
    status,
    paymentMethod,
    isActive: params.isActive ?? false,
    pixAutomaticAuthId: params.pixAutomaticAuthId ?? null,
    failureReason: params.failureReason as any,
    failureCount: params.failureCount ?? 0,
    lastFailureAt: params.lastFailureAt ?? null,
    nextRetryAt: params.nextRetryAt ?? null,
    ...(params.purchaseDate ? { purchaseDate: params.purchaseDate } : {}),
  }

  const subscriptionUpdateData = {
    offerId: params.offerId ?? null,
    asaasCustomerId: params.asaasCustomerId ?? null,
    asaasId: params.asaasId ?? null,
    trialEndsAt: params.trialEndsAt,
    expiresAt: params.expiresAt,
    status,
    paymentMethod,
    isActive: params.isActive ?? false,
    pixAutomaticAuthId: params.pixAutomaticAuthId ?? null,
    failureReason: params.failureReason as any,
    failureCount: params.failureCount ?? 0,
    lastFailureAt: params.lastFailureAt ?? null,
    nextRetryAt: params.nextRetryAt ?? null,
  }

  if (existing) {
    await prisma.billingSubscription.update({
      where: { id: existing.id },
      data: subscriptionUpdateData,
    })
    return
  }

  await prisma.billingSubscription.create({
    data: subscriptionCreateData,
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
    },
  })

  if (existing) {
    return {
      id: existing.id,
      organizationId: existing.organizationId,
      trialEndsAt: existing.trialEndsAt,
      status: existing.status,
      planType: params.planType ?? null,
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
      trialEndsAt: cycleEndDate,
      expiresAt: cycleEndDate,
      status: 'PENDING',
      paymentMethod: null,
      isActive: false,
    },
    select: {
      id: true,
      organizationId: true,
      trialEndsAt: true,
      status: true,
    },
  })

  return {
    id: created.id,
    organizationId: created.organizationId,
    trialEndsAt: created.trialEndsAt,
    status: created.status,
    planType: params.planType ?? null,
  }
}

export async function syncOrganizationSubscriptionItems(organizationId: string) {
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: {
      offer: {
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
      },
    },
  })

  if (!subscription?.offer?.plan) {
    return null
  }

  return getOrganizationBillingEntitlements(organizationId, {
    includedProjects: subscription.offer.plan.includedProjects,
    includedWhatsAppPerProject: subscription.offer.plan.includedWhatsAppPerProject,
    includedMetaAdAccountsPerProject: subscription.offer.plan.includedMetaAdAccountsPerProject,
    includedConversionsPerProject: subscription.offer.plan.includedConversionsPerProject,
  })
}

export async function getActiveSubscription(organizationId: string) {
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: {
      id: true,
      organizationId: true,
      status: true,
      trialEndsAt: true,
      createdAt: true,
      canceledAt: true,
      asaasId: true,
      asaasCustomerId: true,
      paymentMethod: true,
      isActive: true,
      purchaseDate: true,
      expiresAt: true,
      failureReason: true,
      failureCount: true,
      lastFailureAt: true,
      lastFailureMessage: true,
      nextRetryAt: true,
      offer: {
        select: {
          code: true,
          plan: {
            select: {
              code: true,
              name: true,
              includedProjects: true,
              includedWhatsAppPerProject: true,
              includedMetaAdAccountsPerProject: true,
              includedConversionsPerProject: true,
            },
          },
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
    includedProjects: subscription.offer?.plan?.includedProjects ?? 0,
    includedWhatsAppPerProject: subscription.offer?.plan?.includedWhatsAppPerProject ?? 0,
    includedMetaAdAccountsPerProject: subscription.offer?.plan?.includedMetaAdAccountsPerProject ?? 0,
    includedConversionsPerProject: subscription.offer?.plan?.includedConversionsPerProject ?? 0,
  })

  const lastInvoice = subscription.invoices[0] ?? null

  return {
    ...subscription,
    planType: subscription.offer?.plan?.code ?? 'monthly',
    planName: subscription.offer?.plan?.name ?? null,
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
      isActive: validatedStatus === 'ACTIVE',
      ...(validatedStatus === 'CANCELED' && { canceledAt: new Date() }),
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
          // Defer cancellation - will be handled at period end
        }
      : {
          status: 'CANCELED',
          isActive: false,
          canceledAt: new Date(),
        },
    select: {
      status: true,
      canceledAt: true,
    },
  })

  return {
    status: ensureSubscriptionStatus(updatedSubscription.status),
    canceledAtPeriodEnd: atPeriodEnd,
    canceledAt: updatedSubscription.canceledAt,
  }
}
