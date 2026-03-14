# PRD 33: Add activeProjectId to Session

## Problem Statement

Currently:
- `activeOrganizationId` is stored in **better-auth session**
- `activeProjectId` is stored in a **separate cookie** (`PROJECT_COOKIE`)

This causes issues:
1. Frontend code fetches project on every page load (WhatsApp hook example)
2. Two different persistence mechanisms (inconsistent)
3. Project selection endpoint exists (`PATCH /api/v1/projects/current`) but uses cookies
4. Frontend can't easily access projectId without `useProject()` hook

**Current flow:**
```
User selects project → PATCH /api/v1/projects/current
  → Sets PROJECT_COOKIE
  → router.refresh()
  → Cookie is read on next page load
```

**Desired flow (aligned with org pattern):**
```
User selects project → PATCH /api/v1/projects/current
  → Updates session.activeProjectId (in better-auth)
  → router.refresh()
  → useProject() reads from session (no extra fetch needed)
```

## Goals

1. Store `activeProjectId` in better-auth session (similar to `activeOrganizationId`)
2. Provide `useProject()` hook for frontend to access projectId without DB calls
3. Eliminate unnecessary API calls for project information
4. Reduce network chatter and improve performance

## Current State Analysis

**What already exists:**
- ✅ Endpoint: `PATCH /api/v1/projects/current` - Updates project selection
- ✅ Frontend: `SidebarClient` - Calls PATCH and refreshes
- ✅ Cookie: `PROJECT_COOKIE` - Persists selected project
- ✅ Helper: `getCurrentProjectId()` - Reads from cookie

**What's missing:**
- ❌ Session integration - activeProjectId not in better-auth session
- ❌ useProject() hook - Frontend has to call PATCH directly
- ❌ Initial load from session - Must read from cookie instead

---

## Implementation Phases

### Phase 1: Backend - Move projectId from Cookie to Session

**Files to modify:**
- `src/app/api/v1/projects/current/route.ts` - PATCH now updates session instead of cookie
- `src/server/auth/server.ts` - Load activeProjectId from session in getServerSession()
- `src/server/project/get-current-project-id.ts` - Read from session instead of cookie

**What to do:**
1. Keep `PROJECT_COOKIE` as fallback for backward compatibility
2. Update PATCH endpoint to set session.activeProjectId via better-auth
3. Update `getServerSession()` to include activeProjectId from session
4. Update `getCurrentProjectId()` to check session first, then cookie

**Exit criteria:**
- `PATCH /api/v1/projects/current` sets session.activeProjectId
- `getServerSession()` includes `session.activeProjectId`
- `getCurrentProjectId()` reads from session (or cookie as fallback)
- `router.refresh()` correctly updates with new projectId in session

### Phase 2: Frontend - Create useProject() Hook

**Files to create:**
- `src/hooks/project/use-project.ts` - New hook

**What to do:**
```typescript
export function useProject() {
  const { data: session } = useSession()

  const activeProjectId = (session?.session as { activeProjectId?: string })?.activeProjectId

  return {
    data: activeProjectId ? { id: activeProjectId } : null,
    isLoading: !session,
    error: session?.error,
  }
}
```

**Exit criteria:**
- Hook available at `@/hooks/project/use-project`
- Returns same shape as `useOrganization()` for consistency
- No database calls required
- All tests pass

### Phase 3: Frontend - Migrate Code to useProject()

**Files to update:**
- `src/hooks/whatsapp/use-whatsapp-onboarding.ts` - Remove fetch, use `useProject()`
- Any other code that fetches project info unnecessarily

**What to do:**
1. Replace `useState + useEffect` for project fetching with `useProject()` hook
2. Verify all pages still work

**Exit criteria:**
- No unnecessary API calls for project info
- All tests pass
- Build successful
- Smoke test: integrations page loads without extra queries

## Technical Details

### Session Structure (Target)

```typescript
interface Session {
  user: { ... }
  session: {
    id: string
    userId: string
    organizationId: string // Existing
    activeOrganizationId: string // Existing
    activeProjectId: string // NEW
    expiresAt: Date
    createdAt: Date
    updatedAt: Date
  }
}
```

### Flow

1. **Login** → better-auth validates user
2. **getServerSession()** → enriches with activeProjectId before returning
3. **Client receives** → session cookie with activeProjectId
4. **useProject()** → reads from session, no DB call needed
5. **API routes** → get projectId from `resolveProjectScope()` or session

### Backward Compatibility

- All existing code continues to work
- Routes already require projectId validation - no change needed
- New `useProject()` is additive, not replacing anything

## Success Metrics

- Network calls reduced by ~20-30% (eliminates project fetch queries)
- Page load time improved (no unnecessary API round-trips)
- Code simpler (no useState/useEffect for project selection)
- All tests passing (210+)

## Risk Assessment

**Low risk:**
- Session structure change is additive
- No breaking changes to existing APIs
- Gradual migration - can update hooks one-by-one

**What could go wrong:**
- Project deleted after session created → handled by existing project validation in routes
- User switches organizations → next login refresh session with correct project
- Multiple organizations → better-auth handles org switching, we follow

## Timeline

- Phase 1: 45-60 min (update projects/current endpoint + session integration)
- Phase 2: 15-20 min (create useProject hook)
- Phase 3: 20-30 min (migrate WhatsApp hook + other code)
- Testing: 15-20 min
- **Total: ~2-2.5 hours**

## Key Implementation Notes

**Why move from cookie to session:**
- Consistency with how `activeOrganizationId` works
- Faster access (no extra cookie parsing)
- Aligned with better-auth patterns
- Easier for frontend to consume via hook

**Backward compatibility:**
- Keep `PROJECT_COOKIE` as fallback (don't delete)
- New code reads session first, then cookie
- Old code continues to work with cookie
- Gradual migration path

**Session update mechanism:**
- better-auth uses database-backed sessions
- PATCH endpoint updates database via auth.updateSession()
- No extra API calls needed on client (session already in memory)
- router.refresh() picks up new session automatically

## Next Steps

1. Review this plan
2. Decide if worth doing now or defer
3. If approved: Execute Phase 1 → Phase 2 → Phase 3
4. Smoke test all integration flows

---

**Related:**
- PRD 32: Project Ownership Refactor (completed)
- Issue: WhatsApp onboarding requiring projectId (current blocker - temporary workaround in place)
