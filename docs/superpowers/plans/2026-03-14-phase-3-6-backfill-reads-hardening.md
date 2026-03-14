# PRD 32 Phase 3-6: Backfill, Read Cutover, Delete Hardening, and Schema Finalization

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate legacy data, cut over reads to project-scoped queries, harden delete semantics, and finalize schema with `NOT NULL` constraints.

**Architecture:** Phase 3 maps ambiguous data; Phase 4 swaps reads; Phase 5 blocks unsafe deletes; Phase 6 enforces schema invariants.

**Tech Stack:** Prisma, PostgreSQL migrations, service layer updates.

---

## Phase 3: Backfill Legacy Data

### Task 3.1: Implement Auto-Backfill for Single-Project Orgs

**Files:**
- Create: `src/scripts/backfill-single-project-orgs.ts`
- Create: `src/__tests__/phase-3/backfill-single-project.test.ts`

**What to do:**

Create and test auto-backfill script:

```typescript
// src/scripts/backfill-single-project-orgs.ts

import { prisma } from '@/server/db';

export async function backfillSingleProjectOrgs() {
  console.log('=== Backfilling Single-Project Organizations ===\n');

  const orgs = await prisma.organization.findMany({
    include: { projects: true },
  });

  for (const org of orgs) {
    if (org.projects.length !== 1) continue;

    const projectId = org.projects[0].id;
    console.log(`Processing org ${org.name} (${org.id}) -> project ${projectId}`);

    // Backfill each model
    const results = await Promise.all([
      backfillMetaConnections(org.id, projectId),
      backfillMetaPixels(org.id, projectId),
      backfillMetaAdAccounts(org.id, projectId),
      backfillWhatsAppConnections(org.id, projectId),
      backfillWhatsAppConfigs(org.id, projectId),
      backfillWhatsAppOnboardings(org.id, projectId),
      backfillMetaConversionEvents(org.id, projectId),
    ]);

    const total = results.reduce((a, b) => a + b, 0);
    console.log(`  ✓ Backfilled ${total} records\n`);
  }

  console.log('=== Auto-Backfill Complete ===');
}

async function backfillMetaConnections(
  organizationId: string,
  projectId: string
): Promise<number> {
  const result = await prisma.metaConnection.updateMany({
    where: {
      organizationId,
      projectId: null,
    },
    data: { projectId },
  });

  console.log(`  - MetaConnection: ${result.count}`);
  return result.count;
}

// Similar functions for other models...

// Run from CLI:
// npx ts-node src/scripts/backfill-single-project-orgs.ts
```

- [ ] **Step 1: Write backfill script**
- [ ] **Step 2: Write test that verifies backfill correctness**
- [ ] **Step 3: Run script on test data**
- [ ] **Step 4: Verify counts match expectations**
- [ ] **Step 5: Commit**

**Verification:**
- Script runs without errors
- All single-project org assets are backfilled
- Test passes

---

### Task 3.2: Document Manual Mapping Process for Multi-Project Orgs

**Files:**
- Create: `docs/PRD/32_PHASE_3_MANUAL_MAPPING_GUIDE.md`

**What to do:**

Create guide for manual mapping:

```markdown
# Phase 3: Manual Mapping Guide for Multi-Project Organizations

## When Manual Mapping Is Required

Organizations with 2+ projects and ambiguous assets need explicit mapping:

- Multiple MetaConnections with same organizationId
- Multiple MetaPixels with same organizationId
- Multiple WhatsAppConfigs with same organizationId

## Process

1. **Identify affected orgs**
   - Run analysis script: `npx ts-node src/scripts/analyze-ownership-ambiguity.ts`
   - Look for orgs with 2+ projects and assets

2. **For each asset, determine project ownership**
   - Which project uses this connection/pixel/config?
   - Who is the client owner?
   - Document mapping decision

3. **Create manual mapping records** (example)
   ```
   Organization: Acme Agency
   Project 1: Client A (ABC Corp)
   Project 2: Client B (XYZ Inc)

   MetaConnection "john-fb-account":
   - Used by: Client A (Project 1)
   - Decision: Map to Project 1

   MetaPixel "673829473":
   - Used by: Client A (Project 1)
   - Decision: Map to Project 1
   ```

4. **Execute mapping via database**
   ```sql
   UPDATE "MetaConnection"
   SET "projectId" = 'project-uuid-1'
   WHERE "organizationId" = 'org-uuid'
     AND "fbUserId" = 'specific-user'
     AND "projectId" IS NULL;
   ```

5. **Validate mapping**
   - Verify all assets now have projectId
   - Check for conflicts
   - Confirm with team before Phase 4

## Validation Queries

```sql
-- Count remaining assets without projectId
SELECT COUNT(*) FROM "MetaConnection" WHERE "projectId" IS NULL;
SELECT COUNT(*) FROM "MetaPixel" WHERE "projectId" IS NULL;
SELECT COUNT(*) FROM "WhatsAppConfig" WHERE "projectId" IS NULL;

-- All should return 0 before Phase 4
```

## Phase 3 Completion Criteria

- [ ] All single-project orgs auto-backfilled
- [ ] All multi-project orgs manually mapped
- [ ] All assets have projectId set
- [ ] Validation queries return 0 for NULL projectId
```

- [ ] **Step 1: Write guide**
- [ ] **Step 2: Review with team**
- [ ] **Step 3: Commit**

**Verification:**
- Guide is clear enough for manual execution
- Team confirms readiness for mapping

---

### Task 3.3: Verify Backfill Complete Before Phase 4

**Files:**
- Create: `src/scripts/validate-backfill.ts`

**What to do:**

Create validation script:

```typescript
// src/scripts/validate-backfill.ts

export async function validateBackfill() {
  const results = {
    metaConnection: await prisma.metaConnection.count({ where: { projectId: null } }),
    metaPixel: await prisma.metaPixel.count({ where: { projectId: null } }),
    metaAdAccount: await prisma.metaAdAccount.count({ where: { projectId: null } }),
    whatsAppConnection: await prisma.whatsAppConnection.count({ where: { projectId: null } }),
    whatsAppConfig: await prisma.whatsAppConfig.count({ where: { projectId: null } }),
    whatsAppOnboarding: await prisma.whatsAppOnboarding.count({ where: { projectId: null } }),
    metaConversionEvent: await prisma.metaConversionEvent.count({ where: { projectId: null } }),
  };

  console.log('Backfill Validation:');
  Object.entries(results).forEach(([model, count]) => {
    if (count === 0) {
      console.log(`  ✓ ${model}: all mapped`);
    } else {
      console.log(`  ⚠ ${model}: ${count} records still unassigned`);
    }
  });

  const allOk = Object.values(results).every(count => count === 0);
  if (allOk) {
    console.log('\n✓ Backfill complete. Ready for Phase 4.');
  } else {
    console.log('\n⚠ Backfill incomplete. Address above before proceeding.');
  }
}
```

- [ ] **Step 1: Write validation script**
- [ ] **Step 2: Run script to verify backfill**
- [ ] **Step 3: If any counts > 0, repeat backfill or manual mapping**
- [ ] **Step 4: Confirm all counts are 0**
- [ ] **Step 5: Commit Phase 3**

**Verification:**
- All assets have projectId
- Validation script confirms

---

## Phase 4: Read Path Cutover

### Task 4.1: Cut Over Meta Ads Reads to Project-Scoped Queries

**Files:**
- Modify: `src/services/meta-ads/meta-connection.service.ts`
- Modify: `src/services/meta-ads/meta-pixel.service.ts`
- Modify: `src/services/meta-ads/ad-account.service.ts`
- Create: `src/__tests__/phase-4/meta-ads-reads.test.ts`

**What to do:**

Update reads to use `projectId` instead of `organizationId`:

```typescript
// BEFORE (Phase 1-3):
async function listMetaConnections(organizationId: string) {
  return prisma.metaConnection.findMany({
    where: { organizationId },  // org-scoped
  });
}

// AFTER (Phase 4):
async function listMetaConnections(organizationId: string, projectId: string) {
  // Verify project belongs to org
  await ensureProjectBelongsToOrganization(organizationId, projectId);

  return prisma.metaConnection.findMany({
    where: {
      organizationId,  // guard
      projectId,  // business scope
    },
  });
}
```

Apply same pattern to:
- `listMetaPixels`
- `getActiveAccounts`
- `listMetaAdAccounts`

- [ ] **Step 1: Update MetaConnection reads**
- [ ] **Step 2: Update MetaPixel reads**
- [ ] **Step 3: Update MetaAdAccount reads**
- [ ] **Step 4: Write tests for project-scoped reads**
- [ ] **Step 5: Run tests**
- [ ] **Step 6: Commit**

**Verification:**
- Tests pass
- Reads now return only project-scoped assets
- Missing projectId returns 0 results instead of org-wide results

---

### Task 4.2: Cut Over WhatsApp Reads to Project-Scoped Queries

**Files:**
- Modify: `src/services/whatsapp/whatsapp-config.service.ts`
- Create: `src/__tests__/phase-4/whatsapp-reads.test.ts`

**What to do:**

Update reads to use `projectId`:

```typescript
// BEFORE:
async function listWhatsAppInstances(organizationId: string) {
  return prisma.whatsAppConfig.findMany({
    where: { organizationId },
  });
}

// AFTER:
async function listWhatsAppInstances(organizationId: string, projectId: string) {
  await ensureProjectBelongsToOrganization(organizationId, projectId);

  return prisma.whatsAppConfig.findMany({
    where: { organizationId, projectId },
  });
}
```

- [ ] **Step 1-6: Same as Meta Ads**

**Verification:**
- Tests pass
- Reads scoped to project

---

### Task 4.3: Update CAPI to Resolve Pixels by Project

**Files:**
- Modify: `src/services/meta-ads/capi.service.ts`

**What to do:**

Change CAPI to send events only to pixels of the ticket's project:

```typescript
// src/services/meta-ads/capi.service.ts

export async function sendEvent(ticketId: string) {
  // 1. Load ticket with project
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { project: true },
  });

  if (!ticket?.projectId) {
    logger.error({ ticketId }, 'Ticket has no projectId, aborting CAPI');
    return { success: false, error: 'No project context' };
  }

  // 2. Find pixels for THIS PROJECT ONLY
  const pixels = await prisma.metaPixel.findMany({
    where: {
      organizationId: ticket.project.organizationId,
      projectId: ticket.projectId,  // CHANGED: was organizationId only
      isActive: true,
    },
  });

  if (pixels.length === 0) {
    logger.warn(
      { ticketId, projectId: ticket.projectId },
      'No pixels found for project, skipping CAPI'
    );
    return { success: false, error: 'No pixels configured for this project' };
  }

  // 3. Send to each pixel
  const results = await Promise.all(
    pixels.map(pixel => sendConversionEvent(pixel, ticket))
  );

  return { success: results.every(r => r.success) };
}
```

- [ ] **Step 1: Update CAPI pixel resolution**
- [ ] **Step 2: Write test verifying project isolation**
- [ ] **Step 3: Commit**

**Verification:**
- CAPI only sends to pixels of the ticket's project
- Test shows cross-project isolation

---

### Task 4.4: Update Ad Enrichment to Resolve Connection by Project

**Files:**
- Modify: `src/services/meta-ads/ad-enrichment.service.ts`

**What to do:**

Change enrichment to use connection from ticket's project:

```typescript
// src/services/meta-ads/ad-enrichment.service.ts

export async function enrichTicket(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { project: true },
  });

  if (!ticket?.projectId) {
    logger.warn({ ticketId }, 'Ticket has no projectId, skipping enrichment');
    return null;
  }

  // Find connection for THIS PROJECT ONLY
  const connection = await prisma.metaConnection.findFirst({
    where: {
      organizationId: ticket.project.organizationId,
      projectId: ticket.projectId,  // CHANGED: was first available
      status: 'ACTIVE',
    },
  });

  if (!connection) {
    logger.warn(
      { ticketId, projectId: ticket.projectId },
      'No Meta connection for project'
    );
    return null;
  }

  // Use this connection's token to fetch lead data
  const adData = await fetchLeadAdDataFromMeta(connection.accessToken, ticket.lead);

  return enrichWithAdData(ticket, adData);
}
```

- [ ] **Step 1: Update connection resolution**
- [ ] **Step 2: Write test**
- [ ] **Step 3: Commit**

**Verification:**
- Enrichment uses project's connection only
- Test shows isolation

---

### Task 4.5: Update API Routes to Pass projectId

**Files:**
- Modify: `src/app/api/v1/meta-ads/connections/route.ts`
- Modify: `src/app/api/v1/meta-ads/pixels/route.ts`
- Modify: `src/app/api/v1/whatsapp/instances/route.ts`
- Modify: All other integration routes

**What to do:**

Update routes to extract projectId from context and pass to services:

```typescript
// src/app/api/v1/meta-ads/connections/route.ts

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession(/* ... */);
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

  const organizationId = session.user.organizationId;
  const projectId = resolveProjectScope(request);  // from header/query

  if (!projectId) {
    return json(
      { error: 'Project context required' },
      { status: 400 }
    );
  }

  const connections = await metaConnectionService.listMetaConnections(
    organizationId,
    projectId  // CHANGED: now required
  );

  return json({ connections });
}
```

- [ ] **Step 1: Update all integration GET routes**
- [ ] **Step 2: Update all integration POST/PATCH routes**
- [ ] **Step 3: Write tests for missing projectId**
- [ ] **Step 4: Commit**

**Verification:**
- All routes require projectId
- Routes 404 if asset doesn't belong to project

---

### Task 4.6: Run Smoke Checks and Validation

**Files:**
- Reference: Phase 0 smoke checklists

**What to do:**

- [ ] **Step 1: Run Meta Ads smoke checklist**
  - Verify connections show only for current project
  - Verify pixels show only for current project
  - Switch projects, verify assets change

- [ ] **Step 2: Run WhatsApp smoke checklist**
  - Verify configs show only for current project
  - Switch projects, verify configs change

- [ ] **Step 3: Test CAPI isolation**
  - Create sales in different projects
  - Verify each conversion goes to correct pixel
  - Check logs for project isolation

- [ ] **Step 4: Commit Phase 4**

```bash
git commit -m "feat(phase-4): read path cutover to project-scoped queries

Meta Ads:
- listMetaConnections now scoped to projectId
- listMetaPixels now scoped to projectId
- getActiveAccounts now scoped to projectId

WhatsApp:
- listWhatsAppInstances now scoped to projectId

CAPI:
- Conversion events sent to project's pixels only
- No cross-project pixel selection

Enrichment:
- Uses connection from ticket's project
- Fails safely if no connection in project

API Routes:
- All require projectId from context
- Return 400 if projectId missing
- Return 404 if asset not in project

Testing:
- Tests verify project isolation
- Smoke checks show correct scoping
- Cross-project data is isolated
"
```

**Verification:**
- All smoke checks pass
- Project isolation verified

---

## Phase 5: Delete Hardening

### Task 5.1: Add Delete Guards for Projects with Assets

**Files:**
- Modify: `src/services/projects/project.service.ts`
- Create: `src/__tests__/phase-5/project-delete-guards.test.ts`

**What to do:**

Update project deletion to check for owned assets:

```typescript
// src/services/projects/project.service.ts

export async function deleteProject(
  organizationId: string,
  projectId: string
): Promise<Result<void>> {
  // Verify ownership
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.organizationId !== organizationId) {
    return fail('Project not found');
  }

  // Check for owned assets
  const assetCounts = {
    metaConnections: await prisma.metaConnection.count({
      where: { projectId },
    }),
    metaPixels: await prisma.metaPixel.count({
      where: { projectId },
    }),
    whatsAppConfigs: await prisma.whatsAppConfig.count({
      where: { projectId },
    }),
    leads: await prisma.lead.count({
      where: { projectId },
    }),
    tickets: await prisma.ticket.count({
      where: { projectId },
    }),
  };

  const hasAssets = Object.values(assetCounts).some(count => count > 0);

  if (hasAssets) {
    return fail(
      `Cannot delete project with assets. ` +
      `Archive the project instead. Assets: ${JSON.stringify(assetCounts)}`
    );
  }

  // Safe to delete
  await prisma.project.delete({
    where: { id: projectId },
  });

  return ok();
}

export async function archiveProject(
  organizationId: string,
  projectId: string
): Promise<Result<void>> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.organizationId !== organizationId) {
    return fail('Project not found');
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: 'archived',
      archivedAt: new Date(),
    },
  });

  return ok();
}
```

- [ ] **Step 1: Add asset counting logic**
- [ ] **Step 2: Add archive function**
- [ ] **Step 3: Write tests for delete guards**
- [ ] **Step 4: Commit**

**Verification:**
- Delete fails with clear error if assets exist
- Archive succeeds
- Tests verify behavior

---

### Task 5.2: Update Delete API Route to Return 409

**Files:**
- Modify: `src/app/api/v1/projects/[id]/route.ts`

**What to do:**

```typescript
// src/app/api/v1/projects/[id]/route.ts

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession(/* ... */);
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

  const result = await projectService.deleteProject(
    session.user.organizationId,
    params.id
  );

  if (!result.success) {
    return json(
      { error: result.error },
      { status: 409 }  // Conflict: can't delete due to owned assets
    );
  }

  return json({ success: true });
}
```

- [ ] **Step 1: Update route**
- [ ] **Step 2: Write test for 409 response**
- [ ] **Step 3: Commit**

**Verification:**
- Route returns 409 when project has assets
- Test confirms behavior

---

## Phase 6: Schema Hardening

### Task 6.1: Add NOT NULL Constraints to projectId Fields

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>-make-projectId-not-null/migration.sql`

**What to do:**

Update schema to enforce NOT NULL after all data is migrated:

```prisma
// prisma/schema.prisma

model MetaConnection {
  // ...
  projectId String @db.Uuid  // CHANGED: removed '?'
  // ...
}

model MetaPixel {
  // ...
  projectId String @db.Uuid  // CHANGED: removed '?'
  // ...
}

// Same for all other models: MetaAdAccount, WhatsAppConnection, WhatsAppConfig, WhatsAppOnboarding, MetaConversionEvent
```

Migration:

```sql
-- Verify no NULL values before adding constraint
SELECT COUNT(*) FROM "MetaConnection" WHERE "projectId" IS NULL;

-- Should return 0, then:
ALTER TABLE "MetaConnection" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "MetaPixel" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "MetaAdAccount" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "WhatsAppConnection" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "WhatsAppConfig" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "WhatsAppOnboarding" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "MetaConversionEvent" ALTER COLUMN "projectId" SET NOT NULL;
```

- [ ] **Step 1: Verify all projectId values are set (COUNT WHERE NULL = 0)**
- [ ] **Step 2: Update schema to remove '?' from projectId**
- [ ] **Step 3: Generate migration**
- [ ] **Step 4: Apply migration**
- [ ] **Step 5: Verify schema**
- [ ] **Step 6: Commit**

**Verification:**
- Migration applies without errors
- Schema validates
- No NULL projectId values remain

---

### Task 6.2: Clean Up Unique Constraints and Indexes

**Files:**
- Modify: `prisma/schema.prisma`

**What to do:**

Finalize unique constraints now that projectId is NOT NULL:

```prisma
model MetaConnection {
  // ...
  projectId String @db.Uuid  // now NOT NULL

  // REMOVE old org-scoped unique:
  // @@unique([organizationId, fbUserId])

  // KEEP new project-scoped unique:
  @@unique([projectId, fbUserId])

  // Keep combined index:
  @@index([organizationId, projectId])
}

// Same pattern for other models
```

- [ ] **Step 1: Update constraints**
- [ ] **Step 2: Generate migration (may be empty)**
- [ ] **Step 3: Commit**

**Verification:**
- Schema validates
- No duplicate keys exist

---

### Task 6.3: Final Validation and Phase 6 Completion

**Files:**
- All Phase 6 changes

**What to do:**

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

- [ ] **Step 2: Run tests**

```bash
npm run test -- --run
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

- [ ] **Step 4: Run smoke checks from Phase 0**

Meta Ads and WhatsApp flows should still work.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "build(phase-6): schema hardening complete

Add NOT NULL constraints:
- All projectId fields are now mandatory
- No org-scoped assets without project ownership

Finalize unique constraints:
- [projectId, fbUserId] for MetaConnection
- [projectId, pixelId] for MetaPixel
- [projectId, adAccountId] for MetaAdAccount
- [projectId, wabaId] for WhatsAppConnection

Remove obsolete org-scoped constraints:
- [organizationId, fbUserId] unique removed from MetaConnection
- Similar for other models

Invariants:
- Every integration asset must belong to exactly one project
- No fallback to organization-wide asset selection
- Delete requires all project assets to be removed first

Ready for PRD 30 (Billing) integration
"
```

**Verification:**
- All tests pass
- Build succeeds
- Smoke checks pass

---

## Program Completion Criteria

The entire PRD 32 program is complete when:

1. ✅ **Phase 0** — Baseline frozen, flows documented, backfill strategy defined
2. ✅ **Phase 1** — Schema expanded, projectId fields added, no behavior change
3. ✅ **Phase 2** — Writes create assets with projectId, require project context
4. ✅ **Phase 3** — Legacy data migrated, all assets have projectId
5. ✅ **Phase 4** — Reads scoped to project, CAPI/enrichment use project context
6. ✅ **Phase 5** — Delete guards prevent orphaned data, archive as alternative
7. ✅ **Phase 6** — Schema enforces NOT NULL, constraints finalized

### Final Validation

```bash
# Schema
- All projectId fields are NOT NULL
- All necessary indexes exist
- No org-scoped fallback possible

# Services
- All reads require projectId and organizationId
- All writes set projectId
- CAPI sends to project's pixels
- Enrichment uses project's connection

# API Routes
- All routes require project context
- 400 if projectId missing
- 404 if asset not in project
- 409 if delete with owned assets

# Tests
- All pass
- No regressions vs Phase 0 baseline
- Project isolation verified

# Smoke Checks
- Meta Ads connection flow works
- WhatsApp connection flow works
- Conversions route to correct pixels
- Multiple projects work independently
```

### Next Steps

After PRD 32 completion:

- **PRD 30** — Implement billing by project, AI allowance/overage per project
- **PRD 31** — Apply Next.js skill improvements (optional, can run in parallel)

Both depend on PRD 32 ownership model being complete.
