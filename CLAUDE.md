# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server

# Build
npm run build        # prisma generate + next build

# Linting & Formatting
npm run lint         # ESLint
npm run format       # Prettier write
npm run format:check # Prettier check

# Testing
npm run test             # Vitest (watch mode)
npm run test:ui          # Vitest with UI
npm run test:coverage    # Vitest with coverage
npm run test:prisma      # Prisma integration tests (vitest.prisma.config.ts)

# Database
npx prisma generate          # Generate Prisma client
npx prisma migrate dev       # Run migrations
npx prisma migrate deploy    # Apply migrations in production
npx tsx prisma/seed.ts       # Seed database
```

To run a single test file: `npx vitest src/path/to/file.test.ts`

## Architecture Overview

**WhaTrack** is a WhatsApp CRM SaaS built with Next.js 16 (App Router), React 19, Prisma 7, PostgreSQL (Neon), Better Auth, Redis, and Centrifugo for real-time WebSocket communication.

### Path Aliases

- `@/*` → `src/*`
- `@prisma/*` → `prisma/generated/prisma/*`

### Routing Structure

```
src/app/
├── (auth)/            # Public auth pages (sign-in, sign-up, onboarding, etc.)
├── dashboard/         # Protected app pages
│   ├── layout.tsx     # Dashboard shell with sidebar
│   ├── tickets/       # Kanban-style ticket pipeline
│   ├── products/
│   ├── sales/
│   ├── leads/
│   ├── whatsapp/
│   └── settings/
├── api/v1/            # All REST API routes
│   ├── auth/[...all]/ # Better Auth catch-all
│   ├── whatsapp/      # WhatsApp + Meta Cloud API
│   ├── tickets/
│   ├── jobs/          # Cron job endpoints
│   └── ...
└── page.tsx           # Landing page
```

### Authentication & RBAC

- **Provider:** Better Auth v1 (`src/lib/auth/auth.ts`)
- **Base path:** `/api/v1/auth`
- **Client hooks:** `src/lib/auth/auth-client.ts` — exports `useSession`, `signOut`, `changePassword`
- **Roles:** `owner > admin > user` (weight-based hierarchy in `src/lib/auth/roles.ts`)
- **Permissions:** `system:manage`, `system:read_logs`, `org:manage`, `org:whatsapp:manage`, `org:leads:manage`, `org:sales:manage`, `org:members:manage`

**API route pattern** — always compose guards from `src/lib/auth/guards.ts`:
```ts
const user = await requireAuth(request)          // 401 if unauthenticated
const user = await requireOrganization(request)  // also checks activeOrganizationId
const user = await requirePermission(request, 'org:whatsapp:manage')
const user = await requireSuperAdmin(request)    // owner only

if (user instanceof NextResponse) return user    // guard returned an error response
```

### Database

- **ORM:** Prisma 7 with `@prisma/adapter-pg` (PostgreSQL / Neon)
- **Schema:** `prisma/schema.prisma`
- **Key model groups:** Users/Sessions/Auth, Organizations/Members, WhatsApp (Config, Connection, Health, AuditLog, WebhookLog), Conversations/Messages/Leads, Sales/Products, Tickets/TicketStages

### Services Layer

Business logic lives in `src/services/` — keep API route handlers thin and delegate to services:

- `src/services/whatsapp/` — Meta Cloud API client, webhook processor, event handlers (message, status, history, state-sync, onboarding)
- `src/services/tickets/`, `sales/`, `products/`, `leads/`
- `src/services/mail/` — Resend email with templates
- `src/services/dashboard/` — Analytics aggregation

### Infrastructure Utilities

| File | Purpose |
|------|---------|
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/lib/redis.ts` | ioredis singleton with no-op fallback if `REDIS_URL` missing |
| `src/lib/encryption.ts` | AES-256-GCM encryption for WhatsApp tokens |
| `src/lib/queue.ts` | Serverless-friendly job scheduler using Redis distributed locks |
| `src/lib/rate-limit.ts` | Three-tier rate limiting (IP / Org / Burst) backed by Redis |
| `src/lib/middleware/rate-limit.middleware.ts` | Middleware wrapper with endpoint presets |
| `src/lib/centrifugo/` | WebSocket real-time channel helpers |

### CRUD Component System

Reusable data management components live in `src/components/dashboard/crud/`:

- **`CrudPageShell`** — Main page wrapper with header, toolbar, search, view switcher, mobile FAB
- **`CrudDataView`** — Routes to list/card/kanban based on `ViewType`
- **`CrudListView`** — Desktop table with `ColumnDef<T>`
- **`CrudCardView`** — Grid with `CardConfig<T>`
- **`CrudKanbanView`** — Drag-and-drop Kanban with `KanbanColumn[]` (dnd-kit)
- **`CrudEditDrawer`** — Slide-in edit drawer
- **`DeleteConfirmDialog`** — Deletion confirmation
- **View types:** `'list' | 'cards' | 'kanban'` — mobile auto-switches to `cards`

### Real-time (Centrifugo)

WebSocket integration via Centrifugo. Server URL: `CENTRIFUGO_URL`. Client connects to `NEXT_PUBLIC_CENTRIFUGO_URL` (WSS). Auth tokens use HMAC (`CENTRIFUGO_TOKEN_HMAC_SECRET_KEY`). Centrifugo token endpoint: `/api/v1/centrifugo/token`.

### Background Jobs

Cron jobs call API endpoints — serverless-compatible, no child processes:
- `/api/v1/jobs/whatsapp-health-check` — protected by `CRON_SECRET` header
- `/api/v1/jobs/webhook-retry`
- Redis distributed locking prevents duplicate execution

### i18n

`src/lib/i18n/` — locale messages and React provider. UI strings are in Portuguese (pt-BR).

### Key Environment Variables

```
DATABASE_URL              # Neon PostgreSQL
BETTER_AUTH_SECRET        # Auth signing secret
BETTER_AUTH_URL           # App base URL
TOKEN_ENCRYPTION_KEY      # 64-char hex for AES-256-GCM
REDIS_URL                 # Redis connection
CENTRIFUGO_URL            # Centrifugo server
CENTRIFUGO_API_KEY
CENTRIFUGO_TOKEN_HMAC_SECRET_KEY
NEXT_PUBLIC_CENTRIFUGO_URL
META_APP_SECRET           # WhatsApp / Meta Cloud API
META_WEBHOOK_VERIFY_TOKEN
META_ACCESS_TOKEN
OWNER_EMAIL               # Auto-assigns owner role on signup
CRON_SECRET               # Secures cron job endpoints
```
