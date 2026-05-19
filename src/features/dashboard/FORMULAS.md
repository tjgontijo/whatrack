# Dashboard KPI Formulas

## Revenue Metrics

### Completed Revenue (Receita Realizada)

**Definition**: Sum of Sales where Deal stage status = WON

```sql
SELECT SUM(sale.totalAmount)
FROM sale
JOIN deal ON sale.dealId = deal.id
JOIN dealStage ON deal.stageId = dealStage.id
WHERE deal.organizationId = ?
  AND dealStage.statusGroup = 'WON'
  AND sale.status = 'completed'
  AND sale.createdAt BETWEEN ? AND ?
```

**Business Logic**:
- Only WON deals count as realized revenue
- Sales must have status='completed'
- Captures actual closed transactions, not pipeline

### Pipeline Revenue (Receita em Pipeline)

**Definition**: Sum of Deal values where stage status = ACTIVE

```sql
SELECT SUM(deal.dealValue)
FROM deal
JOIN dealStage ON deal.stageId = dealStage.id
WHERE deal.organizationId = ?
  AND dealStage.statusGroup = 'ACTIVE'
  AND deal.createdAt BETWEEN ? AND ?
```

**Business Logic**:
- Only ACTIVE (open) deals count as pipeline
- Excludes WON, LOST, PAUSED stages
- Forecasts potential future revenue

### Pending Revenue (Deprecated)

**Status**: Deprecated, set to 0

Previously counted Sales with status='pending' but this conflated
transaction payment status with deal closure status. Now removed.

## Meta Ads Metrics

### Meta Paid Spend

**Definition**: Sum of spend from MetaAdInsightDaily for organization

```sql
SELECT SUM(spend)
FROM metaAdInsightDaily
WHERE organizationId = ?
  AND date BETWEEN ? AND ?
```

### Meta Paid Revenue (Meta Paid Attribution)

**Definition**: Sum of Sales where tracking.ctwaclid OR tracking.fbclid present AND Deal is WON

```typescript
function isMetaPaidRevenue(tracking: { ctwaclid?, fbclid? }): boolean {
  return !!(tracking.ctwaclid || tracking.fbclid)
}

// Usage in query:
SELECT SUM(sale.totalAmount)
FROM sale
JOIN deal ON sale.dealId = deal.id
JOIN dealTracking ON deal.id = dealTracking.dealId
JOIN dealStage ON deal.stageId = dealStage.id
WHERE deal.organizationId = ?
  AND dealStage.statusGroup = 'WON'
  AND (dealTracking.ctwaclid IS NOT NULL OR dealTracking.fbclid IS NOT NULL)
  AND sale.createdAt BETWEEN ? AND ?
```

**Strict Attribution Rules**:
- ✓ ctwaclid (WhatsApp click ID) → counts as Meta paid
- ✓ fbclid (Facebook click ID) → counts as Meta paid
- ✗ gclid (Google click ID) → does NOT count as Meta paid (even if fbclid also present)
- ✗ ttclid (TikTok) → counts as OTHER_PAID, not Meta

### ROAS (Return on Ad Spend)

**Definition**: Meta Paid Revenue ÷ Meta Paid Spend

```typescript
ROAS = metaPaidRevenue / metaPaidSpend

// Safe calculation (avoid divide-by-zero):
ROAS = metaPaidSpend > 0 ? metaPaidRevenue / metaPaidSpend : 0

// Example: $100 spend → $350 revenue = 3.5x ROAS
```

**Interpretation**:
- ROAS > 1.0: Profitable (revenue exceeds spend)
- ROAS = 1.0: Break-even
- ROAS < 1.0: Loss-making campaign

### Meta Clicks & Impressions

**Definition**: Sum from MetaAdInsightDaily

```sql
SELECT SUM(clicks), SUM(impressions)
FROM metaAdInsightDaily
WHERE organizationId = ?
  AND date BETWEEN ? AND ?
```

### CPM (Cost Per 1000 Impressions)

**Definition**: (Spend / Impressions) × 1000

```typescript
CPM = (spend / impressions) * 1000

// Safe calculation:
CPM = impressions > 0 ? (spend / impressions) * 1000 : 0
```

## Leads & Conversions

### Total Leads

**Definition**: Count of distinct Leads created in date range

```sql
SELECT COUNT(DISTINCT id)
FROM lead
WHERE organizationId = ?
  AND createdAt BETWEEN ? AND ?
```

### Meta Paid Leads

**Definition**: Count of distinct Leads where associated Deal has ctwaclid

```sql
SELECT COUNT(DISTINCT lead.id)
FROM lead
JOIN deal ON lead.id = deal.leadId
JOIN dealTracking ON deal.id = dealTracking.dealId
WHERE lead.organizationId = ?
  AND dealTracking.ctwaclid IS NOT NULL
  AND lead.createdAt BETWEEN ? AND ?
```

### Conversion Rate

**Definition**: Sales Count ÷ Leads Count × 100%

```typescript
conversionRate = (salesCount / leadsCount) * 100

// Safe calculation:
conversionRate = leadsCount > 0 ? (salesCount / leadsCount) * 100 : 0

// Example: 100 leads → 10 sales = 10% conversion rate
```

## Attribution Model

### Origin Key

**Definition**: Composite identifier for UTM origin

```typescript
originKey = `${utmSource || 'direct'}:${utmMedium || 'none'}:${utmCampaign || 'none'}`

// Examples:
// "google:cpc:summer-sale"
// "facebook:paid_social:brand"
// "direct:none:none"
```

### Source Classification

**Priority order**:
1. ctwaclid/fbclid → META_PAID (confidence 100%)
2. ttclid → OTHER_PAID/tiktok (confidence 100%)
3. gclid → OTHER_PAID/google (confidence 100%)
4. sourceType='paid' → OTHER_PAID (confidence 80%)
5. sourceType='organic' → ORGANIC (confidence 80%)
6. utmMedium contains 'paid' → OTHER_PAID (confidence 60%)
7. utmMedium contains 'organic' → ORGANIC (confidence 60%)
8. utmSource present → ORGANIC (confidence 40%)
9. No signals → UNKNOWN (confidence 0%)

## Aggregation Window

### Date Filtering

All metrics are aggregated by calendar day (UTC midnight to midnight)

```typescript
// Query for a specific date:
createdAt BETWEEN '2024-01-15T00:00:00Z' AND '2024-01-16T00:00:00Z'

// Query for date range:
createdAt BETWEEN ? AND ?
```

### Timezone Handling

Organization's `analyticsSettings.timezoneName` determines:
- Which 24-hour window represents "today"
- Report period boundaries for custom date ranges

Example: America/Sao_Paulo is UTC-3, so "today" is 03:00 UTC to 04:00 UTC next day

## Data Freshness Windows

| Metric | Freshness Window | Update Frequency |
|--------|------------------|------------------|
| Completed Revenue | Immediate | On sale completion |
| Pipeline Revenue | Hourly | On deal stage change |
| Meta Paid Spend | <1h | Hourly sync |
| Meta Paid Revenue | <1h | Hourly sync + projection |
| Leads | Immediate | On lead creation |
| Conversions | <4h | Post-projection sync |

## Idempotency Guarantees

All projections are **idempotent**: running the same projection twice on the same date produces identical results

```typescript
// Safe to re-run projection:
await projector.projectMetrics('2024-01-15')
await projector.projectMetrics('2024-01-15') // Same result
```

This allows:
- Retry-safe workers (no duplicates on failure retry)
- Manual re-projection for data fixes
- Audit log comparison (before/after)
