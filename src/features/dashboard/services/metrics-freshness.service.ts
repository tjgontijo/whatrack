import 'server-only'
import { dashboardRepository } from '../repositories/dashboard.repository'

export interface MetricsFreshness {
  /** Last time Meta Ads insights were synced */
  metaSyncedAt: Date | null
  /** Last time dashboard metrics were projected */
  projectedAt: Date | null
  /** Is data fresh (synced within last 24 hours) */
  isMetaFresh: boolean
  /** Is dashboard data fresh (projected within last 4 hours) */
  isDashboardFresh: boolean
  /** Human-readable freshness message */
  freshnessMessage: string
}

/**
 * MetricsFreshnessService: tracks data freshness and provides fallback indicators.
 */
export class MetricsFreshnessService {
  private readonly META_FRESH_WINDOW_HOURS = 24
  private readonly DASHBOARD_FRESH_WINDOW_HOURS = 4

  /**
   * Get freshness status for metrics.
   */
  async getMetricsFreshness(
    organizationId: string,
    projectId?: string | null
  ): Promise<MetricsFreshness> {
    const [metaSyncRun, dashboardRefreshRun] = await Promise.all([
      dashboardRepository.getLastMetaInsightSyncRun(organizationId),
      dashboardRepository.getLastDashboardRefreshRun(organizationId, projectId),
    ])

    const now = new Date()
    const metaSyncedAt = metaSyncRun?.createdAt ?? null
    const projectedAt = dashboardRefreshRun?.createdAt ?? null

    const isMetaFresh = metaSyncedAt
      ? (now.getTime() - metaSyncedAt.getTime()) / (1000 * 60 * 60) < this.META_FRESH_WINDOW_HOURS
      : false

    const isDashboardFresh = projectedAt
      ? (now.getTime() - projectedAt.getTime()) / (1000 * 60 * 60) <
        this.DASHBOARD_FRESH_WINDOW_HOURS
      : false

    return {
      metaSyncedAt,
      projectedAt,
      isMetaFresh,
      isDashboardFresh,
      freshnessMessage: this.generateMessage(isMetaFresh, isDashboardFresh, metaSyncedAt, projectedAt),
    }
  }

  /**
   * Generate human-readable freshness message.
   */
  private generateMessage(
    isMetaFresh: boolean,
    isDashboardFresh: boolean,
    metaSyncedAt: Date | null,
    projectedAt: Date | null
  ): string {
    if (!metaSyncedAt && !projectedAt) {
      return 'Dados não sincronizados. Aguardando primeira sincronização...'
    }

    if (!isMetaFresh && metaSyncedAt) {
      const hours = Math.floor((new Date().getTime() - metaSyncedAt.getTime()) / (1000 * 60 * 60))
      return `Meta Ads sincronizado há ${hours}h atrás`
    }

    if (isMetaFresh && projectedAt) {
      const minutes = Math.floor((new Date().getTime() - projectedAt.getTime()) / (1000 * 60))
      return `Métricas atualizadas há ${minutes}min`
    }

    return 'Dados em processo de atualização...'
  }
}

export const metricsFreshnessService = new MetricsFreshnessService()
