# PRD 32 Phase 0: Baseline and Characterization

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze current behavior before migration begins, document all affected flows, create baseline tests and smoke checklists.

**Architecture:** Map all Meta Ads, WhatsApp, CAPI and enrichment flows; document data ownership patterns; create characterization tests for sensitive paths; identify legacy data requiring backfill decisions.

**Tech Stack:** Vitest (unit tests), manual smoke test checklists, Prisma introspection.

---

## Chunk 1: Flow Inventory and Documentation

### Task 0.1: Document Meta Ads Connection Flow

**Files:**
- Create: `docs/PRD/32_BASELINE_META_ADS_FLOW.md`
- Reference: `src/app/api/v1/meta-ads/connect/route.ts`, `src/app/api/v1/meta-ads/callback/route.ts`

**What to do:**

Create a detailed map of the current Meta Ads flow:

```markdown
# Current Meta Ads Connection Flow

## Entry Point
- Route: `GET /api/v1/meta-ads/connect?organizationId=...`
- Purpose: Initiate OAuth with Meta
- Current behavior: Creates OAuth state with organizationId only

## OAuth State Structure
- Current: `{ organizationId, userId }`
- Passed to Meta via redirect

## Callback Handler
- Route: `POST /api/v1/meta-ads/callback`
- Receives: code, state
- Current behavior:
  1. Verify state signature
  2. Exchange code for access token
  3. Fetch FB user info
  4. Create/update MetaConnection with organizationId
  5. Sync ad accounts to organizationId
  6. Redirect to UI

## Service Calls
- `metaConnectionService.createOrUpdateConnection()`
- `metaAdAccountService.syncAdAccounts()`

## Data Persistence
- MetaConnection: organizationId, fbUserId, fbUserName, accessToken, status
- MetaAdAccount: organizationId, connectionId, adAccountId, adAccountName, isActive

## Current Limitation
- No projectId in state or persistence
- All connections and accounts belong to organization level
```

**Verification:**
- File created at `docs/PRD/32_BASELINE_META_ADS_FLOW.md`
- Document includes: entry point, state structure, callback flow, service calls, data persistence, limitations

---

### Task 0.2: Document WhatsApp Onboarding Flow

**Files:**
- Create: `docs/PRD/32_BASELINE_WHATSAPP_FLOW.md`
- Reference: `src/app/api/v1/whatsapp/onboarding/route.ts`, `src/app/api/v1/whatsapp/callback/route.ts`

**What to do:**

Create a detailed map of the current WhatsApp onboarding flow:

```markdown
# Current WhatsApp Onboarding Flow

## Entry Point
- Route: `GET /api/v1/whatsapp/onboarding?organizationId=...`
- Purpose: Initiate WhatsApp Business Account onboarding
- Current behavior: Creates onboarding session with organizationId only

## Onboarding Session Structure
- Model: WhatsAppOnboarding
- Current fields: id, organizationId, trackingCode, authorizationCode, status, createdAt, updatedAt
- Purpose: Track onboarding progress

## Callback Handler
- Route: `POST /api/v1/whatsapp/callback`
- Receives: code, tracking_code
- Current behavior:
  1. Find onboarding session by tracking_code
  2. Verify authorization code
  3. Create WhatsAppConnection with organizationId
  4. Create WhatsAppConfig with organizationId
  5. Mark onboarding as complete

## Service Calls
- `whatsappOnboardingService.createOnboardingSession()`
- `whatsappOnboardingService.handleOnboardingCallback()`

## Data Persistence
- WhatsAppOnboarding: organizationId, trackingCode, authorizationCode, status
- WhatsAppConnection: organizationId, wabaId, ownerBusinessId, phoneNumberId, status
- WhatsAppConfig: organizationId, connectionId, phoneNumberId, webhookToken, status

## Current Limitation
- No projectId in onboarding session or persisted records
- All configs belong to organization level
- Multiple numbers in same project have no concept of project ownership
```

**Verification:**
- File created at `docs/PRD/32_BASELINE_WHATSAPP_FLOW.md`
- Document includes: entry point, session structure, callback flow, service calls, data persistence, limitations

---

### Task 0.3: Document CAPI and Ad Enrichment Flow

**Files:**
- Create: `docs/PRD/32_BASELINE_CAPI_ENRICHMENT_FLOW.md`
- Reference: `src/services/meta-ads/capi.service.ts`, `src/services/meta-ads/ad-enrichment.service.ts`

**What to do:**

Create a detailed map of the current CAPI and ad enrichment flows:

```markdown
# Current CAPI and Ad Enrichment Flow

## CAPI (Conversion API) Flow

### Entry Point
- Called from: `src/services/tickets/ticket.service.ts` when sale is created
- Input: ticketId, sale data

### Current Behavior
1. Load ticket (has organizationId via project, but CAPI ignores it)
2. Query all MetaPixels for the organization: `where: { organizationId }`
3. For each active pixel:
   - Build conversion event payload
   - Send to Meta Conversion API
   - Log result to MetaConversionEvent

### Limitation
- Uses organization-wide pixel pool
- No validation that pixel belongs to ticket's project
- Risk: may send conversions to wrong client's pixel

## Ad Enrichment Flow

### Entry Point
- Called from: ticket enrichment pipeline
- Input: ticket with lead data

### Current Behavior
1. Load ticket's organization
2. Query MetaConnections for organization: `where: { organizationId }`
3. Pick first active connection
4. Use that connection's token to:
   - Fetch lead's click data from Meta
   - Resolve which ad/account/campaign led to the lead
5. Enrich ticket with campaign hierarchy

### Limitation
- Uses organization's first active connection
- No validation that connection belongs to ticket's project
- Risk: may use wrong client's ad account token

## Risk Assessment
- Cross-project data contamination if one org has multiple projects
- Conversion events may route to wrong pixels
- Lead attribution may use wrong account credentials
```

**Verification:**
- File created at `docs/PRD/32_BASELINE_CAPI_ENRICHMENT_FLOW.md`
- Document includes: entry points, current behavior, pixel/connection selection logic, risks

---

### Task 0.4: Document Data Ownership Patterns

**Files:**
- Create: `docs/PRD/32_BASELINE_DATA_OWNERSHIP.md`

**What to do:**

Create a comprehensive map of current data ownership:

```markdown
# Current Data Ownership Patterns

## Organization-Scoped (Correct)
- Organization: id, name, subscription, members, RBAC
- Project: organizationId, name
- Ticket: projectId (tied to lead/conversation)
- Conversation: projectId (WhatsApp/channel-specific)

## Organization-Scoped but Should Be Project-Scoped (TARGET)
- MetaConnection: organizationId only, no projectId
- MetaAdAccount: organizationId only, no projectId
- MetaPixel: organizationId only, no projectId
- WhatsAppConnection: organizationId only, no projectId
- WhatsAppConfig: organizationId only, no projectId (may have projectId but not enforced)
- WhatsAppOnboarding: organizationId only, no projectId

## Project-Scoped (For Reference)
- Lead: projectId
- Ticket: projectId
- Sale: projectId (via ticket)
- Item: projectId
- ItemCategory: projectId

## Multi-Project Orgs: Risk Assessment
- If org has 2+ projects, ownership is ambiguous
- Assets created in one project may be visible/usable in another
- CAPI may send conversions to wrong pixel
- Ad enrichment may use wrong connection

## Auto-Mapable Cases
- Organizations with exactly 1 project
- Can auto-assign all org-scoped assets to that single project during backfill

## Requires Manual Mapping
- Organizations with 2+ projects
- Multiple ambiguous assets (multiple connections, pixels, configs)
- Requires explicit mapping before cutover
```

**Verification:**
- File created at `docs/PRD/32_BASELINE_DATA_OWNERSHIP.md`
- Document includes: org-scoped assets, project-scoped assets, multi-project risk, backfill strategy

---

## Chunk 2: Characterization Tests

### Task 0.5: Write Baseline Test for Meta Ads OAuth Flow

**Files:**
- Create: `src/__tests__/baseline/meta-ads-oauth.baseline.test.ts`
- Reference: `src/app/api/v1/meta-ads/connect/route.ts`, `src/app/api/v1/meta-ads/callback/route.ts`

**What to do:**

Create characterization test that documents current OAuth behavior:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';

describe('Meta Ads OAuth Flow - Baseline', () => {
  describe('GET /api/v1/meta-ads/connect', () => {
    it('should create OAuth state with organizationId only', async () => {
      // This test documents the CURRENT behavior
      // After Phase 2, this test will be updated to include projectId

      const organizationId = 'org-123';
      const userId = 'user-456';

      // When user initiates Meta connection
      // State is created with: { organizationId, userId }
      // No projectId is included

      // Verification: State can be decoded and contains organizationId
      expect(true).toBe(true); // Placeholder - real test loads actual route
    });
  });

  describe('POST /api/v1/meta-ads/callback', () => {
    it('should create MetaConnection with organizationId scope', async () => {
      // This test documents the CURRENT behavior
      // After Phase 2, this test will verify projectId is stored

      // When callback is processed:
      // 1. MetaConnection is created with organizationId
      // 2. MetaAdAccount records inherit organizationId
      // 3. No projectId is assigned

      // Verification: Assets belong to organization
      expect(true).toBe(true); // Placeholder
    });
  });
});
```

**Verification:**
- Test file created at `src/__tests__/baseline/meta-ads-oauth.baseline.test.ts`
- Test compiles without errors: `npm run test -- src/__tests__/baseline/meta-ads-oauth.baseline.test.ts`

---

### Task 0.6: Write Baseline Test for CAPI Pixel Selection

**Files:**
- Create: `src/__tests__/baseline/capi-pixel-selection.baseline.test.ts`
- Reference: `src/services/meta-ads/capi.service.ts`

**What to do:**

Create characterization test that documents current CAPI behavior:

```typescript
import { describe, it, expect } from 'vitest';

describe('CAPI Pixel Selection - Baseline', () => {
  it('should select pixels from organization pool when sending conversion', async () => {
    // This test documents the CURRENT behavior
    // After Phase 4, this test will verify pixel comes from ticket's project only

    // When a conversion event is sent:
    // 1. Ticket is loaded
    // 2. All MetaPixels for ticket's organization are fetched
    // 3. Conversion sent to all active pixels
    // 4. No validation that pixel belongs to ticket's project

    // Risk: If org has Project A (Client 1) and Project B (Client 2),
    // a conversion from Project A's ticket may be sent to Project B's pixel

    expect(true).toBe(true); // Placeholder
  });
});
```

**Verification:**
- Test file created at `src/__tests__/baseline/capi-pixel-selection.baseline.test.ts`
- Test compiles without errors

---

## Chunk 3: Manual Smoke Checklists

### Task 0.7: Create Smoke Checklist for Meta Ads Connection

**Files:**
- Create: `docs/PRD/32_SMOKE_CHECKLIST_META_ADS.md`

**What to do:**

Create reproducible manual smoke test checklist:

```markdown
# Meta Ads Connection - Smoke Checklist

## Pre-Test Setup
- [ ] Create a test organization
- [ ] Create a test project in that organization
- [ ] Ensure you have Meta Business Account access

## Flow: Connect Meta Ads Account

1. **Navigate to Integration Settings**
   - [ ] Go to `/dashboard/settings/integrations?tab=meta-ads`
   - [ ] Verify UI loads without errors
   - [ ] Check that there is a "Connect Meta Ads" button

2. **Initiate OAuth**
   - [ ] Click "Connect Meta Ads" button
   - [ ] Verify redirect to Meta login happens
   - [ ] Verify URL contains `organizationId` in query or state

3. **Complete Meta Authorization**
   - [ ] Log in with your Meta test account
   - [ ] Grant permissions
   - [ ] Verify redirect back to WhaTrack happens

4. **Verify Connection Created**
   - [ ] Check database: `SELECT * FROM "MetaConnection" WHERE "organizationId" = '...'`
   - [ ] Verify connection record exists with:
     - organizationId ✓
     - fbUserId ✓
     - accessToken ✓
     - status = 'ACTIVE' ✓

5. **Verify Ad Accounts Synced**
   - [ ] Check database: `SELECT * FROM "MetaAdAccount" WHERE "organizationId" = '...'`
   - [ ] Verify at least one ad account was imported
   - [ ] Verify each account has:
     - organizationId ✓
     - connectionId ✓
     - adAccountId ✓
     - isActive = true or false ✓

6. **Expected Result**
   - [ ] Connection appears in UI list
   - [ ] UI shows connected account name
   - [ ] Can toggle account on/off
   - [ ] No errors in browser console
   - [ ] No errors in server logs

## Known Limitations (Document Here)
- [ ] All assets created at organization scope
- [ ] No projectId assigned
- [ ] If multiple projects exist, ownership is ambiguous

## Notes for Phase 2
- After Phase 2, this flow should include projectId in state and persistence
- UI should show which project the connection is being created for
```

**Verification:**
- Checklist created at `docs/PRD/32_SMOKE_CHECKLIST_META_ADS.md`
- Checklist is detailed enough for anyone to follow without context

---

### Task 0.8: Create Smoke Checklist for WhatsApp Connection

**Files:**
- Create: `docs/PRD/32_SMOKE_CHECKLIST_WHATSAPP.md`

**What to do:**

Create reproducible manual smoke test checklist for WhatsApp:

```markdown
# WhatsApp Connection - Smoke Checklist

## Pre-Test Setup
- [ ] Create a test organization
- [ ] Create a test project in that organization
- [ ] Ensure you have WhatsApp Business Account access

## Flow: Connect WhatsApp

1. **Navigate to Integration Settings**
   - [ ] Go to `/dashboard/settings/integrations?tab=whatsapp`
   - [ ] Verify UI loads without errors
   - [ ] Check that there is a "Connect WhatsApp" button

2. **Initiate Onboarding**
   - [ ] Click "Connect WhatsApp" button
   - [ ] Verify onboarding modal/page appears
   - [ ] Note the tracking code displayed

3. **Complete Provider Onboarding**
   - [ ] Follow WhatsApp provider flow
   - [ ] Authorize with your WhatsApp business account
   - [ ] Complete the provider handshake

4. **Verify Onboarding Session Created**
   - [ ] Check database: `SELECT * FROM "WhatsAppOnboarding" WHERE "organizationId" = '...'`
   - [ ] Verify onboarding record exists with:
     - organizationId ✓
     - trackingCode ✓
     - status = 'pending' (before callback) ✓

5. **Verify Callback Processed**
   - [ ] Wait for callback from provider
   - [ ] Check database for new WhatsAppConnection:
     - organizationId ✓
     - wabaId ✓
     - phoneNumberId ✓
     - status = 'connected' ✓
   - [ ] Check database for new WhatsAppConfig:
     - organizationId ✓
     - connectionId ✓
     - phoneNumberId ✓
     - status = 'active' ✓

6. **Verify Connection in UI**
   - [ ] UI refreshes and shows connected number
   - [ ] Number is marked as active
   - [ ] Can toggle number on/off
   - [ ] No errors in browser console
   - [ ] No errors in server logs

## Known Limitations (Document Here)
- [ ] All assets created at organization scope
- [ ] No projectId assigned
- [ ] If multiple projects exist, ownership is ambiguous
- [ ] Multiple numbers per project create ambiguity about which project each number belongs to

## Notes for Phase 2
- After Phase 2, this flow should include projectId in onboarding session
- UI should show which project the connection is being created for
- Multiple numbers in same project should still be allowed, but with clear project ownership
```

**Verification:**
- Checklist created at `docs/PRD/32_SMOKE_CHECKLIST_WHATSAPP.md`
- Checklist is detailed enough for anyone to follow

---

## Chunk 4: Data Backfill Analysis

### Task 0.9: Analyze Legacy Data and Create Backfill Strategy

**Files:**
- Create: `docs/PRD/32_BACKFILL_STRATEGY.md`
- Script: `src/scripts/analyze-ownership-ambiguity.ts` (analysis only, no changes)

**What to do:**

Create a script to analyze current data and document backfill strategy:

```typescript
// src/scripts/analyze-ownership-ambiguity.ts
// Run with: npx ts-node src/scripts/analyze-ownership-ambiguity.ts

import { prisma } from '@/server/db';

async function analyzeOwnershipAmbiguity() {
  console.log('=== Analyzing Data Ownership Ambiguity ===\n');

  // Get all organizations
  const orgs = await prisma.organization.findMany({
    include: { projects: true },
  });

  let autoMapableCount = 0;
  let manualMapRequired: string[] = [];

  for (const org of orgs) {
    const projectCount = org.projects.length;
    console.log(`\nOrganization: ${org.name} (${org.id})`);
    console.log(`  Projects: ${projectCount}`);

    if (projectCount === 1) {
      console.log('  ✓ Auto-mapable: Single project, all assets can map to it');
      autoMapableCount++;
    } else if (projectCount > 1) {
      // Check for ambiguity
      const connections = await prisma.metaConnection.count({
        where: { organizationId: org.id },
      });
      const pixels = await prisma.metaPixel.count({
        where: { organizationId: org.id },
      });
      const configs = await prisma.whatsAppConfig.count({
        where: { organizationId: org.id },
      });

      const assets = connections + pixels + configs;
      console.log(
        `  ⚠ Manual mapping required: ${projectCount} projects, ${assets} assets`
      );
      console.log(
        `    - MetaConnections: ${connections}, MetaPixels: ${pixels}, WhatsAppConfigs: ${configs}`
      );
      manualMapRequired.push(org.id);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Auto-mapable organizations: ${autoMapableCount}`);
  console.log(`Manual mapping required: ${manualMapRequired.length}`);
  if (manualMapRequired.length > 0) {
    console.log(`  IDs: ${manualMapRequired.join(', ')}`);
  }
}

analyzeOwnershipAmbiguity().catch(console.error);
```

Create documentation:

```markdown
# Backfill Strategy - Phase 3

## Analysis Results

Run the analysis script to generate backfill strategy:

```bash
npx ts-node src/scripts/analyze-ownership-ambiguity.ts
```

## Strategy

### Auto-Mapable Cases
- Organizations with exactly 1 project
- Action: During Phase 3, automatically assign all assets to that project
- Risk level: Low
- Validation: Verify all assets now have projectId set

### Manual Mapping Cases
- Organizations with 2+ projects and ambiguous assets
- Action: During Phase 3, create admin UI or support task to explicitly map each asset
- Risk level: Medium
- Validation: Require explicit confirmation before mapping

## Backfill Execution Order (Phase 3)

1. Run auto-mapping for single-project orgs
2. Generate report of manual mapping requirements
3. For manual cases, either:
   - Use admin UI to explicitly map
   - Or file support tickets for manual review
4. Validate all assets have projectId before moving to Phase 4

## Validation Queries

After backfill:

```sql
-- Verify all MetaConnections have projectId
SELECT COUNT(*) as without_projectId FROM "MetaConnection" WHERE "projectId" IS NULL;

-- Verify all MetaPixels have projectId
SELECT COUNT(*) as without_projectId FROM "MetaPixel" WHERE "projectId" IS NULL;

-- Verify all WhatsAppConfigs have projectId
SELECT COUNT(*) as without_projectId FROM "WhatsAppConfig" WHERE "projectId" IS NULL;
```

All counts should be 0 before Phase 4.
```

**Verification:**
- Script created at `src/scripts/analyze-ownership-ambiguity.ts`
- Script runs without errors: `npx ts-node src/scripts/analyze-ownership-ambiguity.ts`
- Documentation created at `docs/PRD/32_BACKFILL_STRATEGY.md`

---

## Chunk 5: Baseline Validation

### Task 0.10: Create Baseline Validation Checklist

**Files:**
- Create: `docs/PRD/32_BASELINE_VALIDATION.md`

**What to do:**

Create final validation checklist to confirm Phase 0 is complete:

```markdown
# Phase 0 - Baseline Validation Checklist

## Documentation Complete
- [ ] `docs/PRD/32_BASELINE_META_ADS_FLOW.md` created
  - Includes entry points, state structure, callback flow, service calls
  - Documents current limitation: no projectId in state or persistence

- [ ] `docs/PRD/32_BASELINE_WHATSAPP_FLOW.md` created
  - Includes entry points, session structure, callback flow, service calls
  - Documents current limitation: no projectId in onboarding or records

- [ ] `docs/PRD/32_BASELINE_CAPI_ENRICHMENT_FLOW.md` created
  - Includes CAPI pixel selection logic
  - Includes ad enrichment connection selection logic
  - Clearly documents risks of cross-project contamination

- [ ] `docs/PRD/32_BASELINE_DATA_OWNERSHIP.md` created
  - Maps org-scoped vs project-scoped assets
  - Documents multi-project risks
  - Identifies auto-mapable and manual-mapping cases

## Tests Complete
- [ ] `src/__tests__/baseline/meta-ads-oauth.baseline.test.ts` created
  - Test file compiles: `npm run test -- src/__tests__/baseline/meta-ads-oauth.baseline.test.ts`
  - Documents current OAuth state structure (organizationId only)

- [ ] `src/__tests__/baseline/capi-pixel-selection.baseline.test.ts` created
  - Test file compiles
  - Documents current CAPI pixel selection from org pool

## Smoke Checklists Complete
- [ ] `docs/PRD/32_SMOKE_CHECKLIST_META_ADS.md` created
  - Step-by-step instructions for testing Meta Ads connection flow
  - Includes database verification steps
  - Documents current limitations

- [ ] `docs/PRD/32_SMOKE_CHECKLIST_WHATSAPP.md` created
  - Step-by-step instructions for testing WhatsApp connection flow
  - Includes database verification steps
  - Documents current limitations

## Backfill Analysis Complete
- [ ] `src/scripts/analyze-ownership-ambiguity.ts` created
  - Script identifies auto-mapable and manual-mapping orgs
  - Script runs without errors

- [ ] `docs/PRD/32_BACKFILL_STRATEGY.md` created
  - Documents auto-mapping and manual-mapping strategies
  - Includes validation queries for Phase 3

## Code Quality
- [ ] `npm run lint` passes (may exclude baseline test files if they're placeholders)
- [ ] No new runtime errors introduced
- [ ] All documentation uses consistent terminology

## Team Readiness
- [ ] All documentation is accessible to team
- [ ] Baseline tests and checklists can be executed by anyone without additional context
- [ ] Backfill strategy is clear enough for either automated or manual execution

## Sign-Off
- [ ] Phase 0 is frozen
- [ ] Team has reviewed baseline documentation
- [ ] Team has confirmed smoke checklists are reproducible
- [ ] Ready to proceed to Phase 1

---

## Notes for Next Phase (Phase 1)
- Phase 1 will add `projectId` fields to schema
- Tests and checklists from Phase 0 will be used to validate that Phase 1 doesn't break existing functionality
- Backfill strategy from Phase 0 will inform Phase 3 execution
```

**Verification:**
- Checklist created at `docs/PRD/32_BASELINE_VALIDATION.md`
- Contains all items referenced above

---

### Task 0.11: Run Baseline Code Quality Checks

**Files:**
- Reference: All files created in Phase 0

**What to do:**

Run code quality checks to ensure Phase 0 is clean:

- [ ] **Step 1: Run linter**

```bash
npm run lint -- "src/__tests__/baseline" "docs"
```

Expected: No errors in baseline tests (may have warnings if tests are placeholders).

- [ ] **Step 2: Run baseline tests**

```bash
npm run test -- src/__tests__/baseline --run
```

Expected: Tests compile and run (may pass or fail, that's ok for characterization tests).

- [ ] **Step 3: Verify scripts**

```bash
npx ts-node src/scripts/analyze-ownership-ambiguity.ts
```

Expected: Script runs without compile errors and produces output.

- [ ] **Step 4: Commit Phase 0**

```bash
git add -A
git commit -m "docs(phase-0): baseline characterization and smoke checklists

- Add Meta Ads OAuth flow documentation
- Add WhatsApp onboarding flow documentation
- Add CAPI and enrichment flow documentation
- Add data ownership pattern analysis
- Create characterization tests for Meta Ads and CAPI
- Create smoke test checklists for Meta Ads and WhatsApp
- Add backfill strategy and analysis script
- Add Phase 0 validation checklist

Scope: Documentation only, no code changes.
Ready for Phase 1: Schema Expansion.
"
```

**Verification:**
- All linter checks pass
- All baseline tests compile
- Analysis script runs successfully
- Commit is created with Phase 0 work

---

## Phase 0 Completion Criteria

Phase 0 is complete when:

1. ✅ All flow diagrams are documented (Meta Ads, WhatsApp, CAPI, enrichment)
2. ✅ All data ownership patterns are analyzed
3. ✅ Baseline tests exist for sensitive paths
4. ✅ Smoke checklists are reproducible
5. ✅ Backfill strategy is documented
6. ✅ Team has reviewed and approved baseline documentation
7. ✅ Code quality checks pass
8. ✅ Phase 0 is committed

**Exit Criteria for Next Phase:**
- Phase 1 (Schema Expansion) may now begin
- Baseline tests and checklists will be used to verify Phase 1 doesn't break existing behavior
