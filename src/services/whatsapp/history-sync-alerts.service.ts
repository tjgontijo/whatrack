import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

/**
 * WhatsApp History Sync Alerts Service
 * Monitoramento e alertas para sincronização de histórico
 *
 * PRD: Criar alertas para falhas de sincronização
 */

interface SyncAlert {
  type: 'warning' | 'error' | 'info'
  message: string
  timestamp: Date
  configId: string
  organizationId: string
  metadata?: Record<string, unknown>
}

export class HistorySyncAlertsService {
  /**
   * Verificar timeouts de sincronização
   * Se não receber webhook de história em X minutos após state_sync
   */
  async checkSyncTimeouts(timeoutMinutes: number = 30): Promise<void> {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000)

    try {
      // Buscar configs que estão 'pending_history' há mais que timeout
      const staleSyncs = await prisma.whatsAppConfig.findMany({
        where: {
          historySyncStatus: 'pending_history',
          historySyncStartedAt: {
            lt: cutoffTime,
          },
        },
      })

      for (const config of staleSyncs) {
        await this.createAlert({
          type: 'warning',
          message: `Histórico não recebido há ${timeoutMinutes}min. Verifique se o webhook está ativo.`,
          timestamp: new Date(),
          configId: config.id,
          organizationId: config.organizationId,
          metadata: {
            lastCheck: new Date(),
            timeoutMinutes,
            startedAt: config.historySyncStartedAt,
          },
        })

        logger.warn(`[HistorySyncAlerts] Sync timeout for config ${config.id}`)
      }
    } catch (error) {
      logger.error({ err: error }, '[HistorySyncAlerts] Error checking sync timeouts')
    }
  }

  /**
   * Monitorar falhas de sincronização
   */
  async checkSyncFailures(): Promise<void> {
    try {
      const failedSyncs = await prisma.whatsAppHistorySync.findMany({
        where: {
          status: 'failed',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      })

      for (const sync of failedSyncs) {
        await this.createAlert({
          type: 'error',
          message: `Falha na sincronização de histórico: ${sync.errorMessage || 'Erro desconhecido'}`,
          timestamp: new Date(),
          configId: sync.connectionId,
          organizationId:
            (
              await prisma.whatsAppConfig.findUnique({
                where: { id: sync.connectionId },
              })
            )?.organizationId || '',
          metadata: {
            errorCode: sync.errorCode,
            errorMessage: sync.errorMessage,
            phase: sync.phase,
            progress: sync.progress,
          },
        })

        logger.error(`[HistorySyncAlerts] Sync failed: ${sync.errorMessage}`)
      }
    } catch (error) {
      logger.error({ err: error }, '[HistorySyncAlerts] Error checking sync failures')
    }
  }

  /**
   * Alertar quando sincronização completar com sucesso
   */
  async alertSyncCompleted(configId: string, totalMessages: number): Promise<void> {
    const config = await prisma.whatsAppConfig.findUnique({
      where: { id: configId },
    })

    if (!config) return

    await this.createAlert({
      type: 'info',
      message: `Sincronização de histórico concluída! ${totalMessages} mensagens importadas.`,
      timestamp: new Date(),
      configId,
      organizationId: config.organizationId,
      metadata: {
        totalMessages,
        completedAt: new Date(),
      },
    })

    logger.info(`[HistorySyncAlerts] Sync completed for config ${configId}`)
  }

  /**
   * Verificar se há leads do histórico sem mensagens ao vivo
   * Indicativo de que possívelmente não temos os contatos mais ativos
   */
  async checkInactiveHistoryLeads(daysWithoutMessage: number = 7): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - daysWithoutMessage * 24 * 60 * 60 * 1000)

      const inactiveLeads = await prisma.lead.findMany({
        where: {
          source: 'history_sync',
          lastMessageAt: {
            lt: cutoffDate,
          },
        },
        select: {
          id: true,
          organizationId: true,
          phone: true,
          lastMessageAt: true,
        },
      })

      if (inactiveLeads.length > 0) {
        // Agrupar por organização
        const byOrg = inactiveLeads.reduce(
          (acc, lead) => {
            if (!acc[lead.organizationId]) acc[lead.organizationId] = []
            acc[lead.organizationId].push(lead)
            return acc
          },
          {} as Record<string, typeof inactiveLeads>
        )

        for (const [orgId, leads] of Object.entries(byOrg)) {
          await this.createAlert({
            type: 'info',
            message: `${leads.length} leads do histórico sem mensagens há ${daysWithoutMessage}+ dias`,
            timestamp: new Date(),
            configId: '',
            organizationId: orgId,
            metadata: {
              inactiveLeadCount: leads.length,
              daysWithoutMessage,
              oldestLastMessage: Math.min(...leads.map((l) => l.lastMessageAt?.getTime() || 0)),
            },
          })
        }
      }
    } catch (error) {
      logger.error({ err: error }, '[HistorySyncAlerts] Error checking inactive leads')
    }
  }

  /**
   * Cria um alerta
   * Em produção, integrar com sistema de notificações (Slack, email, etc)
   */
  private async createAlert(alert: SyncAlert): Promise<void> {
    try {
      // Log para observabilidade
      logger.info(
        { context: { configId: alert.configId, organizationId: alert.organizationId, metadata: alert.metadata } },
        `[HistorySyncAlert] ${alert.type.toUpperCase()}: ${alert.message}`
      )

      // TODO: Integrar com sistema de notificações
      // - Slack webhook
      // - Email
      // - SMS
      // - Dashboard notifications

      // Por enquanto, apenas logar
      logger.info(
        { context: { timestamp: alert.timestamp, configId: alert.configId, organizationId: alert.organizationId, ...alert.metadata } },
        `[ALERT] ${alert.type}: ${alert.message}`
      )
    } catch (error) {
      logger.error({ err: error }, '[HistorySyncAlerts] Error creating alert')
    }
  }

  /**
   * Executar verificações periódicas
   * Ideal para ser executado por um cron job a cada 5 minutos
   */
  async runPeriodicChecks(): Promise<void> {
    logger.info('[HistorySyncAlerts] Running periodic checks...')

    await Promise.allSettled([
      this.checkSyncTimeouts(30), // 30 minutos
      this.checkSyncFailures(),
      this.checkInactiveHistoryLeads(7), // 7 dias
    ])

    logger.info('[HistorySyncAlerts] Periodic checks completed')
  }
}

export const historySyncAlertsService = new HistorySyncAlertsService()
