import { logger } from '@/lib/utils/logger'

/**
 * Pipeline events for the dashboard analytics flow.
 * These events are logged for observability and debugging.
 */

export const PipelineEvents = {
  /**
   * Meta Ads sync started.
   */
  metaSyncStarted: (organizationId: string, syncType: string) => {
    logger.info({ organizationId, syncType }, '[Dashboard Pipeline] Meta sync started')
  },

  /**
   * Meta Ads sync completed successfully.
   */
  metaSyncSuccess: (
    organizationId: string,
    rowsInserted: number,
    rowsUpdated: number,
    durationMs: number
  ) => {
    logger.info(
      { organizationId, rowsInserted, rowsUpdated, durationMs },
      '[Dashboard Pipeline] Meta sync completed'
    )
  },

  /**
   * Meta Ads sync failed.
   */
  metaSyncError: (organizationId: string, error: Error) => {
    logger.error({ organizationId, error }, '[Dashboard Pipeline] Meta sync failed')
  },

  /**
   * Dashboard projection started.
   */
  projectionStarted: (organizationId: string, date: string) => {
    logger.info({ organizationId, date }, '[Dashboard Pipeline] Projection started')
  },

  /**
   * Dashboard projection completed successfully.
   */
  projectionSuccess: (organizationId: string, date: string, durationMs: number) => {
    logger.info(
      { organizationId, date, durationMs },
      '[Dashboard Pipeline] Projection completed'
    )
  },

  /**
   * Dashboard projection failed.
   */
  projectionError: (organizationId: string, date: string, error: Error) => {
    logger.error({ organizationId, date, error }, '[Dashboard Pipeline] Projection failed')
  },

  /**
   * Metrics query executed.
   */
  metricsQuery: (organizationId: string, queryType: string, resultCount: number, durationMs: number) => {
    logger.debug(
      { organizationId, queryType, resultCount, durationMs },
      '[Dashboard Pipeline] Metrics query'
    )
  },

  /**
   * Cache invalidated.
   */
  cacheInvalidated: (tag: string, reason: string) => {
    logger.debug({ tag, reason }, '[Dashboard Pipeline] Cache invalidated')
  },

  /**
   * Data freshness check.
   */
  freshnessCheck: (organizationId: string, isMetaFresh: boolean, isDashboardFresh: boolean) => {
    logger.debug(
      { organizationId, isMetaFresh, isDashboardFresh },
      '[Dashboard Pipeline] Freshness check'
    )
  },
}

/**
 * Timing helper for measuring operation duration.
 */
export class PipelineTimer {
  private startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  /**
   * Get elapsed time in milliseconds.
   */
  elapsed(): number {
    return Date.now() - this.startTime
  }
}
