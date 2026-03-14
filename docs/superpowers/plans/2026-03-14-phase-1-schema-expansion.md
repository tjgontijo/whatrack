# PRD 32 Phase 1: Schema Expansion Without Cutover

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `projectId` fields to all target models without breaking existing reads or writes. Preserve compatibility while preparing schema for ownership cutover in Phase 2.

**Architecture:** Add optional `projectId` columns, create new indexes, add foreign key relations. Keep all business logic reading from organizationId for now. No cutover of reads yet.

**Tech Stack:** Prisma 7, PostgreSQL migrations, schema validation.

---

## Chunk 1: Schema Changes

### Task 1.1: Add projectId to MetaConnection

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>-add-project-id-to-meta-connection/migration.sql`

**What to do:**

Update schema for MetaConnection:

```prisma
// prisma/schema.prisma - MetaConnection model

model MetaConnection {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  projectId      String?  @db.Uuid  // NEW: nullable for migration compatibility

  fbUserId       String
  fbUserName     String
  accessToken    String
  tokenExpiresAt DateTime

  status         String   @default("ACTIVE")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  project        Project?       @relation(fields: [projectId], references: [id], onDelete: Restrict)  // NEW
  adAccounts     MetaAdAccount[]

  @@unique([projectId, fbUserId])  // NEW: unique per project (once projectId is NOT NULL)
  @@unique([organizationId, fbUserId])  // KEEP: for migration compatibility
  @@index([organizationId, projectId])  // NEW: for filtering by both
}
```

Create migration:

```sql
-- prisma/migrations/<timestamp>-add-project-id-to-meta-connection/migration.sql

ALTER TABLE "MetaConnection" ADD COLUMN "projectId" UUID;

-- Create index for future project-scoped queries
CREATE INDEX "MetaConnection_projectId_idx" ON "MetaConnection"("projectId");

-- Create index for combined org + project queries
CREATE INDEX "MetaConnection_organizationId_projectId_idx" ON "MetaConnection"("organizationId", "projectId");

-- Add foreign key relation (nullable for now)
ALTER TABLE "MetaConnection" ADD CONSTRAINT "MetaConnection_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT;
```

- [ ] **Step 1: Update Prisma schema**

Edit `prisma/schema.prisma` and add `projectId` field to MetaConnection as shown above.

- [ ] **Step 2: Generate migration**

```bash
npx prisma migrate dev --name add_projectId_to_meta_connection
```

Expected: Migration file is created in `prisma/migrations/`.

- [ ] **Step 3: Verify schema compiles**

```bash
npx prisma validate
```

Expected: No schema validation errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "schema: add optional projectId to MetaConnection (Phase 1)

- Add nullable projectId field
- Create indexes for project-scoped filtering
- Add foreign key to Project with onDelete: Restrict
- Preserve existing unique constraint on [organizationId, fbUserId]
- New unique constraint on [projectId, fbUserId] (for Phase 2)

Migration: add_projectId_to_meta_connection
"
```

**Verification:**
- Migration file created
- Schema validates without errors
- Database can apply migration without errors

---

### Task 1.2: Add projectId to MetaPixel

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>-add-project-id-to-meta-pixel/migration.sql`

**What to do:**

Update schema for MetaPixel:

```prisma
model MetaPixel {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  projectId      String?  @db.Uuid  // NEW

  name           String?
  pixelId        String
  capiToken      String
  isActive       Boolean  @default(true)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  project        Project?     @relation(fields: [projectId], references: [id], onDelete: Restrict)  // NEW

  @@unique([organizationId, pixelId])  // KEEP
  @@unique([projectId, pixelId])  // NEW: for Phase 2
  @@index([projectId])  // NEW
  @@index([organizationId, projectId])  // NEW
}
```

Create migration:

```sql
ALTER TABLE "MetaPixel" ADD COLUMN "projectId" UUID;

CREATE INDEX "MetaPixel_projectId_idx" ON "MetaPixel"("projectId");
CREATE INDEX "MetaPixel_organizationId_projectId_idx" ON "MetaPixel"("organizationId", "projectId");

ALTER TABLE "MetaPixel" ADD CONSTRAINT "MetaPixel_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT;
```

- [ ] **Step 1: Update Prisma schema**

Edit `prisma/schema.prisma` and add `projectId` field to MetaPixel.

- [ ] **Step 2: Generate migration**

```bash
npx prisma migrate dev --name add_projectId_to_meta_pixel
```

- [ ] **Step 3: Verify schema**

```bash
npx prisma validate
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "schema: add optional projectId to MetaPixel (Phase 1)"
```

**Verification:**
- Migration created and applied
- Schema validates

---

### Task 1.3: Add projectId to MetaAdAccount

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration

**What to do:**

Update schema for MetaAdAccount:

```prisma
model MetaAdAccount {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  projectId      String?  @db.Uuid  // NEW
  connectionId   String   @db.Uuid

  adAccountId    String
  adAccountName  String
  isActive       Boolean  @default(false)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  project        Project?       @relation(fields: [projectId], references: [id], onDelete: Restrict)  // NEW
  connection     MetaConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)

  @@unique([organizationId, adAccountId])  // KEEP
  @@unique([projectId, adAccountId])  // NEW: for Phase 2
  @@index([projectId])  // NEW
  @@index([organizationId, projectId])  // NEW
}
```

Create migration and apply.

- [ ] **Step 1: Update schema**
- [ ] **Step 2: Generate migration**
- [ ] **Step 3: Verify**
- [ ] **Step 4: Commit**

**Verification:**
- Migration created
- Schema validates

---

### Task 1.4: Add projectId to WhatsAppConnection

**Files:**
- Modify: `prisma/schema.prisma`

**What to do:**

Update schema for WhatsAppConnection:

```prisma
model WhatsAppConnection {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId    String   @db.Uuid
  projectId         String?  @db.Uuid  // NEW

  wabaId            String
  ownerBusinessId   String?
  phoneNumberId     String?
  status            String   @default("pending")
  connectedAt       DateTime?
  disconnectedAt    DateTime?
  lastWebhookAt     DateTime?
  lastHealthCheckAt DateTime?
  healthStatus      String   @default("unknown")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization      Organization       @relation("WhatsAppConnections", fields: [organizationId], references: [id], onDelete: Cascade)
  project           Project?           @relation(fields: [projectId], references: [id], onDelete: Restrict)  // NEW
  configs           WhatsAppConfig[]

  @@unique([organizationId, wabaId])  // KEEP
  @@unique([projectId, wabaId])  // NEW: for Phase 2
  @@index([projectId])  // NEW
  @@index([organizationId, projectId])  // NEW
}
```

- [ ] **Step 1-4: Create and commit migration**

**Verification:**
- Schema validates

---

### Task 1.5: Add projectId to WhatsAppConfig

**Files:**
- Modify: `prisma/schema.prisma`

**What to do:**

Update schema for WhatsAppConfig:

```prisma
model WhatsAppConfig {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  projectId      String?  @db.Uuid  // NEW
  connectionId   String?  @db.Uuid

  phoneNumberId  String?
  // ... other fields

  organization   Organization        @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  project        Project?            @relation(fields: [projectId], references: [id], onDelete: Restrict)  // NEW
  connection     WhatsAppConnection? @relation(fields: [connectionId], references: [id], onDelete: Cascade)

  @@index([projectId])  // NEW
  @@index([organizationId, projectId])  // NEW
}
```

- [ ] **Step 1-4: Create and commit migration**

**Verification:**
- Schema validates

---

### Task 1.6: Add projectId to WhatsAppOnboarding

**Files:**
- Modify: `prisma/schema.prisma`

**What to do:**

Update schema for WhatsAppOnboarding:

```prisma
model WhatsAppOnboarding {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId    String   @db.Uuid
  projectId         String?  @db.Uuid  // NEW

  trackingCode      String   @unique
  authorizationCode String?
  status            String   @default("pending")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization      Organization @relation("WhatsAppOnboardings", fields: [organizationId], references: [id], onDelete: Cascade)
  project           Project?     @relation(fields: [projectId], references: [id], onDelete: Cascade)  // NEW

  @@index([projectId])  // NEW
  @@index([organizationId, projectId])  // NEW
}
```

- [ ] **Step 1-4: Create and commit migration**

**Verification:**
- Schema validates

---

### Task 1.7: Add projectId to MetaConversionEvent

**Files:**
- Modify: `prisma/schema.prisma`

**What to do:**

Update schema for MetaConversionEvent:

```prisma
model MetaConversionEvent {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  projectId      String?  @db.Uuid  // NEW
  ticketId       String   @db.Uuid

  // ... other fields

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  project        Project?     @relation(fields: [projectId], references: [id], onDelete: Restrict)  // NEW
  ticket         Ticket       @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([projectId])  // NEW
  @@index([organizationId, projectId])  // NEW
}
```

- [ ] **Step 1-4: Create and commit migration**

**Verification:**
- Schema validates

---

### Task 1.8: Update Project Model Relations

**Files:**
- Modify: `prisma/schema.prisma`

**What to do:**

Add all new relations to Project model:

```prisma
model Project {
  // ... existing fields

  metaConnections       MetaConnection[]
  metaAdAccounts        MetaAdAccount[]
  metaPixels            MetaPixel[]
  whatsAppConnections   WhatsAppConnection[]
  whatsappConfigs       WhatsAppConfig[]
  whatsappOnboardings   WhatsAppOnboarding[]
  metaConversionEvents  MetaConversionEvent[]

  // ... existing relations
}
```

- [ ] **Step 1: Update schema**
- [ ] **Step 2: Verify (no migration needed, schema-only)**

```bash
npx prisma validate
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "schema: add Project relations for all integration models (Phase 1)"
```

**Verification:**
- Schema validates

---

## Chunk 2: Services and Types

### Task 1.9: Update Service Types to Support Optional projectId

**Files:**
- Modify: `src/services/meta-ads/meta-connection.service.ts`
- Modify: `src/services/meta-ads/meta-pixel.service.ts`
- Modify: `src/services/meta-ads/ad-account.service.ts`
- Modify: `src/services/whatsapp/whatsapp-config.service.ts`

**What to do:**

Update service signatures to accept optional `projectId` but continue using `organizationId` for actual queries. This prepares services for Phase 2 cutover.

Example for MetaConnection service:

```typescript
// src/services/meta-ads/meta-connection.service.ts

type CreateMetaConnectionInput = {
  organizationId: string;
  projectId?: string;  // NEW: optional for Phase 1
  fbUserId: string;
  fbUserName: string;
  accessToken: string;
  tokenExpiresAt: Date;
};

export async function createMetaConnection(
  input: CreateMetaConnectionInput
): Promise<MetaConnection> {
  // Create connection with both organizationId and projectId (when provided)
  return prisma.metaConnection.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId,  // Will be null for Phase 1
      fbUserId: input.fbUserId,
      fbUserName: input.fbUserName,
      accessToken: input.accessToken,
      tokenExpiresAt: input.tokenExpiresAt,
    },
  });
}

type ListMetaConnectionsInput = {
  organizationId: string;
  projectId?: string;  // NEW: optional filter for Phase 2 prep
};

export async function listMetaConnections(
  input: ListMetaConnectionsInput
): Promise<MetaConnection[]> {
  // Phase 1: Still query by organizationId only
  // Phase 2: Will switch to query by projectId
  return prisma.metaConnection.findMany({
    where: {
      organizationId: input.organizationId,
      // projectId is optional for now, not used in Phase 1 queries
    },
  });
}
```

- [ ] **Step 1: Update MetaConnection service types**
  - Add `projectId?: string` to create input
  - Add `projectId?: string` to list input
  - Update implementation to pass projectId to create (will be null in Phase 1)
  - Keep reads using organizationId only

- [ ] **Step 2: Update MetaPixel service types**
  - Same pattern

- [ ] **Step 3: Update MetaAdAccount service types**
  - Same pattern

- [ ] **Step 4: Update WhatsAppConfig service types**
  - Same pattern

- [ ] **Step 5: Run tests**

```bash
npm run test -- src/services --run
```

Expected: All tests still pass (behavior unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/services/
git commit -m "feat: add optional projectId support to service signatures (Phase 1)

- MetaConnectionService: accept projectId in create, prepare for Phase 2 reads
- MetaPixelService: accept projectId in create
- MetaAdAccountService: accept projectId in create
- WhatsAppConfigService: accept projectId in create
- All reads still use organizationId (no cutover yet)

Backward compatible: projectId is optional, defaults to null
"
```

**Verification:**
- Tests pass
- No behavior change yet

---

### Task 1.10: Run Full Test Suite

**Files:**
- Reference: All modified files

**What to do:**

Run comprehensive tests to verify Phase 1 changes don't break existing functionality.

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: No new errors.

- [ ] **Step 2: Run tests**

```bash
npm run test -- --run
```

Expected: All tests pass (or same failures as before Phase 1).

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Verify schema is clean**

```bash
npx prisma validate
npx prisma generate
```

Expected: No errors.

- [ ] **Step 5: Run smoke checklist from Phase 0**

Using the checklist from `docs/PRD/32_SMOKE_CHECKLIST_META_ADS.md`:
- [ ] Connect a Meta Ads account
- [ ] Verify connection is created with `projectId = NULL`
- [ ] Verify functionality is unchanged

Using the checklist from `docs/PRD/32_SMOKE_CHECKLIST_WHATSAPP.md`:
- [ ] Connect a WhatsApp account
- [ ] Verify connection is created with `projectId = NULL`
- [ ] Verify functionality is unchanged

**Verification:**
- All tests pass
- Build succeeds
- Smoke checks pass
- No regressions

---

## Chunk 3: Phase 1 Completion

### Task 1.11: Verify Phase 1 Completion

**Files:**
- Reference: All Phase 1 changes

**What to do:**

Create and verify Phase 1 completion checklist:

```markdown
# Phase 1 Completion Checklist

## Schema Changes
- [ ] MetaConnection: projectId nullable + indexes ✓
- [ ] MetaPixel: projectId nullable + indexes ✓
- [ ] MetaAdAccount: projectId nullable + indexes ✓
- [ ] WhatsAppConnection: projectId nullable + indexes ✓
- [ ] WhatsAppConfig: projectId nullable + indexes ✓
- [ ] WhatsAppOnboarding: projectId nullable + indexes ✓
- [ ] MetaConversionEvent: projectId nullable + indexes ✓
- [ ] Project model: relations added ✓

## Service Updates
- [ ] MetaConnectionService: accept optional projectId ✓
- [ ] MetaPixelService: accept optional projectId ✓
- [ ] MetaAdAccountService: accept optional projectId ✓
- [ ] WhatsAppConfigService: accept optional projectId ✓

## Testing
- [ ] All tests pass ✓
- [ ] Build succeeds ✓
- [ ] Lint passes ✓
- [ ] Schema validates ✓
- [ ] Smoke checks pass (no regressions) ✓

## Backward Compatibility
- [ ] All existing reads still use organizationId ✓
- [ ] No cutover of behavior yet ✓
- [ ] projectId fields are nullable ✓
- [ ] Unique constraints preserve current keys ✓

## Ready for Phase 2
- [ ] Schema is migration-safe
- [ ] Services accept projectId but don't require it
- [ ] Tests validate Phase 1 doesn't break Phase 0 behavior
- [ ] Code is clean and committed
```

- [ ] **Step 1: Verify all changes**

Manually review:
- All migrations applied successfully
- Schema matches intended state
- All services compile
- All tests pass

- [ ] **Step 2: Create Phase 1 completion commit**

```bash
git add -A
git commit -m "build(phase-1): schema expansion complete

Add optional projectId to all integration models:
- MetaConnection, MetaPixel, MetaAdAccount
- WhatsAppConnection, WhatsAppConfig, WhatsAppOnboarding
- MetaConversionEvent

Add service layer support:
- All create operations accept optional projectId
- All reads continue using organizationId (no cutover yet)
- Backward compatible: projectId is nullable

Testing:
- All tests pass
- Build succeeds
- Smoke checks show no regressions

Ready for Phase 2: Write Path Cutover
"
```

**Verification:**
- Completion checklist passes
- All work is committed

---

## Phase 1 Exit Criteria

Phase 1 is complete when:

1. ✅ All target models have nullable `projectId` fields
2. ✅ All models have proper indexes for project-scoped filtering
3. ✅ Foreign key relations are established with `onDelete: Restrict`
4. ✅ Service layer accepts optional `projectId` in create operations
5. ✅ All reads still use `organizationId` (cutover deferred to Phase 2)
6. ✅ All tests pass without regression
7. ✅ Build succeeds
8. ✅ Smoke checks show no functional changes
9. ✅ All work is committed

**Next Phase: Phase 2 — Write Path Cutover**

Phase 2 will:
- Start setting `projectId` in Meta Ads OAuth state
- Start setting `projectId` in WhatsApp onboarding session
- Create assets with explicit `projectId` from callback
- Still read assets using `organizationId` (read cutover is Phase 4)
