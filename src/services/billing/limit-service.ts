import type { Plan, SubscriptionStatus } from '@prisma/client'
import { prisma as defaultPrisma } from '@/lib/prisma'

/**
 * Prisma client type for dependency injection
 */
type PrismaClient = typeof defaultPrisma

/**
 * Plan limits returned from the service
 */
export interface OrganizationLimits {
  maxMetaProfiles: number
  maxMetaAdAccounts: number
  maxWhatsappInstances: number
  maxMembers: number
  maxLeadsPerMonth: number | null
  maxMessagesPerMonth: number | null
  messageRetentionDays: number | null
  maxMessagesStored: number | null
}

/**
 * Usage statistics for a single resource
 */
export interface UsageStat {
  used: number
  limit: number
  percentage: number
}

/**
 * Complete usage statistics for an organization
 */
export interface UsageStats {
  metaProfiles: UsageStat
  metaAdAccounts: UsageStat
  whatsappInstances: UsageStat
  members: UsageStat
  // Future: leadsThisMonth, messagesThisMonth
}

/**
 * Resource types that can be checked for limits
 */
export type LimitableResource = 'metaProfiles' | 'metaAdAccounts' | 'whatsappInstances' | 'members'

/**
 * Result of checking if a resource creation is allowed
 */
export interface LimitCheckResult {
  allowed: boolean
  current: number
  limit: number
  message?: string
}

/**
 * Default limits for organizations without active subscription (free tier)
 */
const FREE_TIER_LIMITS: OrganizationLimits = {
  maxMetaProfiles: 0,
  maxMetaAdAccounts: 0,
  maxWhatsappInstances: 1,
  maxMembers: 1,
  maxLeadsPerMonth: null,
  maxMessagesPerMonth: null,
  messageRetentionDays: 7,
  maxMessagesStored: 1000,
}

/**
 * Statuses considered as having an active subscription
 */
const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'past_due']

/**
 * LimitService handles checking and enforcing organization resource limits.
 * Provides methods to get limits from plans, check usage, and verify if
 * resources can be created within plan constraints.
 */
export class LimitService {
  private prisma: PrismaClient

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma
  }

  /**
   * Get the limits for an organization based on their subscription plan.
   * Returns free tier limits if no active subscription exists.
   */
  async getOrganizationLimits(organizationId: string): Promise<OrganizationLimits> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        billingCustomer: { organizationId },
        status: { in: ACTIVE_STATUSES },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      return FREE_TIER_LIMITS
    }

    return this.extractLimitsFromPlan(subscription.plan)
  }

  /**
   * Extract limits from a Plan object
   */
  private extractLimitsFromPlan(plan: Plan): OrganizationLimits {
    return {
      maxMetaProfiles: plan.maxMetaProfiles,
      maxMetaAdAccounts: plan.maxMetaAdAccounts,
      maxWhatsappInstances: plan.maxWhatsappInstances,
      maxMembers: plan.maxMembers,
      maxLeadsPerMonth: plan.maxLeadsPerMonth,
      maxMessagesPerMonth: plan.maxMessagesPerMonth,
      messageRetentionDays: plan.messageRetentionDays,
      maxMessagesStored: plan.maxMessagesStored,
    }
  }

  /**
   * Get current resource counts for an organization.
   * Uses a single query with parallel counts for efficiency.
   */
  async getResourceCounts(organizationId: string): Promise<{
    members: number
    whatsappInstances: number
    metaProfiles: number
    metaAdAccounts: number
  }> {
    const [membersCount, whatsappCount] = await Promise.all([
      this.prisma.member.count({ where: { organizationId } }),
      this.prisma.whatsappInstance.count({ where: { organizationId } }),
      // TODO: Add Meta profiles/ad accounts count when models are implemented
    ])

    return {
      members: membersCount,
      whatsappInstances: whatsappCount,
      metaProfiles: 0, // TODO: implement when Meta Ads feature is ready
      metaAdAccounts: 0, // TODO: implement when Meta Ads feature is ready
    }
  }

  /**
   * Get complete usage statistics for an organization.
   * Combines limits and current usage into a single response.
   */
  async getUsageStats(organizationId: string): Promise<UsageStats> {
    const [limits, counts] = await Promise.all([
      this.getOrganizationLimits(organizationId),
      this.getResourceCounts(organizationId),
    ])

    return {
      metaProfiles: this.calculateUsageStat(counts.metaProfiles, limits.maxMetaProfiles),
      metaAdAccounts: this.calculateUsageStat(counts.metaAdAccounts, limits.maxMetaAdAccounts),
      whatsappInstances: this.calculateUsageStat(counts.whatsappInstances, limits.maxWhatsappInstances),
      members: this.calculateUsageStat(counts.members, limits.maxMembers),
    }
  }

  /**
   * Calculate usage statistic with percentage
   */
  private calculateUsageStat(used: number, limit: number): UsageStat {
    const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0
    return { used, limit, percentage }
  }

  /**
   * Check if creating a new resource is allowed within plan limits.
   * Returns detailed information about the limit status.
   */
  async checkLimit(organizationId: string, resource: LimitableResource): Promise<LimitCheckResult> {
    const stats = await this.getUsageStats(organizationId)
    const stat = stats[resource]

    const allowed = stat.used < stat.limit
    return {
      allowed,
      current: stat.used,
      limit: stat.limit,
      message: allowed
        ? undefined
        : `Limite de ${this.getResourceLabel(resource)} atingido (${stat.used}/${stat.limit})`,
    }
  }

  /**
   * Check if organization can add a specific quantity of resources
   */
  async canAdd(
    organizationId: string,
    resource: LimitableResource,
    quantity: number = 1
  ): Promise<LimitCheckResult> {
    const stats = await this.getUsageStats(organizationId)
    const stat = stats[resource]

    const newTotal = stat.used + quantity
    const allowed = newTotal <= stat.limit

    return {
      allowed,
      current: stat.used,
      limit: stat.limit,
      message: allowed
        ? undefined
        : `Não é possível adicionar ${quantity} ${this.getResourceLabel(resource)}. ` +
          `Atual: ${stat.used}, Limite: ${stat.limit}`,
    }
  }

  /**
   * Get human-readable label for a resource type
   */
  private getResourceLabel(resource: LimitableResource): string {
    const labels: Record<LimitableResource, string> = {
      metaProfiles: 'perfis Meta Ads',
      metaAdAccounts: 'contas de anúncio',
      whatsappInstances: 'instâncias WhatsApp',
      members: 'membros',
    }
    return labels[resource]
  }
}
