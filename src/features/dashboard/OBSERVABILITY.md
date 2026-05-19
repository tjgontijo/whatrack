# Dashboard Analytics Pipeline Observability

## Overview

The dashboard pipeline consists of three main stages, each with built-in observability:

1. **Meta Ads Sync** — Fetches data from Meta API, stores in local database
2. **Dashboard Projection** — Aggregates operational data into read models
3. **Metrics Query** — Serves aggregated data to frontend

## Logging Strategy

### Pipeline Events

All major operations emit structured logs via `PipelineEvents`:

```typescript
import { PipelineEvents } from '@/features/dashboard/observability/pipeline-events'

// Meta Ads sync
PipelineEvents.metaSyncStarted(organizationId, 'SYNC_TODAY')
try {
  // ... sync work
  PipelineEvents.metaSyncSuccess(organizationId, rowsInserted, rowsUpdated, elapsed)
} catch (error) {
  PipelineEvents.metaSyncError(organizationId, error)
}

// Dashboard projection
PipelineEvents.projectionStarted(organizationId, date)
try {
  // ... projection work
  PipelineEvents.projectionSuccess(organizationId, date, elapsed)
} catch (error) {
  PipelineEvents.projectionError(organizationId, date, error)
}
```

### Log Levels

- **error**: Sync/projection failures, unrecoverable errors
- **info**: Sync/projection completion, workflow milestones
- **debug**: Freshness checks, cache invalidation, slow queries (>1s)

## Monitoring Patterns

### SLA Monitoring

Check that data freshness meets SLOs:

```
Meta Ads sync: daily 03:00 UTC → expect fresh data by 04:00
Dashboard projection: daily 04:00 UTC → expect fresh data by 05:00
Expected freshness: <4h old for dashboard, <24h old for Meta
```

Alert when:
- Meta sync fails 2+ consecutive runs
- Projection latency >30min
- Freshness exceeds SLO window

### Error Patterns

Track recurring failures:

- **Meta API auth errors**: Check token refresh logic
- **Database timeouts**: Check query performance, consider indexing
- **Memory errors in projector**: Check aggregation query size limits

### Performance Baselines

Expected timings (based on typical org):

- Meta sync: 30-120s per organization
- Dashboard projection: 10-30s per organization
- Metrics query: <100ms for scorecard, <500ms for tables

Alert when exceeded by >50%.

## Debugging Checklist

When the dashboard shows stale data:

1. Check freshness service output:
   ```sql
   SELECT * FROM "MetaInsightSyncRun"
   WHERE organizationId = 'org-id'
   ORDER BY createdAt DESC LIMIT 5
   ```

2. Check for projection errors:
   ```sql
   SELECT * FROM "DashboardMetricRefreshRun"
   WHERE organizationId = 'org-id'
   AND status != 'success'
   ORDER BY createdAt DESC LIMIT 10
   ```

3. Check worker logs:
   ```bash
   grep "\[Dashboard Pipeline\]" logs/*.log
   ```

4. Manual trigger:
   ```bash
   curl -X POST http://localhost/api/v1/meta-ads/sync/force \
     -H "Authorization: Bearer TOKEN" \
     -H "X-Organization-ID: ORG-ID"
   ```

## Key Metrics

Track these metrics in your observability tool (Datadog, Prometheus, etc.):

| Metric | Labels | Goal |
|--------|--------|------|
| `dashboard.sync.duration_ms` | org_id, sync_type | <120000ms |
| `dashboard.projection.duration_ms` | org_id | <30000ms |
| `dashboard.metrics.freshness_minutes` | org_id | <240min |
| `dashboard.sync.rows_inserted` | org_id | > 0 daily |
| `dashboard.errors` | org_id, error_type | = 0 |
| `dashboard.query.latency_ms` | org_id, query_type | <500ms |

## Alerting Rules

Example alert conditions:

```
# Meta sync has failed
increase(dashboard.errors{error_type="meta_sync"}[24h]) > 0
Alert: "Meta Ads sync failed for organization {org_id}"

# Dashboard projection latency high
histogram_quantile(0.95, dashboard.projection.duration_ms) > 60000
Alert: "Dashboard projection taking >1min for {org_id}, check database performance"

# Data freshness exceeded SLO
dashboard.metrics.freshness_minutes > 480
Alert: "Dashboard data >8h stale for {org_id}, check sync status"
```

## Next Steps

1. **Export metrics to observability backend**: Wire PipelineTimer metrics to Datadog/Prometheus
2. **Add custom dashboards**: Visualize sync/projection health per organization
3. **PagerDuty integration**: Alert on-call for critical failures
