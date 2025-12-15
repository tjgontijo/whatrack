import type { BillingProvider, Plan, PlanInterval, PlanPrice } from '@prisma/client'
import { prisma as defaultPrisma } from '@/lib/prisma'

/**
 * Parameters for getting a plan price
 */
export interface GetPlanPriceParams {
  planId: string
  provider: BillingProvider
  currency: string
  interval: PlanInterval
}

/**
 * Plan with prices included
 */
export type PlanWithPrices = Plan & {
  prices: PlanPrice[]
}

/**
 * PlanPrice with plan included
 */
export type PlanPriceWithPlan = PlanPrice & {
  plan: Plan
}

/**
 * Prisma client type for dependency injection
 */
type PrismaClient = typeof defaultPrisma

/**
 * PlanService handles plan lookup and pricing operations.
 * Provides methods to query plans and their prices from the database.
 */
export class PlanService {
  private prisma: PrismaClient

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma
  }

  /**
   * List all active plans sorted by sortOrder
   */
  async listActivePlans(): Promise<PlanWithPrices[]> {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { prices: true },
    })
  }

  /**
   * Get a plan by its ID
   */
  async getPlanById(id: string): Promise<PlanWithPrices | null> {
    return this.prisma.plan.findUnique({
      where: { id },
      include: { prices: true },
    })
  }

  /**
   * Get a plan by its slug (e.g., 'starter', 'pro')
   */
  async getPlanBySlug(slug: string): Promise<PlanWithPrices | null> {
    return this.prisma.plan.findFirst({
      where: { slug, isActive: true },
      include: { prices: true },
    })
  }

  /**
   * Get the price for a specific plan/provider/currency/interval combination
   */
  async getPlanPrice(params: GetPlanPriceParams): Promise<PlanPriceWithPlan | null> {
    return this.prisma.planPrice.findFirst({
      where: {
        planId: params.planId,
        provider: params.provider,
        currency: params.currency,
        interval: params.interval,
        isActive: true,
      },
      include: { plan: true },
    })
  }

  /**
   * Get the default billing provider for a currency
   * - BRL -> Asaas (Brazilian payment gateway)
   * - USD/other -> Stripe (international)
   */
  getDefaultProviderForCurrency(currency: string): BillingProvider {
    if (currency === 'BRL') {
      return 'asaas'
    }
    return 'stripe'
  }
}
