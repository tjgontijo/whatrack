import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

export interface TemplateStats {
  templateName: string
  sent: number
  delivered: number
  read: number
  actioned: number
  deliveryRate: number | null
  readRate: number | null
  actionRate: number | null
}

export class WhatsAppTemplateAnalyticsService {
  /**
   * Log a sent template message. Called after a successful sendTemplate API call.
   */
  static async logSend(wamid: string, templateName: string, organizationId: string): Promise<void> {
    try {
      await prisma.whatsAppTemplateLog.create({
        data: { wamid, templateName, organizationId },
      })
    } catch (error) {
      logger.error({ err: error, wamid, templateName }, '[TemplateAnalytics] Failed to log send')
    }
  }

  /**
   * Update delivery/read timestamps for a given wamid.
   * Called from webhook status processing — non-blocking.
   */
  static async updateStatus(wamid: string, status: 'delivered' | 'read'): Promise<void> {
    try {
      const data =
        status === 'delivered'
          ? { deliveredAt: new Date() }
          : { deliveredAt: new Date(), readAt: new Date() }

      await prisma.whatsAppTemplateLog.updateMany({
        where: { wamid },
        data,
      })
    } catch {
      // Non-blocking — webhook must always return 200
    }
  }

  /**
   * Record a lead action (reply or button click) linked to a template send.
   * contextWamid = the wamid of the original outbound template message.
   */
  static async trackAction(contextWamid: string, type: 'reply' | 'click'): Promise<void> {
    try {
      const data = type === 'click'
        ? { clickedAt: new Date() }
        : { repliedAt: new Date() }
      await prisma.whatsAppTemplateLog.updateMany({
        where: { wamid: contextWamid },
        data,
      })
    } catch {
      // Non-blocking
    }
  }

  /**
   * Aggregate per-template stats for an organization.
   */
  static async getStats(organizationId: string): Promise<TemplateStats[]> {
    const rows = await prisma.whatsAppTemplateLog.groupBy({
      by: ['templateName'],
      where: { organizationId },
      _count: { wamid: true, deliveredAt: true, readAt: true, repliedAt: true, clickedAt: true },
    })

    return rows.map((row) => {
      const sent = row._count.wamid
      const delivered = row._count.deliveredAt
      const read = row._count.readAt
      // actioned = replied OR clicked (union — avoid double counting with raw count)
      const actioned = row._count.repliedAt + row._count.clickedAt
      return {
        templateName: row.templateName,
        sent,
        delivered,
        read,
        actioned,
        deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : null,
        readRate: sent > 0 ? Math.round((read / sent) * 100) : null,
        actionRate: sent > 0 ? Math.round((actioned / sent) * 100) : null,
      }
    })
  }
}
