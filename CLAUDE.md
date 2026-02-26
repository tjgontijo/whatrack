# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a greenfield Next.js 16 application using:
- **Framework**: Next.js 16 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: better-auth
- **Testing**: Vitest
- **AI**: Mastra Core, Groq, OpenAI SDK
- **Real-time**: Centrifugo + Redis
- **UI**: React 19, Tailwind CSS 4, Radix UI, shadcn/ui

## Essential Commands

```bash
# Development
npm run dev                    # Start dev server

# Build & Production
npm run build                  # Build (runs prisma generate first)
npm start                      # Start production server

# Code Quality
npm run lint                   # Run ESLint
npm run format                 # Format code with Prettier
npm run format:check           # Check formatting

# Testing
npm run test                   # Run tests
npm run test:ui                # Run tests with UI
npm run test:coverage          # Run tests with coverage
npm run test:prisma            # Run Prisma-related tests

# Database
npx prisma generate            # Generate Prisma client
npx prisma db push             # Push schema to database
npx tsx prisma/seed.ts         # Seed database
```

## Architecture

### Domain-Driven Structure (Critical)

**ALL domain code follows the pattern**: `src/<layer>/<domain>/...`

This applies to:
- `src/app/api/v1/<domain>/`
- `src/services/<domain>/`
- `src/server/<domain>/`
- `src/schemas/<domain>/`
- `src/hooks/<domain>/`
- `src/types/<domain>/`
- `src/components/dashboard/<domain>/`

**NEVER create flat domain files in layer roots** (e.g., `src/services/foo.service.ts` is forbidden).

### Layer Responsibilities

#### `src/app/api/v1/`
Route handlers: authenticate → validate → delegate → respond. **Keep handlers ~30-50 lines**.

**NEVER put in routes:**
- Zod schemas (use `src/schemas/`)
- Prisma queries (use `src/services/`)
- Business logic (use `src/services/`)
- Helper functions (use `src/lib/`)
- Cache logic (use `src/services/`)

#### `src/services/<domain>/`
Business logic, Prisma queries, external API integrations, cache (when needed).

**Files:**
- `[resource].service.ts` - CRUD and business rules
- `[resource].scheduler.ts` - Scheduled jobs
- `handlers/[type].handler.ts` - Event/webhook handlers

#### `src/server/<domain>/`
Server utilities without state: auth, authorization, session access, RBAC.

**Key difference from services:**
- `src/server/` → Who can do this and how? (auth, session, RBAC, membership)
- `src/services/` → What does the system do? (business rules, queries, cache)

#### `src/schemas/<domain>/`
**ONLY location for Zod schemas**. All input/output validation schemas go here.

File pattern: `[resource]-schemas.ts`

#### `src/lib/`
Pure utilities without domain dependencies:
- `auth/` - Auth client, guards, role definitions
- `db/` - Database instances, cache, queues, cache-keys
- `date/` - Date utilities
- `utils/` - Generic utilities
- `constants/` - Shared constants

#### `src/components/`
- `ui/` - Design system base components (shadcn/ui)
- `dashboard/<domain>/` - Dashboard feature components (kebab-case)
- `data-table/` - Generic table, filter, pagination
- `landing/` - Landing page components (PascalCase)
- `shared/` - Shared utilities

**NEVER create** `src/components/<domain>/` for dashboard domains. Use `src/components/dashboard/<domain>/` instead.

### Framework Conventions

#### Request Interception
- **Use `src/proxy.ts`** for request interception
- **NEVER create `src/middleware.ts`** in this project
- If "middleware" is mentioned, interpret as changes to `src/proxy.ts`

#### React Rules (Critical)
- **FORBIDDEN**: `useEffect` or `useLayoutEffect` in `src/`
- Don't use effects for data fetching, derived state sync, or flow orchestration
- Use Server Components, Server Actions, derived props, explicit event handlers

### Path Aliases

```typescript
"@/*" → "./src/*"
"@prisma/*" → "./prisma/generated/prisma/*"
```

## Key Rules

### Anti-Legacy Policy (Non-negotiable)
- This is a greenfield project: **NO legacy compatibility**
- **FORBIDDEN**: aliases/fallbacks for old contracts in `src/`
- On structural changes, delivery only accepted with **no active legacy compatibility** in `src/`

### Cross-Domain Sharing
- **FORBIDDEN**: wrappers/aliases between domains just to reuse logic
- When logic is common to 2+ domains:
  - Extract to neutral module in `src/lib/` (pure utility)
  - Or `src/services/shared/` (business rule)
- Consumers depend on neutral module directly

### Code Hygiene
- **Delivery blocked** if obsolete files remain after refactor
- **Delivery blocked** if empty directories remain after moving/removing files
- Verify before delivery:
  - Old references removed in affected paths
  - Empty directories removed via `find src -type d -empty`

### Testing Requirements (Mandatory)
- **Every task that changes behavior MUST create or update at least one test**
- **Run the test before delivery**
- Validation proportional to risk:
  - Small change: targeted tests
  - Medium change: `npm run lint` + targeted tests
  - Large/structural change: `npm run lint` + `npm run test` + `npm run build`
  - Prisma impact: add `npm run test:prisma`

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Route handler | `route.ts` | `src/app/api/v1/leads/route.ts` |
| Service | `[resource].service.ts` | `src/services/leads/lead.service.ts` |
| Scheduler | `[resource].scheduler.ts` | `src/services/ai/ai.scheduler.ts` |
| Handler | `[type].handler.ts` | `src/services/whatsapp/handlers/message.handler.ts` |
| Zod schema | `[resource]-schemas.ts` | `src/schemas/tickets/ticket-schemas.ts` |
| React hook | `use-[resource].ts` | `src/hooks/organizations/use-organization.ts` |
| Dashboard component | `kebab-case.tsx` | `client-leads-table.tsx` |
| Landing component | `PascalCase.tsx` | `LandingHero.tsx` |
| Pure utility | `[function].ts` | `src/lib/date/date-range.ts` |
| TypeScript type | `[resource].ts` | `src/types/tickets/ticket.ts` |

## Database

- **ORM**: Prisma with PostgreSQL
- **Client location**: `./prisma/generated/prisma`
- **Schema**: `./prisma/schema.prisma`
- Queries **ONLY** in `src/services/` or `src/server/`
- Use `$transaction` for atomic operations
- Prefer `select` over `include` to limit returned fields

## Special Notes

- **No OpenAPI/Swagger**: This Next.js API will migrate to Fastify (monorepo future). Zod schemas will be reused.
- **TypeScript strict**: No `any` in services and critical domain functions
- **Cache**: Default is no manual cache. If needed, implement in service with explicit TTL and invalidation
- **Authorization**: Use guards from `src/server/auth/` - never replicate access logic inline

## Decision Tree: Where to Put New Code?

```
Pure function without DB access?        → src/lib/[category]/
Business logic or Prisma query?         → src/services/[domain]/
Server auth or authorization?           → src/server/[domain]/
Any Zod schema?                         → src/schemas/[domain]/[resource]-schemas.ts
Pure TypeScript type (no Zod)?          → src/types/[domain]/[resource].ts
React hook?                             → src/hooks/[domain]/
React component?                        → src/components/dashboard/[domain]/
```

## Execution Workflow

For tasks in `src/`:

1. Read this file and relevant skill docs if structural changes are involved
2. Map impacted files and plan minimal diff
3. Implement following architecture rules
4. Create or update tests
5. Run tests and validation commands proportional to impact
6. Report: what changed, files altered, commands run, pending risks
