# PRD 32: Implementation Execution Guide

**Branch:** `feature/2026-03-14-project-ownership-execution`

**Status:** Ready for Phase 0 execution via subagents

---

## Overview

This guide coordinates the execution of PRD 32 (Project Strict Ownership for Integrations) across 6 phases.

**Key Document:** [32_PRD_PROJECT_STRICT_OWNERSHIP_EXECUTION_PHASES.md](./32_PRD_PROJECT_STRICT_OWNERSHIP_EXECUTION_PHASES.md)

**Implementation Plans:** Located in `docs/superpowers/plans/`

---

## Execution Strategy

### Why Phased Execution?

The last major refactor broke production. To prevent that:

1. **Small, verifiable phases** — Each phase is testable independently
2. **Smoke checks between phases** — Manual verification at each milestone
3. **Schema safety** — Migrations are nullable-first, constraints added last
4. **Backward compatibility** — Writes flow changes before reads flow changes
5. **Subagent isolation** — Each phase runs via a fresh subagent with clear scope

### Phase Dependencies

```
Phase 0: Baseline (documentation only)
    ↓
Phase 1: Schema Expansion (add fields)
    ↓
Phase 2: Write Cutover (new assets have projectId)
    ↓
Phase 3: Backfill (migrate existing assets)
    ↓
Phase 4: Read Cutover (query by projectId)
    ↓
Phase 5: Delete Hardening (protect orphaned data)
    ↓
Phase 6: Schema Finalization (enforce NOT NULL)
```

Each phase can only proceed after the previous one is complete and verified.

---

## Implementation Plans

All plans are located in `docs/superpowers/plans/`:

| Plan | Phase | Purpose |
|---|---|---|
| `2026-03-14-phase-0-baseline-characterization.md` | 0 | Document flows, create tests, plan backfill |
| `2026-03-14-phase-1-schema-expansion.md` | 1 | Add projectId fields to schema |
| `2026-03-14-phase-2-write-cutover.md` | 2 | Make writes create assets with projectId |
| `2026-03-14-phase-3-6-backfill-reads-hardening.md` | 3-6 | Migrate data, cutover reads, finalize |

---

## Execution Checklist

### Before Starting Any Phase

- [ ] All code is committed to feature branch
- [ ] No uncommitted changes in working directory
- [ ] `npm run lint` passes
- [ ] `npm run test` passes (or acceptable baseline)
- [ ] `npm run build` succeeds

### Phase 0: Baseline Characterization

**Goal:** Freeze current behavior, document flows, create baseline tests.

**Deliverables:**
- [ ] Flow documentation (Meta Ads, WhatsApp, CAPI, enrichment)
- [ ] Data ownership pattern analysis
- [ ] Baseline characterization tests
- [ ] Manual smoke test checklists
- [ ] Backfill strategy document

**Exit Criteria:**
- [ ] All documentation is clear and reviewed
- [ ] Team understands current flows
- [ ] Smoke checklists are reproducible
- [ ] Ready to modify schema

**Estimated Time:** 2-3 hours (documentation focused)

---

### Phase 1: Schema Expansion

**Goal:** Add nullable `projectId` fields without breaking existing behavior.

**Deliverables:**
- [ ] Prisma schema updated with projectId fields
- [ ] All migrations applied
- [ ] Service types support optional projectId
- [ ] All tests pass
- [ ] Smoke checks show no regressions

**Exit Criteria:**
- [ ] All target models have projectId (nullable)
- [ ] All indexes created for future queries
- [ ] Foreign keys with `onDelete: Restrict` established
- [ ] All tests pass
- [ ] Smoke checks pass
- [ ] Build succeeds

**Estimated Time:** 1-2 hours

---

### Phase 2: Write Path Cutover (Meta Ads & WhatsApp)

**Goal:** Ensure all NEW assets are created with `projectId`.

**Deliverables:**
- [ ] Meta Ads OAuth state includes projectId
- [ ] Meta Ads callback creates connection with projectId
- [ ] WhatsApp onboarding includes projectId
- [ ] WhatsApp callback creates connection/config with projectId
- [ ] Require project context to initiate connection
- [ ] Tests verify projectId is persisted
- [ ] Smoke checks pass

**Exit Criteria:**
- [ ] All NEW connections have projectId
- [ ] All NEW accounts have projectId
- [ ] Reads still use organizationId (no cutover yet)
- [ ] Tests pass
- [ ] Smoke checks pass

**Estimated Time:** 2-3 hours

---

### Phase 3: Backfill Legacy Data

**Goal:** Migrate existing assets to project ownership.

**Deliverables:**
- [ ] Auto-backfill script for single-project orgs
- [ ] Manual mapping guide for multi-project orgs
- [ ] Validation script to verify backfill
- [ ] All assets have projectId set

**Exit Criteria:**
- [ ] All single-project orgs auto-backfilled
- [ ] All multi-project orgs manually mapped
- [ ] Validation shows 0 NULL projectId values
- [ ] Ready for Phase 4 read cutover

**Estimated Time:** 1-2 hours (mostly manual mapping for complex orgs)

---

### Phase 4: Read Path Cutover

**Goal:** Switch all reads to project-scoped queries.

**Deliverables:**
- [ ] Meta Ads services read by projectId
- [ ] WhatsApp services read by projectId
- [ ] CAPI resolves pixels by project
- [ ] Ad enrichment resolves connection by project
- [ ] API routes require projectId context
- [ ] Tests verify project isolation
- [ ] Smoke checks pass

**Exit Criteria:**
- [ ] All reads use projectId
- [ ] 404 if asset not in project
- [ ] Cross-project data is isolated
- [ ] Tests pass
- [ ] Smoke checks pass

**Estimated Time:** 2-3 hours

---

### Phase 5: Delete Hardening

**Goal:** Protect project deletion to prevent orphaned data.

**Deliverables:**
- [ ] Project delete service checks for owned assets
- [ ] Archive service for non-delete workflows
- [ ] API routes return 409 if assets exist
- [ ] Tests verify guard behavior
- [ ] Smoke checks pass

**Exit Criteria:**
- [ ] Delete blocked with clear error if assets exist
- [ ] Archive works as alternative
- [ ] Tests pass
- [ ] Smoke checks pass

**Estimated Time:** 1 hour

---

### Phase 6: Schema Hardening

**Goal:** Enforce NOT NULL constraints and finalize ownership model.

**Deliverables:**
- [ ] All projectId fields are NOT NULL
- [ ] Unique constraints finalized
- [ ] Obsolete org-scoped constraints removed
- [ ] All tests pass
- [ ] Build succeeds

**Exit Criteria:**
- [ ] All projectId fields NOT NULL
- [ ] All migrations applied
- [ ] Schema validates
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Program complete

**Estimated Time:** 1 hour

---

## Rollback Strategy

If a phase breaks something critical:

1. **Identify the breaking change**
2. **Revert to last good commit**
   ```bash
   git log --oneline
   git revert <commit-hash>
   ```
3. **Document what failed**
4. **Adjust plan and retry**
5. **Never force-push to main** (use new commits)

---

## Testing Between Phases

After each phase, run:

```bash
# Code quality
npm run lint

# Unit and integration tests
npm run test -- --run

# Build validation
npm run build

# Manual smoke checks
# (Use checklists from Phase 0 documentation)
```

**Critical:** If any of these fail, do NOT proceed to the next phase.

---

## Communication

**For each phase completion:**

1. Post completion status to team
2. Include test/build results
3. Link to smoke check results
4. Confirm ready for next phase

**Before proceeding to next phase:**

1. Get team approval
2. Verify no blockers
3. Confirm main branch is clean

---

## Timeline Estimate

| Phase | Duration | Cumulative |
|---|---|---|
| Phase 0 | 2-3 hours | 2-3 hours |
| Phase 1 | 1-2 hours | 3-5 hours |
| Phase 2 | 2-3 hours | 5-8 hours |
| Phase 3 | 1-2 hours | 6-10 hours |
| Phase 4 | 2-3 hours | 8-13 hours |
| Phase 5 | 1 hour | 9-14 hours |
| Phase 6 | 1 hour | 10-15 hours |

**Total:** ~10-15 hours of focused work spread across multiple sessions.

---

## Success Criteria (Program Complete)

- ✅ All 6 phases complete
- ✅ All tests pass
- ✅ Build succeeds
- ✅ Schema enforces project ownership
- ✅ No org-scoped fallback possible
- ✅ CAPI/enrichment use project context
- ✅ Delete requires empty project
- ✅ Ready for PRD 30 (Billing) integration

---

## Next Steps

After PRD 32 completion:

1. **Merge feature branch to main**
   ```bash
   git checkout main
   git pull origin main
   git merge feature/2026-03-14-project-ownership-execution
   git push origin main
   ```

2. **Begin PRD 30** (Billing by project, AI allowance/overage)
   - Depends on PRD 32 being complete
   - Can use same phased approach

3. **Optional: PRD 31** (Next.js skill adoption)
   - Can run in parallel with PRD 30
   - Independent of PRD 32

---

## References

- [PRD 29: Project Strict Ownership for Integrations](./29_PRD_PROJECT_STRICT_OWNERSHIP_FOR_INTEGRATIONS.md)
- [PRD 30: Billing by Project](./30_PRD_BILLING_PROJECT_PROVISIONING_AND_AI_ALLOWANCE.md)
- [PRD 31: Safe Adoption of Next.js Skill](./31_PRD_SAFE_ADOPTION_OF_NEXTJS_SKILL.md)
- [PRD 32: Execution Phases](./32_PRD_PROJECT_STRICT_OWNERSHIP_EXECUTION_PHASES.md)

---

**Last Updated:** 2026-03-14
**Status:** Ready for Phase 0 execution
**Branch:** `feature/2026-03-14-project-ownership-execution`
