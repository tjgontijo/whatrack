# Dashboard Multi-Tenant Security

## Overview

Dashboard features must enforce strict multi-tenant isolation to prevent data leakage between organizations.

## Pattern: Organization Scoping

### Database Queries
All database queries **must** include `organizationId` in the WHERE clause:

```typescript
// ✓ CORRECT: organizationId always filtered
const metrics = await dashboardRepository.getAggregatedMetrics(
  organizationId,   // Required parameter
  dateFrom,
  dateTo,
  projectId
)

// ✗ WRONG: query without organizationId filter
await prisma.dashboardDailyMetric.findMany({
  where: { date: { gte: dateFrom } }  // Missing organizationId!
})
```

### Cache Tags
Cache tags **must** be scoped to organization (and optionally project):

```typescript
// ✓ CORRECT: cache tag includes organizationId
revalidateTag(`dashboard-metrics:${organizationId}:${projectId ?? 'default'}`)

// ✗ WRONG: global cache tag allows cross-tenant pollution
revalidateTag('dashboard-metrics')  // Any org can invalidate other orgs' cache!
```

Use `DashboardCacheTags` utility to generate consistent tags:

```typescript
import { DashboardCacheTags } from '@/features/dashboard/utils/cache-tags'

revalidateTag(DashboardCacheTags.metrics(organizationId, projectId))
```

### API Endpoints
All endpoints must:

1. Validate user access to organization via `validateFullAccess` or `resolveProjectScope`
2. Pass validated `organizationId` to services
3. Scope cache tags to organization

```typescript
export async function GET(request: Request) {
  // 1. Validate access
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Acesso negado', 403)
  }

  // 2. Resolve project scope (validates project belongs to org)
  const projectId = await resolveProjectScope({
    organizationId: access.organizationId,
    projectId: query.projectId,
  })

  // 3. Call service with validated organizationId
  const result = await service.getMetrics(
    access.organizationId,  // From auth, not user input
    dateFrom,
    dateTo,
    projectId
  )

  return NextResponse.json(result)
}
```

### Services
All services accept `organizationId` as first parameter and pass it to repository:

```typescript
export class DashboardMetricsService {
  async getMetrics(
    organizationId: string,  // Always required
    dateFrom: Date,
    dateTo: Date,
    projectId?: string | null
  ) {
    // Delegate to repository
    return dashboardRepository.getAggregatedMetrics(
      organizationId,
      dateFrom,
      dateTo,
      projectId
    )
  }
}
```

### Repository
All queries include `organizationId` filtering:

```typescript
export class DashboardRepository {
  async getAggregatedMetrics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    projectId?: string | null
  ) {
    return prisma.dashboardDailyMetric.aggregate({
      where: {
        organizationId,  // ← Always included
        projectId: projectId ?? null,
        date: { gte: dateFrom, lte: dateTo },
      },
      _sum: { /* fields */ },
    })
  }
}
```

## Checklist for New Code

Before committing dashboard code:

- [ ] All Prisma queries filter by `organizationId`
- [ ] API endpoints validate access via `validateFullAccess` or `resolveProjectScope`
- [ ] Services accept `organizationId` as first parameter
- [ ] Cache tags use `DashboardCacheTags` or equivalent scoped format
- [ ] `revalidateTag` includes organization in tag name
- [ ] No global cache tags like `'dashboard-*'` without organization scope
- [ ] Server components validate user access before rendering

## Incident Response

If cross-tenant data leakage is detected:

1. Immediately clear cache: `revalidateTag('*')` (temporary, deploy permanent fix next)
2. Audit query logs for unauthorized access patterns
3. Review all cache tag uses for missing organization scope
4. Add tests verifying `organizationId` filtering on queries
