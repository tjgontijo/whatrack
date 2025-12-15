import type {
  BillingProvider,
  Plan,
  PlanInterval,
  Subscription,
  SubscriptionStatus,
  BillingCustomer,
  Invoice,
} from '@prisma/client'
import { prisma as defaultPrisma } from '@/lib/prisma'

/**
 * Subscription with plan included
 */
export type SubscriptionWithPlan = Subscription & {
  plan: Plan
}

/**
 * Subscription with full relations
 */
export type SubscriptionWithRelations = Subscription & {
  plan: Plan
  billingCustomer: BillingCustomer
  invoices?: Invoice[]
}

/**
 * Data required to create a subscription
 */
export interface CreateSubscriptionData {
  billingCustomerId: string
  planId: string
  provider: BillingProvider
  externalId?: string
  status: SubscriptionStatus
  interval: PlanInterval
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  trialStart?: Date
  trialEnd?: Date
}

/**
 * Options for canceling a subscription
 */
export interface CancelOptions {
  immediate: boolean
}

/**
 * Prisma client type for dependency injection
 */
type PrismaClient = typeof defaultPrisma

/**
 * SubscriptionService handles subscription database operations.
 * Manages CRUD operations and status updates for subscriptions.
 */
export class SubscriptionService {
  private prisma: PrismaClient

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma
  }

  /**
   * Get subscription by ID with full relations
   */
  async getById(id: string): Promise<SubscriptionWithRelations | null> {
    return this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: true, billingCustomer: true, invoices: true },
    })
  }

  /**
   * Get subscription by provider and external ID
   */
  async getByExternalId(
    provider: BillingProvider,
    externalId: string
  ): Promise<SubscriptionWithRelations | null> {
    return this.prisma.subscription.findFirst({
      where: { provider, externalId },
      include: { plan: true, billingCustomer: true },
    })
  }

  /**
   * Get active subscription for a billing customer
   */
  async getByBillingCustomerId(billingCustomerId: string): Promise<SubscriptionWithPlan | null> {
    return this.prisma.subscription.findFirst({
      where: {
        billingCustomerId,
        status: { in: ['active', 'trialing', 'past_due'] },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * List all subscriptions for an organization
   */
  async listByOrganization(organizationId: string): Promise<SubscriptionWithPlan[]> {
    return this.prisma.subscription.findMany({
      where: { billingCustomer: { organizationId } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Create a new subscription
   */
  async create(data: CreateSubscriptionData): Promise<SubscriptionWithRelations> {
    return this.prisma.subscription.create({
      data,
      include: { plan: true, billingCustomer: true },
    })
  }

  /**
   * Update subscription status
   */
  async updateStatus(id: string, status: SubscriptionStatus): Promise<SubscriptionWithPlan> {
    return this.prisma.subscription.update({
      where: { id },
      data: { status },
      include: { plan: true },
    })
  }

  /**
   * Renew subscription period
   */
  async renewPeriod(
    id: string,
    currentPeriodStart: Date,
    currentPeriodEnd: Date
  ): Promise<SubscriptionWithPlan> {
    return this.prisma.subscription.update({
      where: { id },
      data: { currentPeriodStart, currentPeriodEnd },
      include: { plan: true },
    })
  }

  /**
   * Cancel a subscription
   */
  async cancel(id: string, options: CancelOptions): Promise<SubscriptionWithPlan> {
    if (options.immediate) {
      return this.prisma.subscription.update({
        where: { id },
        data: {
          status: 'canceled',
          canceledAt: new Date(),
          cancelAtPeriodEnd: false,
        },
        include: { plan: true },
      })
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { cancelAtPeriodEnd: true },
      include: { plan: true },
    })
  }

  /**
   * Update subscription external ID after provider sync
   */
  async updateExternalId(id: string, externalId: string): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { id },
      data: { externalId },
    })
  }
}
