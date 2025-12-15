/**
 * AI Credits Service
 * Manages AI credit balance, consumption, and provisioning
 */

import { prisma } from '@/lib/prisma'
import type {
  AIAction,
  ConsumeCreditsParams,
  CreditsInfo,
  CanUseCreditsResult,
  ConsumeCreditsResult,
} from './types'
import { AI_CREDIT_COSTS } from './types'

export class AICreditsService {
  /**
   * Check if organization has enough credits for an action
   */
  async hasCredits(organizationId: string, action: AIAction): Promise<boolean> {
    const amount = AI_CREDIT_COSTS[action]
    const result = await this.canUseCredits(organizationId, amount)
    return result.allowed
  }

  /**
   * Check if credits can be used with detailed reason
   */
  async canUseCredits(
    organizationId: string,
    amount: number
  ): Promise<CanUseCreditsResult> {
    // 1. Get active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        billingCustomer: { organizationId },
        status: { in: ['active', 'trialing', 'past_due'] },
      },
      include: { plan: true },
    })

    if (!subscription) {
      return { allowed: false, reason: 'subscription_inactive' }
    }

    // 2. Check if plan has AI credits
    if (subscription.plan.aiCreditsQuota === 0) {
      return { allowed: false, reason: 'plan_no_ai' }
    }

    // 3. Check balance
    const credits = await prisma.aICredits.findUnique({
      where: { organizationId },
    })

    if (!credits || credits.balance < amount) {
      return { allowed: false, reason: 'no_credits' }
    }

    return { allowed: true }
  }

  /**
   * Consume credits for an AI action
   */
  async consumeCredits(params: ConsumeCreditsParams): Promise<ConsumeCreditsResult> {
    const {
      organizationId,
      amount,
      action,
      ticketId,
      contactPhone,
      metadata,
      triggeredBy,
    } = params

    // Verify credits available
    const canUse = await this.canUseCredits(organizationId, amount)
    if (!canUse.allowed) {
      throw new Error(`Cannot use credits: ${canUse.reason}`)
    }

    // Atomic transaction: decrement balance and log usage
    const result = await prisma.$transaction(async (tx) => {
      const credits = await tx.aICredits.update({
        where: { organizationId },
        data: {
          balance: { decrement: amount },
          usedThisCycle: { increment: amount },
        },
      })

      await tx.aIUsageLog.create({
        data: {
          organizationId,
          aiCreditsId: credits.id,
          action,
          creditsUsed: amount,
          ticketId,
          contactPhone,
          model: metadata?.model,
          inputTokens: metadata?.inputTokens,
          outputTokens: metadata?.outputTokens,
          latencyMs: metadata?.latencyMs,
          triggeredBy,
        },
      })

      return credits
    })

    return { success: true, newBalance: result.balance }
  }

  /**
   * Get credits info for an organization
   */
  async getCredits(organizationId: string): Promise<CreditsInfo | null> {
    const credits = await prisma.aICredits.findUnique({
      where: { organizationId },
    })

    const subscription = await prisma.subscription.findFirst({
      where: {
        billingCustomer: { organizationId },
        status: { in: ['active', 'trialing', 'past_due'] },
      },
      include: { plan: true },
    })

    if (!credits || !subscription) {
      return null
    }

    return {
      balance: credits.balance,
      usedThisCycle: credits.usedThisCycle,
      quota: subscription.plan.aiCreditsQuota,
      planName: subscription.plan.name,
      nextBillingDate: subscription.currentPeriodEnd ?? undefined,
    }
  }

  /**
   * Add credits to organization (called by webhook)
   */
  async addCredits(organizationId: string, amount: number): Promise<void> {
    await prisma.aICredits.upsert({
      where: { organizationId },
      create: {
        organizationId,
        balance: amount,
        usedThisCycle: 0,
        lastCreditedAt: new Date(),
      },
      update: {
        balance: { increment: amount },
        usedThisCycle: 0,
        lastCreditedAt: new Date(),
      },
    })
  }

  /**
   * Handle subscription cancellation - zero out credits
   */
  async handleCancellation(organizationId: string): Promise<void> {
    const credits = await prisma.aICredits.findUnique({
      where: { organizationId },
    })

    if (credits) {
      await prisma.aICredits.update({
        where: { organizationId },
        data: {
          balanceAtCancellation: credits.balance,
          canceledAt: new Date(),
          balance: 0,
          usedThisCycle: 0,
        },
      })
    }
  }

  /**
   * Handle subscription reactivation - restore credits if within 30 days
   */
  async handleReactivation(organizationId: string): Promise<void> {
    const credits = await prisma.aICredits.findUnique({
      where: { organizationId },
    })

    if (!credits || !credits.canceledAt) return

    const daysSinceCancellation = Math.floor(
      (Date.now() - credits.canceledAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceCancellation <= 30 && credits.balanceAtCancellation) {
      await prisma.aICredits.update({
        where: { organizationId },
        data: {
          balance: credits.balanceAtCancellation,
          balanceAtCancellation: null,
          canceledAt: null,
        },
      })
    }
  }
}

export const aiCreditsService = new AICreditsService()
