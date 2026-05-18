import { prisma } from '@/lib/db/prisma'

export class BillingPlanDetectionService {
  async detectRequiredPlan(projectCount: number): Promise<string | null> {
    const plans = await prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: { includedProjects: 'asc' },
      select: {
        id: true,
        code: true,
        includedProjects: true,
      },
    })

    if (plans.length === 0) {
      return null
    }

    for (const plan of plans) {
      if (projectCount <= plan.includedProjects) {
        return plan.id
      }
    }

    return plans[plans.length - 1].id
  }

  async isUpgradeNeeded(currentPlanId: string, projectCount: number): Promise<boolean> {
    const currentPlan = await prisma.billingPlan.findUnique({
      where: { id: currentPlanId },
      select: { includedProjects: true },
    })

    if (!currentPlan) {
      return false
    }

    return projectCount > currentPlan.includedProjects
  }

  async findSmallestPlanThatFits(
    projectCount: number
  ): Promise<{ id: string; code: string } | null> {
    const plan = await prisma.billingPlan.findFirst({
      where: {
        isActive: true,
        includedProjects: {
          gte: projectCount,
        },
      },
      orderBy: { includedProjects: 'asc' },
      select: {
        id: true,
        code: true,
      },
    })

    return plan || null
  }
}

export const billingPlanDetectionService = new BillingPlanDetectionService()
