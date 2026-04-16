# Phase 2: Core Features (Weeks 3-4)
**Target: 44 tests | Organizations & Teams**

## Scope

### Organizations Management (32 tests)
- Organization creation & setup
- Member invitation & acceptance
- Role-based access control (RBAC)
- Member removal & deactivation
- Organization settings (name, logo, etc)
- Multi-org switching
- Organization billing & usage

### Projects & Workspace (12 tests)
- Project creation within org
- Project settings
- Project member management
- Project limits based on plan
- Workspace organization

## Test Files to Create

```
e2e/organizations/
├── org-setup.spec.ts (8 tests)
├── org-members.spec.ts (10 tests)
├── org-permissions.spec.ts (8 tests)
└── org-settings.spec.ts (6 tests)

e2e/projects/
├── project-management.spec.ts (8 tests)
└── project-limits.spec.ts (4 tests)
```

## Prerequisites

- Phase 1 infrastructure ✅ (done)
- Authenticated fixtures ✅ (done)
- Helper functions for:
  - Organization creation
  - Member invitation
  - Role assignment
  - Project CRUD operations

## Estimated Time

- ~24 hours (3 days of focused work)
- Can run in parallel with Phase 1 refinements

## Dependencies

- User creation (Phase 1) ✅
- Authentication (Phase 1) ✅
- Billing integration (Phase 1) ✅
