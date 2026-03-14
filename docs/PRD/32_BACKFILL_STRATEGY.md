# PRD 32 Phase 3: Ownership Backfill Strategy

**Purpose**: Document how to backfill organization-scoped assets to project-scoped ownership after Phase 2 implementation.

**Date**: 2026-03-14
**Phase**: 3 (after Phase 0 connections and Phase 2 project selection are complete)

---

## Overview

### Problem Statement

During Phase 0, all assets (MetaConnection, MetaPixel, WhatsAppConfig) are scoped to organization only:
- No `projectId` field is populated
- If an organization has multiple projects, there is ownership ambiguity
- Phase 2 will add UI to let users select project during connection

### Solution

Phase 3 backfill will:
1. **Auto-map** organizations with single project (100% certain ownership)
2. **Manual-map** organizations with multiple projects (require user review)
3. **Validate** that backfill completed with 0 NULL projectIds

---

## Asset Categories

### Scope 1: Meta Ads Assets

**MetaConnection** (Facebook login)
- Represents: "Which Facebook user is connected for this organization?"
- Ownership: Typically tied to business ops/performance role
- Backfill: If 1 project = that project; if 2+ projects = needs manual review

**MetaAdAccount** (Linked ad account)
- Represents: "Which Meta ad account is being tracked?"
- Ownership: Usually per-project (different projects run different ad accounts)
- Backfill: If 1 project = that project; if 2+ projects = needs manual review based on account name/spend

**MetaPixel** (Conversion tracking pixel)
- Represents: "Which website pixel is tracking conversions?"
- Ownership: Tied to specific website/campaign
- Backfill: If 1 project = that project; if 2+ projects = needs manual review or heuristic matching

### Scope 2: WhatsApp Assets

**WhatsAppConfig** (Phone number)
- Represents: "Which WhatsApp Business Account phone number is connected?"
- Ownership: Can be ambiguous (same WABA can have multiple projects, each with different numbers)
- Backfill: If 1 project = that project; if 2+ projects = needs manual review + UI selection

---

## Backfill Strategies

### Strategy A: Auto-Mapping (Single Project Organizations)

**Eligibility**: Organizations with exactly 1 project

**Process**:
```sql
-- Find single-project organizations
SELECT org.id, org.name, COUNT(p.id) as project_count
FROM organizations org
LEFT JOIN projects p ON org.id = p.organization_id
GROUP BY org.id
HAVING COUNT(p.id) = 1;
```

**Execution**:
```sql
-- For each organization with 1 project, backfill all assets
UPDATE meta_connections mc
SET project_id = (
  SELECT id FROM projects WHERE organization_id = mc.organization_id LIMIT 1
)
WHERE mc.project_id IS NULL
AND mc.organization_id IN (
  SELECT org.id FROM organizations org
  LEFT JOIN projects p ON org.id = p.organization_id
  GROUP BY org.id HAVING COUNT(p.id) = 1
);

-- Same for MetaAdAccount
UPDATE meta_ad_accounts
SET project_id = (
  SELECT id FROM projects WHERE organization_id = meta_ad_accounts.organization_id LIMIT 1
)
WHERE project_id IS NULL
AND organization_id IN (...);  -- Same subquery

-- Same for MetaPixel
UPDATE meta_pixels
SET project_id = (
  SELECT id FROM projects WHERE organization_id = meta_pixels.organization_id LIMIT 1
)
WHERE project_id IS NULL
AND organization_id IN (...);  -- Same subquery

-- Same for WhatsAppConfig
UPDATE whatsapp_configs
SET project_id = (
  SELECT id FROM projects WHERE organization_id = whatsapp_configs.organization_id LIMIT 1
)
WHERE project_id IS NULL
AND organization_id IN (...);  -- Same subquery
```

**Validation**: 0 rows should be updated (all auto-mapped)

---

### Strategy B: Manual Mapping (Multi-Project Organizations)

**Eligibility**: Organizations with 2+ projects

**Analysis Needed**:

For each organization with 2+ projects, gather these metrics:

```sql
-- List all projects and asset counts
SELECT
  org.id, org.name,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT mc.id) as meta_connections,
  COUNT(DISTINCT ma.id) as meta_ad_accounts,
  COUNT(DISTINCT mp.id) as meta_pixels,
  COUNT(DISTINCT wc.id) as whatsapp_configs
FROM organizations org
LEFT JOIN projects p ON org.id = p.organization_id
LEFT JOIN meta_connections mc ON org.id = mc.organization_id
LEFT JOIN meta_ad_accounts ma ON org.id = ma.organization_id
LEFT JOIN meta_pixels mp ON org.id = mp.organization_id
LEFT JOIN whatsapp_configs wc ON org.id = wc.organization_id
WHERE p.id IS NOT NULL
GROUP BY org.id, org.name
HAVING COUNT(DISTINCT p.id) >= 2
ORDER BY meta_connections + meta_ad_accounts + meta_pixels + whatsapp_configs DESC;
```

**For each org, business logic mapping:**

1. **MetaConnection**: Usually single connection per org (represents Facebook user). If only 1 MetaConnection and 2+ projects:
   - Assign to project that has highest ad spend (query MetaAdAccount insights)
   - OR assign to "main" or "flagship" project (manual selection)

2. **MetaAdAccount**: Usually distinct per project. Check account names:
   - "Project A Ads" → Project A
   - "Project B Ads" → Project B
   - If ambiguous, use ad spend heuristic

3. **MetaPixel**: Usually 1 pixel per website. Check pixel names or linked websites.

4. **WhatsAppConfig**: Usually distinct per project. Check Verified Business Name or ask user.

**Mapping Options**:

#### Option B1: Heuristic-Based Mapping
Use asset metadata to infer project:

```sql
-- For MetaAdAccount, look at name patterns
SELECT
  ma.id, ma.name, p.name as likely_project
FROM meta_ad_accounts ma
JOIN organizations org ON ma.organization_id = org.id
LEFT JOIN projects p ON org.id = p.organization_id
WHERE org.id = '$MULTI_PROJECT_ORG_ID'::uuid
AND ma.project_id IS NULL;

-- Check if account name contains project name
-- Example: "Nike Ads" matches project "Nike"
```

#### Option B2: User-Guided Mapping
Create a one-time backfill UI:

```
Dashboard: Settings → Backfill Ownership
Displays: Organization + Project + Assets needing mapping
Action: User selects which project owns which asset
Saves: Backfill record + projectId updates
```

#### Option B3: Conservative Approach (Recommended)
Don't auto-map multi-project orgs during Phase 3:
1. Auto-map single-project organizations
2. Create a list of multi-project organizations needing manual review
3. Contact customer or add task to onboarding queue
4. Complete mappings in next customer call/session

---

## Implementation: Analysis Script

See `src/scripts/analyze-ownership-ambiguity.ts` for automated analysis.

**Usage**:
```bash
npm run ts-node src/scripts/analyze-ownership-ambiguity.ts
```

**Output**: Summary report
```
=== Ownership Ambiguity Analysis ===

Organizations: 42 total
- Single project: 38 (AUTO-MAPABLE)
- Multiple projects: 4 (MANUAL-MAPPING REQUIRED)

Auto-mappable totals:
- MetaConnections: 15
- MetaAdAccounts: 32
- MetaPixels: 28
- WhatsAppConfigs: 18

Manual-mapping required (4 orgs):
Org: "Acme Corp" (acme-corp)
  Projects: 3 (Acme Direct, Acme Retail, Acme B2B)
  Assets: 2 MetaConnections, 5 MetaAdAccounts, 2 MetaPixels, 0 WhatsAppConfigs
  Action: MANUAL REVIEW REQUIRED

[More orgs...]

===== Summary =====
Ready to auto-map: 38 orgs
Need manual review: 4 orgs
Total assets awaiting mapping: 95
```

---

## Phase 3 Execution Plan

### Step 1: Run Analysis Script
```bash
npm run ts-node src/scripts/analyze-ownership-ambiguity.ts > backfill_analysis.txt
```

Review report and identify:
- How many orgs are auto-mapable
- How many need manual review
- Total assets involved

### Step 2: Auto-Mapping (Low-Risk)
```bash
# Create database backup first!
pg_dump $DATABASE_URL > backup_phase3_pre_backfill.sql

# Run auto-mapping SQL (see Strategy A above)
psql $DATABASE_URL < auto_mapping.sql

# Verify results
npm run ts-node src/scripts/validate-ownership-backfill.ts
```

### Step 3: Manual Review (High-Touch)

For multi-project organizations:
1. Notify customers: "We're improving project ownership. Please review your connections."
2. Add dashboard task: "Complete ownership setup"
3. Provide mapping UI or contact support form
4. Record manual mappings in backfill_audit table

### Step 4: Validation (Critical)
```sql
-- Verify backfill is complete
SELECT COUNT(*) as null_project_ids
FROM (
  SELECT project_id FROM meta_connections WHERE organization_id IN (SELECT id FROM organizations)
  UNION ALL
  SELECT project_id FROM meta_ad_accounts WHERE organization_id IN (SELECT id FROM organizations)
  UNION ALL
  SELECT project_id FROM meta_pixels WHERE organization_id IN (SELECT id FROM organizations)
  UNION ALL
  SELECT project_id FROM whatsapp_configs WHERE organization_id IN (SELECT id FROM organizations)
) t
WHERE project_id IS NULL;

-- Expected: 0 rows (all assets have projectId)
```

### Step 5: Update Code

Change schema and queries:
1. Make `projectId` NOT NULL in schema (Phase 0 allows NULL, Phase 3 requires it)
2. Update all queries to filter by `(organizationId, projectId)` instead of just `organizationId`
3. Update API routes to require project context
4. Add project-level middleware to enforce scoping

---

## Rollback Procedure

If backfill fails or causes issues:

```sql
-- Revert to pre-backfill state
-- Option 1: Restore from backup
psql $DATABASE_URL < backup_phase3_pre_backfill.sql

-- Option 2: Manual cleanup (if backup not available)
UPDATE meta_connections SET project_id = NULL;
UPDATE meta_ad_accounts SET project_id = NULL;
UPDATE meta_pixels SET project_id = NULL;
UPDATE whatsapp_configs SET project_id = NULL;
```

---

## Validation Queries

Use these to verify backfill correctness:

### Query 1: All Assets Have ProjectId
```sql
-- Should return 0 rows
SELECT 'meta_connections' as asset_type, COUNT(*) as null_count
FROM meta_connections
WHERE project_id IS NULL
UNION ALL
SELECT 'meta_ad_accounts', COUNT(*)
FROM meta_ad_accounts
WHERE project_id IS NULL
UNION ALL
SELECT 'meta_pixels', COUNT(*)
FROM meta_pixels
WHERE project_id IS NULL
UNION ALL
SELECT 'whatsapp_configs', COUNT(*)
FROM whatsapp_configs
WHERE project_id IS NULL;
```

### Query 2: All ProjectIds Are Valid
```sql
-- Should return 0 rows (no orphaned projectIds)
SELECT 'meta_connections' as asset_type, COUNT(*) as orphaned_count
FROM meta_connections mc
WHERE project_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = mc.project_id)
UNION ALL
SELECT 'meta_ad_accounts', COUNT(*)
FROM meta_ad_accounts ma
WHERE project_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = ma.project_id)
UNION ALL
SELECT 'meta_pixels', COUNT(*)
FROM meta_pixels mp
WHERE project_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = mp.project_id)
UNION ALL
SELECT 'whatsapp_configs', COUNT(*)
FROM whatsapp_configs wc
WHERE project_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = wc.project_id);
```

### Query 3: No Cross-Organization Assets
```sql
-- Should return 0 rows (no asset assigned to project from different org)
SELECT 'meta_connections' as asset_type, COUNT(*) as invalid_count
FROM meta_connections mc
WHERE project_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = mc.project_id AND p.organization_id = mc.organization_id
)
UNION ALL
SELECT 'meta_ad_accounts', COUNT(*)
FROM meta_ad_accounts ma
WHERE project_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = ma.project_id AND p.organization_id = ma.organization_id
)
UNION ALL
SELECT 'meta_pixels', COUNT(*)
FROM meta_pixels mp
WHERE project_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = mp.project_id AND p.organization_id = mp.organization_id
)
UNION ALL
SELECT 'whatsapp_configs', COUNT(*)
FROM whatsapp_configs wc
WHERE project_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = wc.project_id AND p.organization_id = wc.organization_id
);
```

---

## Timeline Estimate

- **Analysis**: 1-2 hours (run script, review report)
- **Auto-mapping**: 30 minutes (execute SQL, validate)
- **Manual mapping**: 2-5 hours (contact customers, collect decisions, execute)
- **Validation**: 30 minutes (run validation queries)
- **Code updates**: 2-3 hours (update queries, add middleware, test)

**Total**: 1-2 days per environment (dev → staging → prod)

---

## Success Criteria

✅ Phase 3 backfill is successful when:

1. All validation queries return 0 rows (no NULLs, no orphans, no cross-org assets)
2. Analysis script reports 0 "MANUAL MAPPING REQUIRED" organizations (all mapped)
3. No existing functionality breaks (all queries still work with projectId filter)
4. Dashboard/API correctly enforce project-level scoping
5. All audit logs are recorded for backfill operations
6. Customer-facing UIs show correct project context
