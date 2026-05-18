import "server-only"
import { prisma } from '@/lib/db/prisma'

export type PlanChangeReason = 'trial_to_paid' | 'manual' | 'auto_upgrade' | 'downgrade'

export interface RecordPlanChangeInput {
  subscriptionId: string
  planId: string
  reason: PlanChangeReason
  projectCount: number
}

export class BillingPlanHistoryService {
  async recordPlanChange(input: RecordPlanChangeInput) {
    const { subscriptionId, planId, reason, projectCount } = input

    return prisma.billingPlanHistory.create({
      data: {
        subscriptionId,
        planId,
        reason,
        projectCountAtChange: projectCount,
        startedAt: new Date(),
        endedAt: null,
      },
      include: {
        plan: true,
        subscription: true,
      },
    })
  }

  async getCurrentPlan(subscriptionId: string) {
    const history = await prisma.billingPlanHistory.findFirst({
      where: {
        subscriptionId,
        endedAt: null,
      },
      include: {
        plan: true,
      },
    })

    return history?.plan || null
  }

  async getHistory(subscriptionId: string, options?: { limit?: number; offset?: number }) {
    return prisma.billingPlanHistory.findMany({
      where: { subscriptionId },
      orderBy: { startedAt: 'desc' },
      take: options?.limit,
      skip: options?.offset,
      include: {
        plan: true,
      },
    })
  }

  async closePreviousPlan(subscriptionId: string) {
    const previous = await prisma.billingPlanHistory.findFirst({
      where: {
        subscriptionId,
        endedAt: null,
      },
    })

    if (!previous) {
      return null
    }

    return prisma.billingPlanHistory.update({
      where: { id: previous.id },
      data: { endedAt: new Date() },
    })
  }
}

export const billingPlanHistoryService = new BillingPlanHistoryService()
