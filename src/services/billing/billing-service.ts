import type { BillingProvider, PlanInterval } from '@prisma/client'
import type { IBillingProvider } from './provider'
import type { BillingType, TokenizeCardResult } from './types'
import { AsaasProvider } from './providers'
import { PlanService } from './plan-service'
import { SubscriptionService, type SubscriptionWithRelations } from './subscription-service'
import {
  BillingCustomerService,
  type BillingCustomerWithExternals,
} from './billing-customer-service'
import { prisma } from '@/lib/prisma'

/**
 * Parameters for creating a subscription
 */
export interface CreateSubscriptionParams {
  organizationId: string
  planId: string
  interval: PlanInterval
  billingType: BillingType
  cardToken?: string
}

/**
 * Parameters for tokenizing a card
 */
export interface TokenizeCardParams {
  billingCustomerId: string
  cardNumber: string
  cardHolder: string
  expiryMonth: string
  expiryYear: string
  cvv: string
}

/**
 * Options for canceling a subscription
 */
export interface CancelSubscriptionOptions {
  immediate: boolean
}

/**
 * Parameters for changing subscription plan
 */
export interface ChangePlanParams {
  subscriptionId: string
  newPlanId: string
  newInterval?: PlanInterval
}

/**
 * Result of a plan change
 */
export interface ChangePlanResult {
  subscription: SubscriptionWithRelations
  creditCents: number
  newAmountCents: number
}

/**
 * Dependencies for BillingService
 */
export interface BillingServiceDeps {
  provider?: IBillingProvider
  planService?: PlanService
  customerService?: BillingCustomerService
  subscriptionService?: SubscriptionService
  getOrganization?: (id: string) => Promise<{
    id: string
    name: string
    owner: { email: string }
  } | null>
}

/**
 * BillingService orchestrates all billing operations.
 * Coordinates between the application layer, database services, and payment providers.
 */
export class BillingService {
  private provider: IBillingProvider
  private planService: PlanService
  private customerService: BillingCustomerService
  private subscriptionService: SubscriptionService
  private getOrganization: (id: string) => Promise<{
    id: string
    name: string
    owner: { email: string }
  } | null>

  constructor(deps: BillingServiceDeps = {}) {
    this.provider = deps.provider || this.resolveProvider('asaas')
    this.planService = deps.planService || new PlanService()
    this.customerService = deps.customerService || new BillingCustomerService()
    this.subscriptionService = deps.subscriptionService || new SubscriptionService()
    this.getOrganization = deps.getOrganization || this.defaultGetOrganization
  }

  /**
   * Resolve provider implementation by type
   */
  private resolveProvider(type: BillingProvider): IBillingProvider {
    switch (type) {
      case 'asaas':
        return new AsaasProvider()
      case 'stripe':
        throw new Error('Stripe provider not yet implemented')
      default:
        throw new Error(`Unknown provider: ${type}`)
    }
  }

  /**
   * Default organization lookup
   */
  private async defaultGetOrganization(id: string) {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          where: { role: 'owner' },
          include: { user: { select: { email: true } } },
          take: 1,
        },
      },
    })
    if (!org) return null
    const ownerMember = org.members[0]
    return {
      id: org.id,
      name: org.name,
      owner: { email: ownerMember?.user.email ?? '' },
    }
  }

  /**
   * Get the current provider type
   */
  getProviderType(): BillingProvider {
    return this.provider.provider
  }

  /**
   * Get or create a billing customer for an organization
   */
  async getOrCreateCustomer(organizationId: string): Promise<BillingCustomerWithExternals> {
    // Check if customer already exists
    const existing = await this.customerService.getByOrganizationId(organizationId)
    if (existing) {
      return existing
    }

    // Get organization data
    const org = await this.getOrganization(organizationId)
    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`)
    }

    // Create customer in provider
    const providerResult = await this.provider.createCustomer({
      email: org.owner.email,
      name: org.name,
    })

    // Create customer in database
    const customer = await this.customerService.create({
      organizationId,
      email: org.owner.email,
      name: org.name,
    })

    // Add external ID
    await this.customerService.addExternalId(
      customer.id,
      this.provider.provider,
      providerResult.externalId
    )

    // Return with updated external customers
    return this.customerService.getById(customer.id) as Promise<BillingCustomerWithExternals>
  }

  /**
   * Create a subscription for an organization
   */
  async createSubscription(
    params: CreateSubscriptionParams
  ): Promise<SubscriptionWithRelations> {
    // Get or create billing customer
    const customer = await this.getOrCreateCustomer(params.organizationId)

    // Get plan
    const plan = await this.planService.getPlanById(params.planId)
    if (!plan) {
      throw new Error('Plan not found')
    }

    // Get price for this provider/interval
    const price = await this.planService.getPlanPrice({
      planId: params.planId,
      provider: this.provider.provider,
      currency: 'BRL', // TODO: Make configurable
      interval: params.interval,
    })
    if (!price) {
      throw new Error('Price not found for this plan/provider/interval')
    }

    // Get customer's external ID for this provider
    const externalCustomerId = await this.customerService.getExternalIdForProvider(
      customer.id,
      this.provider.provider
    )
    if (!externalCustomerId) {
      throw new Error('Customer not registered with provider')
    }

    // Create subscription in provider
    const providerResult = await this.provider.createSubscription({
      customerId: externalCustomerId,
      planId: params.planId,
      interval: params.interval === 'monthly' ? 'monthly' : 'yearly',
      billingType: params.billingType,
      paymentMethodToken: params.cardToken,
    })

    // Create subscription in database
    const subscription = await this.subscriptionService.create({
      billingCustomerId: customer.id,
      planId: params.planId,
      provider: this.provider.provider,
      externalId: providerResult.externalId,
      status: providerResult.status === 'active' ? 'active' : 'incomplete',
      interval: params.interval,
      currentPeriodStart: providerResult.currentPeriodStart,
      currentPeriodEnd: providerResult.currentPeriodEnd,
    })

    return subscription
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    options: CancelSubscriptionOptions
  ): Promise<SubscriptionWithRelations> {
    // Get subscription
    const subscription = await this.subscriptionService.getById(subscriptionId)
    if (!subscription) {
      throw new Error('Subscription not found')
    }

    // Cancel in provider
    if (subscription.externalId) {
      await this.provider.cancelSubscription({
        externalId: subscription.externalId,
        cancelAtPeriodEnd: !options.immediate,
      })
    }

    // Cancel in database
    const canceled = await this.subscriptionService.cancel(subscriptionId, options)

    return canceled as SubscriptionWithRelations
  }

  /**
   * Tokenize a credit card
   */
  async tokenizeCard(params: TokenizeCardParams): Promise<TokenizeCardResult> {
    // Get customer's external ID
    const externalCustomerId = await this.customerService.getExternalIdForProvider(
      params.billingCustomerId,
      this.provider.provider
    )
    if (!externalCustomerId) {
      throw new Error('Customer not registered with provider')
    }

    // Tokenize via provider
    const result = await this.provider.tokenizeCard({
      customerId: externalCustomerId,
      cardNumber: params.cardNumber,
      cardHolder: params.cardHolder,
      expiryMonth: params.expiryMonth,
      expiryYear: params.expiryYear,
      cvv: params.cvv,
    })

    return result
  }

  /**
   * Get active subscription for an organization
   */
  async getActiveSubscription(organizationId: string): Promise<SubscriptionWithRelations | null> {
    const customer = await this.customerService.getByOrganizationId(organizationId)
    if (!customer) {
      return null
    }

    const subscription = await this.subscriptionService.getByBillingCustomerId(customer.id)
    if (!subscription) {
      return null
    }

    return this.subscriptionService.getById(subscription.id)
  }

  /**
   * Change subscription plan (upgrade or downgrade)
   */
  async changePlan(params: ChangePlanParams): Promise<ChangePlanResult> {
    // Get current subscription
    const subscription = await this.subscriptionService.getById(params.subscriptionId)
    if (!subscription) {
      throw new Error('Subscription not found')
    }

    // Get new plan
    const newPlan = await this.planService.getPlanById(params.newPlanId)
    if (!newPlan) {
      throw new Error('New plan not found')
    }

    const newInterval = params.newInterval ?? subscription.interval

    // Get current price for credit calculation
    const currentPrice = await this.planService.getPlanPrice({
      planId: subscription.planId,
      provider: subscription.provider,
      currency: 'BRL',
      interval: subscription.interval,
    })

    // Get new price
    const newPrice = await this.planService.getPlanPrice({
      planId: params.newPlanId,
      provider: this.provider.provider,
      currency: 'BRL',
      interval: newInterval,
    })
    if (!newPrice) {
      throw new Error('Price not found for new plan')
    }

    // Calculate pro-rata credit
    const now = new Date()
    const periodStart = subscription.currentPeriodStart
    const periodEnd = subscription.currentPeriodEnd

    let creditCents = 0
    if (periodStart && periodEnd && currentPrice) {
      const totalDays = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)))
      const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      const creditPercentage = daysRemaining / totalDays
      creditCents = Math.floor(currentPrice.amountCents * creditPercentage)
    }

    // Update subscription in database
    const updated = await prisma.subscription.update({
      where: { id: params.subscriptionId },
      data: {
        planId: params.newPlanId,
        interval: newInterval,
      },
      include: {
        plan: true,
        billingCustomer: true,
      },
    })

    return {
      subscription: updated,
      creditCents,
      newAmountCents: newPrice.amountCents,
    }
  }

  /**
   * Reactivate a canceled subscription (if still within period)
   */
  async reactivateSubscription(subscriptionId: string): Promise<SubscriptionWithRelations> {
    const subscription = await this.subscriptionService.getById(subscriptionId)
    if (!subscription) {
      throw new Error('Subscription not found')
    }

    if (subscription.status !== 'canceled' || !subscription.cancelAtPeriodEnd) {
      throw new Error('Subscription cannot be reactivated')
    }

    // Check if still within period
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date()) {
      throw new Error('Subscription period has ended, please create a new subscription')
    }

    // Reactivate in database
    const reactivated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'active',
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
      include: {
        plan: true,
        billingCustomer: true,
      },
    })

    return reactivated
  }
}
