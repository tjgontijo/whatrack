# Dashboard API Contracts

API response schemas and endpoint documentation for dashboard metrics, freshness indicators, and attribution data.

## Executive Scorecard Endpoint

### GET `/api/v1/dashboard/executive-scorecard`

Aggregate revenue, Meta spend/clicks, leads, and sales metrics for a date range.

**Query Parameters:**
- `period` (optional, string): Preset date range. Values: `7d`, `30d`, `90d`, `ytd`, `mtd`, `today`. Defaults to `7d`.
- `projectId` (optional, UUID): Filter metrics to a specific project. If omitted, returns org-wide metrics.

**Request Example:**
```bash
GET /api/v1/dashboard/executive-scorecard?period=30d&projectId=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer TOKEN
X-Organization-ID: org-123
```

**Response 200 (OK)**

```typescript
{
  "date": "2026-05-19T15:30:00Z",
  "revenueCompleted": 125000.50,          // Sum of WON deal sales (completed)
  "revenuePipeline": 450000.00,           // Sum of ACTIVE deal values
  "metaPaidSpend": 8500.00,               // Sum of Meta Ads spend
  "metaPaidRevenue": 42000.00,            // Sum of WON sales with ctwaclid/fbclid
  "metaPaidClicks": 1250,                 // Sum of clicks from Meta Ads
  "metaPaidImpressions": 125000,          // Sum of impressions from Meta Ads
  "leadsTotal": 450,                      // Count of leads created
  "leadsMetaPaid": 85,                    // Count of leads from Meta Ads
  "salesTotal": 35,                       // Count of completed sales
  "salesMetaAttribued": 12                // Count of sales with Meta attribution
}
```

**Response 400 (Bad Request)**

Invalid query parameters.

```typescript
{
  "error": "Parâmetros inválidos",
  "details": {
    "fieldErrors": {
      "period": ["Invalid enum value"]
    }
  }
}
```

**Response 403 (Forbidden)**

User lacks access to organization.

```typescript
{
  "error": "Acesso negado"
}
```

**Response 500 (Internal Server Error)**

Database or projection service failure.

```typescript
{
  "error": "Falha ao gerar scorecard executivo"
}
```

---

## Daily Metrics Response Schema

Used by projection service and repository queries.

```typescript
interface DashboardDailyMetric {
  date: Date                      // UTC midnight of metric date
  revenueCompleted: number        // Sum of completed sales on WON deals
  revenuePending: number          // Always 0 (deprecated)
  revenuePipeline: number         // Sum of ACTIVE deal values
  metaPaidSpend: number           // Sum of Meta Ads spend
  metaPaidRevenue: number         // Sum of WON sales with ctwaclid/fbclid
  metaPaidClicks: number          // Sum of clicks
  metaPaidImpressions: number     // Sum of impressions
  leadsTotal: number              // Count of leads
  leadsMetaPaid: number           // Count of leads from Meta Ads
  salesTotal: number              // Count of completed sales
  salesMetaAttribued: number      // Count of sales with Meta attribution
  organizationId: string          // Tenant ID
  projectId: string | null        // Project scope (null = org-wide)
}
```

---

## Origin Metrics Response Schema

Metrics grouped by UTM origin (source:medium:campaign).

```typescript
interface OriginDailyMetric {
  originKey: string               // "source:medium:campaign" composite key
  utmSource: string | null        // UTM source parameter
  utmMedium: string | null        // UTM medium parameter
  utmCampaign: string | null      // UTM campaign parameter
  leadsCount: number              // Count of leads from this origin
  salesCount: number              // Count of sales from this origin
  revenue: number                 // Sum of revenue from this origin
  organizationId: string          // Tenant ID
  projectId: string | null        // Project scope
}
```

**Aggregation Rules:**
- Grouped by `originKey` (composite identifier)
- Summed across all dates in query range
- Sorted by revenue descending

**Origin Key Examples:**
```
"google:cpc:summer-sale"
"facebook:paid_social:brand"
"direct:none:none"
"organic:none:none"
```

---

## Meta Entity Metrics Response Schema

Metrics grouped by Meta Ads entity (campaign/adset/ad).

```typescript
interface MetaEntityDailyMetric {
  entityKey: string               // Entity identifier (campaign/adset/ad)
  metaCampaignId: string | null   // Meta campaign ID (if applicable)
  metaAdSetId: string | null      // Meta ad set ID (if applicable)
  metaAdId: string | null         // Meta ad ID (if applicable)
  spend: number                   // Total spend for this entity
  clicks: number                  // Total clicks
  impressions: number             // Total impressions
  leadsAttribued: number          // Count of attributed leads
  revenue: number                 // Sum of attributed revenue
  organizationId: string          // Tenant ID
  projectId: string | null        // Project scope
}
```

**Computed Fields:**
- `roas`: `spend > 0 ? revenue / spend : 0`
- `cpc`: `clicks > 0 ? spend / clicks : 0`
- `cpm`: `impressions > 0 ? (spend / impressions) * 1000 : 0`
- `ctr`: `impressions > 0 ? (clicks / impressions) * 100 : 0`

**Entity Hierarchy:**
- Campaign: `metaCampaignId` populated, others null
- Ad Set: `metaAdSetId` populated, `metaCampaignId` also populated
- Ad: `metaAdId` populated, all parent IDs populated

---

## Metrics Freshness Response Schema

Data staleness indicators for the dashboard pipeline.

```typescript
interface MetricsFreshness {
  metaSyncedAt: Date | null       // Last successful Meta Ads sync
  projectedAt: Date | null        // Last successful dashboard projection
  isMetaFresh: boolean            // Synced within last 24 hours
  isDashboardFresh: boolean       // Projected within last 4 hours
  freshnessMessage: string        // Human-readable status
}
```

**Freshness States:**

| State | Condition | Message |
|-------|-----------|---------|
| 🟢 Fresh | `isDashboardFresh = true` | "Métricas atualizadas há Xmin" |
| 🟡 Stale | `isMetaFresh = true` | "Meta Ads sincronizado há Xh atrás" |
| ⚫ Unknown | Both false | "Dados em processo de atualização..." |
| ⚪ Never | No sync runs | "Dados não sincronizados. Aguardando primeira sincronização..." |

---

## Freshness Check Response

Used by components to determine data staleness.

```typescript
interface FreshnessCheckResult {
  timestamp: Date                 // When freshness was checked
  isMetaFresh: boolean            // Meta data <24h old
  isDashboardFresh: boolean       // Dashboard data <4h old
  nextProjectionEstimate: Date    // Expected next projection
}
```

---

## Error Response Format

All errors follow a standard format.

```typescript
interface ApiErrorResponse {
  error: string                   // Human-readable error message (PT-BR)
  details?: {
    fieldErrors?: Record<string, string[]>  // Validation errors
    code?: string                           // Machine-readable error code
  }
}
```

**Error Codes:**
- `INVALID_PARAMS`: Query parameter validation failed
- `FORBIDDEN`: User lacks access to organization/project
- `NOT_FOUND`: Resource (project, organization) not found
- `INTERNAL_ERROR`: Unrecoverable server error

---

## Multi-Tenant Scoping

**All endpoints enforce these rules:**

1. **Authentication**: All requests require `Authorization: Bearer TOKEN`
2. **Organization Isolation**: `validateFullAccess()` extracts organizationId from JWT
3. **Project Scoping**: Optional `projectId` parameter filters to specific project
4. **Cache Tags**: Responses cached with org-scoped tags `dashboard-metrics:{orgId}:{projectId}`

**Data Guarantees:**
- No cross-organization leakage via WHERE clauses
- Cache keys include organizationId to prevent collisions
- All repository queries enforce organizationId filtering
- Frontend cannot query arbitrary organization data

---

## Aggregation Windows

**Date Range Resolution:**

```typescript
// Period presets (resolved to UTC dates in org's timezone)
const periods = {
  '7d': last 7 days,
  '30d': last 30 days,
  '90d': last 90 days,
  'mtd': month-to-date in org timezone,
  'ytd': year-to-date in org timezone,
  'today': today in org timezone
}

// Example: America/Sao_Paulo (UTC-3)
// "today" = 2026-05-19T03:00:00Z to 2026-05-20T03:00:00Z
```

**Metric Granularity:**
- All metrics aggregated by UTC calendar day (00:00:00Z to 23:59:59Z)
- Queries include `date BETWEEN ? AND ?` with inclusive boundaries
- Projector runs daily at 04:00 UTC (after Meta sync at 03:00 UTC)

---

## Attribution Rules

**Meta Paid Revenue Criteria:**

Strict validation: sale must have **ctwaclid OR fbclid** AND deal must be WON.

```typescript
// ✓ Counts as Meta paid revenue:
- sale with ctwaclid (WhatsApp) → revenue counted
- sale with fbclid (Facebook) → revenue counted
- sale with both ctwaclid AND fbclid → counted once

// ✗ Does NOT count as Meta paid:
- sale with only gclid (Google) → excluded (other paid)
- sale with only ttclid (TikTok) → excluded (other paid)
- sale on non-WON deal → excluded (not completed)
- sale on LOST/PAUSED deal → excluded
```

**Origin Key Generation:**

```typescript
originKey = `${utmSource || 'direct'}:${utmMedium || 'none'}:${utmCampaign || 'none'}`

// Examples:
"google:cpc:summer-sale"  // All params present
"facebook:paid_social:none"  // No campaign
"direct:none:none"  // All missing (direct traffic)
```

---

## Data Freshness SLOs

**Sync Schedule:**
- Meta Ads sync: daily 03:00 UTC
- Dashboard projection: daily 04:00 UTC

**Freshness Thresholds:**
| Data | Window | Update Frequency |
|------|--------|------------------|
| Completed Revenue | Immediate | On sale completion |
| Pipeline Revenue | Hourly | On deal stage change |
| Meta Spend/Clicks | <1h | Hourly sync |
| Meta Revenue (attributed) | <4h | After projection |
| Leads | Immediate | On lead creation |
| Conversions (sales) | <4h | Post-projection sync |

**Staleness Alerts:**
- Meta data >24h old: 🟡 Warning state
- Dashboard data >4h old: ⚫ Unknown state
- Dashboard data >8h old: 🔴 Critical alert

---

## Pagination

Not yet implemented. All current endpoints return aggregated results (not paginated).

**Future consideration:** For origin/entity metrics tables with 100+ rows, implement cursor-based pagination:
```typescript
interface PaginatedResponse<T> {
  items: T[]
  nextCursor?: string
  hasMore: boolean
}
```

---

## Versioning

Current version: **v1**

**Endpoint pattern:** `/api/v1/dashboard/*`

**Stability:**
- Executive scorecard schema stable (v1)
- Origin metrics schema stable (v1)
- Meta entity metrics schema stable (v1)
- Freshness schema stable (v1)

**Breaking Changes:** Will increment major version (v2, v3) if schema changes occur.
