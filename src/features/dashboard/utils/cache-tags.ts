/**
 * Cache tag utilities for multi-tenant security.
 * All cache tags must be scoped to prevent cross-tenant data leakage.
 */

export const DashboardCacheTags = {
  /**
   * Generate cache tag for organization dashboard metrics.
   * Scope: organization-level, optional project filter.
   */
  metrics: (organizationId: string, projectId?: string | null): string =>
    `dashboard-metrics:${organizationId}:${projectId ?? 'default'}`,

  /**
   * Generate cache tag for organization scorecard.
   */
  scorecard: (organizationId: string, projectId?: string | null): string =>
    `dashboard-scorecard:${organizationId}:${projectId ?? 'default'}`,

  /**
   * Generate cache tag for organization origins metrics.
   */
  origins: (organizationId: string, projectId?: string | null): string =>
    `dashboard-origins:${organizationId}:${projectId ?? 'default'}`,

  /**
   * Generate cache tag for organization Meta entity metrics.
   */
  metaEntities: (organizationId: string, projectId?: string | null): string =>
    `dashboard-meta-entities:${organizationId}:${projectId ?? 'default'}`,
}
