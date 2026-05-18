import "server-only"
import { Prisma } from '@generated/prisma/client'
import { prisma } from '@/lib/db/prisma'
import { billingNotificationService } from './billing-notification.service'
import { billingPlanDetectionService } from './billing-plan-detection.service'
import { billingPlanHistoryService } from './billing-plan-history.service'
import { billingProratingService } from './billing-prorating.service'

export interface AutoUpgradeResult {
  upgraded: boolean
  oldPlanId: string | null
  newPlanId: string | null
  newPlanCode: string | null
  proratingResult?: {
    creditAmount: Prisma.Decimal
    chargeAmount: Prisma.Decimal
    netAmount: Prisma.Decimal
    daysRemaining: number
  }
  historyId: string | null
  invoiceId: string | null
}

export class BillingAutoUpgradeService {
  async performAutoUpgradeIfNeeded(
    organizationId: string,
    projectCount: number
  ): Promise<AutoUpgradeResult> {
    const subscription = await prisma.billingSubscription.findUnique({
      where: { organizationId },
      include: {
        currentPlan: true,
        offer: {
          include: {
            plan: true,
          },
        },
      },
    })

    if (!subscription?.currentPlan) {
      return {
        upgraded: false,
        oldPlanId: null,
        newPlanId: null,
        newPlanCode: null,
        historyId: null,
        invoiceId: null,
      }
    }

    const oldPlanId = subscription.currentPlan.id
    const oldPlanCode = subscription.currentPlan.code
    const currentIncludedProjects = subscription.currentPlan.includedProjects

    if (projectCount <= currentIncludedProjects) {
      return {
        upgraded: false,
        oldPlanId,
        newPlanId: null,
        newPlanCode: null,
        historyId: null,
        invoiceId: null,
      }
    }

    const newPlan = await billingPlanDetectionService.findSmallestPlanThatFits(projectCount)

    if (!newPlan || newPlan.id === oldPlanId) {
      return {
        upgraded: false,
        oldPlanId,
        newPlanId: null,
        newPlanCode: null,
        historyId: null,
        invoiceId: null,
      }
    }

    return prisma.$transaction(async (tx) => {
      const newPlanData = await tx.billingPlan.findUnique({
        where: { id: newPlan.id },
        include: {
          offers: {
            where: {
              paymentMethod: subscription.paymentMethod || 'CREDIT_CARD',
              isActive: true,
            },
            take: 1,
          },
        },
      })

      if (!newPlanData) {
        return {
          upgraded: false,
          oldPlanId,
          newPlanId: null,
          newPlanCode: null,
          historyId: null,
          invoiceId: null,
        }
      }

      const newOffer = newPlanData.offers[0]
      if (!newOffer) {
        return {
          upgraded: false,
          oldPlanId,
          newPlanId: null,
          newPlanCode: null,
          historyId: null,
          invoiceId: null,
        }
      }

      const oldOffer = subscription.offer
      if (!oldOffer) {
        return {
          upgraded: false,
          oldPlanId,
          newPlanId: null,
          newPlanCode: null,
          historyId: null,
          invoiceId: null,
        }
      }

      const proratingResult = billingProratingService.calculateProrating({
        oldPlanAmount: oldOffer.amount,
        newPlanAmount: newOffer.amount,
        cycleStartDate: subscription.purchaseDate,
        upgradeDate: new Date(),
        cycleEndDate: subscription.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await billingPlanHistoryService.closePreviousPlan(subscription.id)

      const history = await tx.billingPlanHistory.create({
        data: {
          subscriptionId: subscription.id,
          planId: newPlan.id,
          reason: 'auto_upgrade',
          projectCountAtChange: projectCount,
          startedAt: new Date(),
          endedAt: null,
        },
      })

      await tx.billingSubscription.update({
        where: { id: subscription.id },
        data: {
          currentPlanId: newPlan.id,
          offerId: newOffer.id,
        },
      })

      const invoice = await tx.billingInvoice.create({
        data: {
          organizationId,
          subscriptionId: subscription.id,
          offerId: newOffer.id,
          asaasId: `auto-upgrade-${subscription.id}-${Date.now()}`,
          status: 'PENDING',
          paymentMethod: subscription.paymentMethod || 'CREDIT_CARD',
          value: proratingResult.netAmount.isNegative()
            ? new Prisma.Decimal(0)
            : proratingResult.netAmount,
          netValue: proratingResult.netAmount,
          description: `Auto-upgrade de ${oldPlanCode} para ${newPlanData.code}`,
          billingType: 'PRORATED',
          dueDate: subscription.expiresAt || new Date(),
        },
      })

      return {
        upgraded: true,
        oldPlanId,
        newPlanId: newPlan.id,
        newPlanCode: newPlanData.code,
        proratingResult: {
          creditAmount: proratingResult.creditAmount,
          chargeAmount: proratingResult.chargeAmount,
          netAmount: proratingResult.netAmount,
          daysRemaining: proratingResult.daysRemaining,
        },
        historyId: history.id,
        invoiceId: invoice.id,
      }
    })
  }

  async sendUpgradeNotification(input: {
    organizationId: string
    oldPlanName: string
    newPlanName: string
    upgradeDate: Date
    nextChargeDate: Date
    nextChargeAmount: Prisma.Decimal
  }): Promise<void> {
    try {
      await billingNotificationService.sendAutoUpgradeNotification(input)
    } catch (_error) {
      // Silently fail - notification is not critical
    }
  }
}

export const billingAutoUpgradeService = new BillingAutoUpgradeService()
