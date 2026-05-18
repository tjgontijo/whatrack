import "server-only"
import type { Prisma } from '@generated/prisma/client'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { renderBillingAutoUpgradeEmail } from '@/services/mail/email-renderer'
import { resendProvider } from '@/services/mail/resend'

export class BillingNotificationService {
  async sendAutoUpgradeNotification(input: {
    organizationId: string
    oldPlanName: string
    newPlanName: string
    upgradeDate: Date
    nextChargeDate: Date
    nextChargeAmount: Prisma.Decimal
  }): Promise<boolean> {
    try {
      const {
        organizationId,
        oldPlanName,
        newPlanName,
        upgradeDate,
        nextChargeDate,
        nextChargeAmount,
      } = input

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          members: {
            where: { role: 'owner' },
            take: 1,
            select: {
              user: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      })

      if (!organization?.members.length) {
        logger.warn({ organizationId }, 'Organization or owner not found for billing notification')
        return false
      }

      const owner = organization.members[0]?.user

      if (!owner?.email) {
        logger.warn({ organizationId }, 'Owner email not found for billing notification')
        return false
      }

      const html = await renderBillingAutoUpgradeEmail({
        organizationName: organization.name,
        userEmail: owner.email,
        oldPlanName,
        newPlanName,
        upgradeDate: this.formatDate(upgradeDate),
        nextChargeDate: this.formatDate(nextChargeDate),
        nextChargeAmount: this.formatCurrency(nextChargeAmount),
      })

      const response = await resendProvider.send({
        to: owner.email,
        subject: `Seu plano foi atualizado para ${newPlanName}`,
        html,
      })

      if (response.success) {
        logger.info(
          { organizationId, messageId: response.messageId },
          'Auto-upgrade notification sent'
        )
        return true
      } else {
        logger.error(
          { organizationId, error: response.error },
          'Failed to send auto-upgrade notification'
        )
        return false
      }
    } catch (error) {
      logger.error(
        { error, organizationId: input.organizationId },
        'Error sending auto-upgrade notification'
      )
      return false
    }
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  private formatCurrency(value: Prisma.Decimal): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value))
  }
}

export const billingNotificationService = new BillingNotificationService()
