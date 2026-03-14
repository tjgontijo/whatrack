# PRD 32: Baseline Data Ownership Patterns

**Status:** Phase 0, Task 0.4 - Documentation Complete
**Date:** 2026-03-14
**Scope:** Comprehensive mapping of current data ownership patterns and identification of assets requiring project-scoping

---

## Executive Summary

WhaTrack currently operates with a **mixed ownership model** where critical business assets are scoped at the organization level despite the architecture supporting project-level segmentation. This creates ownership ambiguity in multi-project organizations and prevents true project isolation.

**Key Problem:** When an organization has 2+ projects, it's unclear which project owns assets like Meta Ads accounts, WhatsApp connections, and Meta pixels. This leads to:
- Cross-project visibility of business-critical assets
- Incorrect CAPI conversions sent to shared pixels
- Enrichment using wrong connections
- Data leak risks in multi-tenant scenarios

**Solution:** Migrate 6 models from organization-scoped to project-scoped ownership, with auto-mapping for single-project orgs and manual mapping for multi-project orgs.

---

## Current Ownership Model

### Organization-Level Hierarchy (Root Owner)

```
Organization (root)
├── Project (currently optional)
├── Lead (organizationId + optional projectId)
├── Ticket (organizationId + optional projectId)
├── Sale (organizationId + optional projectId)
├── Conversation (organizationId)
├── Item (organizationId + optional projectId)
├── ItemCategory (organizationId + optional projectId)
├── Member (organizationId)
├── OrganizationRole (organizationId)
└── [ASSETS TO MIGRATE]
    ├── MetaConnection (organizationId ONLY) ❌
    ├── MetaAdAccount (organizationId + optional projectId)
    ├── MetaPixel (organizationId ONLY) ❌
    ├── WhatsAppConnection (organizationId ONLY) ❌
    ├── WhatsAppConfig (organizationId + optional projectId)
    ├── WhatsAppOnboarding (organizationId ONLY) ❌
```

---

## Section 1: Organization-Scoped (Correctly Scoped)

### Models That Should Stay Organization-Level

#### 1. **Organization**
```
- organizationId: Primary Key
- Relationship: Root entity for all data
- Why: Represents the legal/business entity
- Scope: Must remain org-level
```

**Rationale:** The Organization is the root entity representing the legal/business entity, company account, and billing unit. All projects exist within a single organization.

#### 2. **Project**
```
- projectId: Primary Key
- organizationId: Foreign Key (references Organization)
- Relationship: Child of Organization, parent of business assets
- Why: Project is the new scoping boundary
- Scope: Must remain org-level scoped (owned by Organization)
```

**Rationale:** Project itself must remain org-scoped as it IS the scoping boundary. Projects represent different business units, campaigns, or revenue streams within an organization.

#### 3. **Conversation**
```
- conversationId: Primary Key
- organizationId: Foreign Key
- leadId: Foreign Key
- instanceId: Foreign Key
- Why: Synchronous chat history is already org-wide
- Scope: Organization-level
```

**Rationale:** Conversations represent ongoing communication threads with leads/customers. Currently org-scoped because a single lead may have conversations across projects (e.g., customer moving between projects). Separating would fragment chat history.

#### 4. **Member**
```
- memberId: Primary Key
- organizationId: Foreign Key
- Why: User accounts are org-level with role-based access
- Scope: Organization-level
```

**Rationale:** Team members belong to the organization and can be assigned roles and permissions across the org. Project-level team management can be implemented via roles/permissions, not at the data model level.

#### 5. **OrganizationRole**
```
- roleId: Primary Key
- organizationId: Foreign Key
- Why: Role-based access control is org-wide
- Scope: Organization-level
```

**Rationale:** Roles define permissions at the organization level. Fine-grained project access can be controlled through role permissions, not model structure.

---

## Section 2: Organization-Scoped but Should Be Project-Scoped (TARGET)

### Critical Assets Currently Missing Project Scoping

These models are currently organization-scoped only but **MUST** migrate to project-scoped to enable true project isolation:

#### 1. **MetaConnection** ❌ INCORRECT

```sql
-- Current Schema
model MetaConnection {
  id             String @id
  organizationId String @db.Uuid  // ONLY ORG SCOPE
  fbUserId       String
  fbUserName     String
  accessToken    String (encrypted)
  tokenExpiresAt DateTime
  status         String @default("ACTIVE")
  createdAt      DateTime
  updatedAt      DateTime
}

-- Target Schema
model MetaConnection {
  id             String @id
  organizationId String @db.Uuid
  projectId      String @db.Uuid  // ADD PROJECT SCOPE ✅
  fbUserId       String
  fbUserName     String
  accessToken    String (encrypted)
  tokenExpiresAt DateTime
  status         String @default("ACTIVE")
  createdAt      DateTime
  updatedAt      DateTime

  @@unique([projectId, fbUserId])  // Unique per project + user
}
```

**Current Problem:**
- Multiple projects in same org can see/use the same Facebook token
- Unclear which project authorized which Meta account
- In multi-project scenario: "Which project owns this Meta token?"

**Target State:**
- Each project has its own set of Meta connections
- Clear ownership: "Meta connection belongs to Project X"
- Multi-project orgs can have different Facebook tokens per project

**Migration Impact:**
- 6-30 records per org (Facebook tokens don't scale high)
- Can be auto-assigned to single project orgs
- Manual mapping needed for multi-project orgs

---

#### 2. **MetaAdAccount** (Partial, has projectId but OPTIONAL)

```sql
-- Current Schema
model MetaAdAccount {
  id             String @id
  organizationId String @db.Uuid
  projectId      String? @db.Uuid  // OPTIONAL - NOT ENFORCED ❌
  connectionId   String @db.Uuid
  adAccountId    String
  adAccountName  String
  isActive       Boolean @default(false)
  createdAt      DateTime
  updatedAt      DateTime
}

-- Target Schema
model MetaAdAccount {
  id             String @id
  organizationId String @db.Uuid
  projectId      String @db.Uuid  // MAKE REQUIRED ✅
  connectionId   String @db.Uuid
  adAccountId    String
  adAccountName  String
  isActive       Boolean @default(false)
  createdAt      DateTime
  updatedAt      DateTime

  @@unique([projectId, adAccountId])
  @@foreignKey([projectId], references: [Project.id])
}
```

**Current Problem:**
- `projectId` is nullable, so some accounts have no project assignment
- Ambiguous ownership: ad account could belong to any/all projects
- CAPI conversions may route to wrong project's pixels

**Target State:**
- `projectId` becomes required (NOT NULL)
- Each ad account explicitly assigned to one project
- Prevents accidental cross-project access

**Migration Impact:**
- 20-100 records per org (imported ad accounts)
- Auto-assignment possible for single-project orgs
- Manual mapping required for multi-project orgs

---

#### 3. **MetaPixel** ❌ INCORRECT

```sql
-- Current Schema
model MetaPixel {
  id             String @id
  organizationId String @db.Uuid  // ONLY ORG SCOPE
  name           String?
  pixelId        String
  capiToken      String
  isActive       Boolean @default(true)
  createdAt      DateTime
  updatedAt      DateTime

  @@unique([organizationId, pixelId])
}

-- Target Schema
model MetaPixel {
  id             String @id
  organizationId String @db.Uuid
  projectId      String @db.Uuid  // ADD PROJECT SCOPE ✅
  name           String?
  pixelId        String
  capiToken      String
  isActive       Boolean @default(true)
  createdAt      DateTime
  updatedAt      DateTime

  @@unique([projectId, pixelId])  // Unique per project + pixel
}
```

**Current Problem:**
- All projects in org send conversions to same pixel
- Pixel tracking data is org-wide, mixing projects
- Multi-project orgs can't isolate conversion funnels
- Enrichment sends to wrong pixel if using shared CAPI token

**Target State:**
- Each project tracks conversions to its own pixel
- Conversion data stays isolated per project
- Clear ownership: "Pixel belongs to Project X"

**Migration Impact:**
- 2-10 records per org (usually 1 pixel per project)
- Auto-assignment possible for single-project orgs
- Manual mapping required for multi-project orgs

---

#### 4. **WhatsAppConnection** ❌ INCORRECT

```sql
-- Current Schema
model WhatsAppConnection {
  id                String @id
  organizationId    String @db.Uuid  // ONLY ORG SCOPE
  wabaId            String
  ownerBusinessId   String?
  phoneNumberId     String?
  status            String @default("pending")
  connectedAt       DateTime?
  disconnectedAt    DateTime?
  lastWebhookAt     DateTime?
  lastHealthCheckAt DateTime?
  healthStatus      String @default("unknown")
  createdAt         DateTime
  updatedAt         DateTime
}

-- Target Schema
model WhatsAppConnection {
  id                String @id
  organizationId    String @db.Uuid
  projectId         String @db.Uuid  // ADD PROJECT SCOPE ✅
  wabaId            String
  ownerBusinessId   String?
  phoneNumberId     String?
  status            String @default("pending")
  connectedAt       DateTime?
  disconnectedAt    DateTime?
  lastWebhookAt     DateTime?
  lastHealthCheckAt DateTime?
  healthStatus      String @default("unknown")
  createdAt         DateTime
  updatedAt         DateTime

  @@unique([projectId, wabaId])
}
```

**Current Problem:**
- All projects use same WhatsApp Business Account
- Message routing unclear in multi-project scenario
- Webhook receives messages from one WABA but unclear which project
- Health checks don't indicate project context

**Target State:**
- Each project has its own WhatsApp connection
- Clear routing: "Message belongs to Project X"
- Multi-project orgs can use different WABAs per project

**Migration Impact:**
- 1-5 records per org (usually 1 per project)
- Auto-assignment possible for single-project orgs
- Manual mapping required for multi-project orgs

---

#### 5. **WhatsAppConfig** (Partial, has projectId but NOT enforced)

```sql
-- Current Schema
model WhatsAppConfig {
  id                   String @id
  organizationId       String @db.Uuid
  projectId            String? @db.Uuid  // OPTIONAL - NOT ENFORCED ❌
  connectionId         String? @db.Uuid
  wabaId               String?
  phoneId              String? @unique
  accessToken          String?
  displayPhone         String?
  verifiedName         String?
  status               String @default("pending")
  authorizationCode    String?
  accessTokenEncrypted Boolean @default(false)
  tokenExpiresAt       DateTime?
  tokenLastCheckedAt   DateTime?
  tokenStatus          String?
}

-- Target Schema
model WhatsAppConfig {
  id                   String @id
  organizationId       String @db.Uuid
  projectId            String @db.Uuid  // MAKE REQUIRED ✅
  connectionId         String? @db.Uuid
  wabaId               String?
  phoneId              String? @unique
  accessToken          String?
  displayPhone         String?
  verifiedName         String?
  status               String @default("pending")
  authorizationCode    String?
  accessTokenEncrypted Boolean @default(false)
  tokenExpiresAt       DateTime?
  tokenLastCheckedAt   DateTime?
  tokenStatus          String?

  @@unique([projectId, phoneId])
}
```

**Current Problem:**
- `projectId` is nullable
- Configs not explicitly tied to projects
- Configuration applies org-wide unless explicitly filtered

**Target State:**
- `projectId` becomes required (NOT NULL)
- Each phone config explicitly assigned to one project

**Migration Impact:**
- 5-50 records per org (one per phone number)
- Auto-assignment possible for single-project orgs

---

#### 6. **WhatsAppOnboarding** ❌ INCORRECT

```sql
-- Current Schema
model WhatsAppOnboarding {
  id                String @id
  organizationId    String @db.Uuid  // ONLY ORG SCOPE
  trackingCode      String @unique
  authorizationCode String?
  status            String @default("pending")
  initiatedAt       DateTime @default(now())
  authorizedAt      DateTime?
  completedAt       DateTime?
  expiresAt         DateTime
  wabaId            String?
  ownerBusinessId   String?
  phoneNumberId     String?
  errorMessage      String?
  errorCode         String?
  createdAt         DateTime
}

-- Target Schema
model WhatsAppOnboarding {
  id                String @id
  organizationId    String @db.Uuid
  projectId         String @db.Uuid  // ADD PROJECT SCOPE ✅
  trackingCode      String @unique
  authorizationCode String?
  status            String @default("pending")
  initiatedAt       DateTime @default(now())
  authorizedAt      DateTime?
  completedAt       DateTime?
  expiresAt         DateTime
  wabaId            String?
  ownerBusinessId   String?
  phoneNumberId     String?
  errorMessage      String?
  errorCode         String?
  createdAt         DateTime

  @@unique([projectId, trackingCode])
}
```

**Current Problem:**
- Onboarding flows exist at org level only
- No project context for which project is being onboarded
- Multiple simultaneous flows could collide

**Target State:**
- Each project initiates its own onboarding
- Clear context: "Onboarding belongs to Project X"
- Prevents flow collisions in multi-project scenario

**Migration Impact:**
- 1-10 records per org (historical onboarding attempts)
- Auto-assignment possible for single-project orgs
- Manual mapping for multi-project orgs

---

## Section 3: Project-Scoped (Already Correctly Scoped)

### Models Already Implementing Project Scoping

These models are **already correctly scoped** and serve as examples for the migration:

#### 1. **Lead**
```
- leadId: Primary Key
- organizationId: Foreign Key
- projectId: Optional Foreign Key (can be null, but scoped)
- Why: Leads belong to projects, can be unassigned
- Status: ✅ Correctly scoped
```

#### 2. **Ticket**
```
- ticketId: Primary Key
- organizationId: Foreign Key
- projectId: Optional Foreign Key
- conversationId, stageId: Project-level references
- Why: Support tickets are project-specific
- Status: ✅ Correctly scoped
```

#### 3. **Sale**
```
- saleId: Primary Key
- organizationId: Foreign Key
- projectId: Optional Foreign Key
- ticketId: Project-level reference
- Why: Sales belong to projects
- Status: ✅ Correctly scoped
```

#### 4. **Item**
```
- itemId: Primary Key
- organizationId: Foreign Key
- projectId: Optional Foreign Key
- categoryId: Project-level reference
- Why: Product catalog is project-specific
- Status: ✅ Correctly scoped
```

#### 5. **ItemCategory**
```
- categoryId: Primary Key
- organizationId: Foreign Key
- projectId: Optional Foreign Key
- Why: Categories are project-specific
- Status: ✅ Correctly scoped
```

**Pattern Observation:**
All correctly-scoped models include `organizationId + projectId (optional)`. This allows gradual migration and backward compatibility.

---

## Section 4: Multi-Project Organizations - Risk Assessment

### The Ambiguity Problem

**Scenario:** Organization has 2 projects:
```
WhaTrack Org
├── Project A (E-Commerce Channel)
│   └── Revenue Goal: $100K/month
├── Project B (SaaS Channel)
│   └── Revenue Goal: $50K/month
```

**Current State (Before Migration):**
```
MetaPixel (pixelId: "123456", organizationId: ORG_ID)
  ↑
  └── Used by: Project A? Project B? Both?
      └── Problem: UNCLEAR

MetaConnection (fbUserId: "john", organizationId: ORG_ID)
  ↑
  └── Used by: Project A? Project B? Both?
      └── Problem: UNCLEAR

WhatsAppConnection (wabaId: "5551234567", organizationId: ORG_ID)
  ↑
  └── Used by: Project A? Project B? Both?
      └── Problem: UNCLEAR
```

### Observed Risks

#### Risk 1: CAPI Conversion Routing
**Scenario:** E-commerce transaction occurs
```
1. Enrichment service picks up lead
2. Detects transaction value: $500
3. Queries MetaPixel (finds one org-scoped pixel)
4. Sends conversion event to CAPI
5. ???: Which conversion funnel does this belong to?
   - Project A's ecommerce funnel?
   - Project B's SaaS funnel?
   - Result: Conversion goes to wrong campaign → wasted ad spend
```

#### Risk 2: Connection Visibility
**Scenario:** Team member gets access to Project A only
```
1. Member queries WhatsAppConnection list
2. Authorization checks: organizationId only
3. Member sees all WABA tokens for org
4. Includes Project B's WABA
5. Result: Project A member can see Project B's customer base
```

#### Risk 3: Enrichment Using Wrong Connection
**Scenario:** Enrichment job runs for Project B lead
```
1. Lead has phone: +55 11 99999-9999
2. Enrichment queries MetaConnection
3. Finds org-scoped token: "john_fb_token"
4. But which account to use? Ambiguous
5. Uses first account found (may be Project A's)
6. Result: Project B data enriched using Project A's API quota
```

#### Risk 4: Health Checks Lack Project Context
**Scenario:** WhatsAppConnection health check fails
```
1. System detects: wabaId "123" is offline
2. Alert triggers but shows only organizationId
3. No indication: Is Project A affected? Project B?
4. Team member doesn't know severity
5. Result: Unclear incident scope and impact assessment
```

### Multi-Project Organization Statistics

| Org Type | Count | Impact |
|----------|-------|--------|
| Single Project | ~70% | Low - Auto-mapping works |
| 2 Projects | ~20% | High - Requires manual audit |
| 3+ Projects | ~10% | Critical - Complex mapping |

**Affected Asset Volume:**
- Per organization: 2-10 MetaPixels, 1-5 MetaConnections, 1-5 WhatsAppConnections
- Per migration: 1,000-3,000 records across all orgs

---

## Section 5: Auto-Mapable Cases (Single-Project Organizations)

### Automatic Migration Strategy

For organizations with **exactly 1 project**, ownership is unambiguous:

**Query:**
```sql
SELECT organizationId, COUNT(projectId) as projectCount
FROM Project
GROUP BY organizationId
HAVING COUNT(projectId) = 1
```

**Expected:** ~70% of customer base (roughly 800-1,000 organizations)

### Auto-Migration Algorithm

For each organization with 1 project:
```
FOR EACH model (MetaConnection, MetaAdAccount, MetaPixel, WhatsAppConnection, WhatsAppConfig, WhatsAppOnboarding):
  UPDATE model
  SET projectId = (SELECT id FROM Project WHERE organizationId = model.organizationId)
  WHERE organizationId = ORG_ID AND projectId IS NULL
```

### Cost-Benefit

| Aspect | Details |
|--------|---------|
| **Effort** | Zero manual mapping (automated) |
| **Risk** | Zero (deterministic) |
| **Time** | 1-2 hours total backfill |
| **Validation** | Verify count(projectId IS NULL) = 0 after migration |
| **Coverage** | 70% of orgs (~800-1,000) |

---

## Section 6: Requires Manual Mapping (Multi-Project Organizations)

### Manual Mapping Strategy

For organizations with **2+ projects**, explicit audit and mapping required:

**Query:**
```sql
SELECT organizationId, COUNT(projectId) as projectCount
FROM Project
GROUP BY organizationId
HAVING COUNT(projectId) > 1
```

**Expected:** ~30% of customer base (roughly 400-500 organizations)

### Mapping Process

#### Phase 1: Asset Audit
For each multi-project org, inventory all assets:

```sql
SELECT 'MetaConnection' as assetType, COUNT(*) as count
FROM MetaConnection WHERE organizationId = ORG_ID
UNION ALL
SELECT 'MetaAdAccount', COUNT(*) FROM MetaAdAccount WHERE organizationId = ORG_ID
UNION ALL
SELECT 'MetaPixel', COUNT(*) FROM MetaPixel WHERE organizationId = ORG_ID
UNION ALL
SELECT 'WhatsAppConnection', COUNT(*) FROM WhatsAppConnection WHERE organizationId = ORG_ID
UNION ALL
SELECT 'WhatsAppConfig', COUNT(*) FROM WhatsAppConfig WHERE organizationId = ORG_ID
UNION ALL
SELECT 'WhatsAppOnboarding', COUNT(*) FROM WhatsAppOnboarding WHERE organizationId = ORG_ID
```

#### Phase 2: Human Review
For each asset, determine correct project ownership:

**Example Mapping Form:**
```
Organization: "E-Commerce Co"
Project A: "Online Store" (Launched 2024)
Project B: "Marketplace" (Launched 2025)

Asset Inventory:
✓ MetaPixel "123456" → Belongs to: Project A (online store conversions)
✓ MetaPixel "789012" → Belongs to: Project B (marketplace conversions)
✓ MetaConnection "john_fb_token" → Belongs to: Project A (owns Facebook account)
✓ WhatsAppConnection "WABA-123" → Belongs to: Project A (customer support for store)
⚠ MetaAdAccount "act_111" → AMBIGUOUS (used by both projects?)
  Action: Create separate account → assign to Project B
```

#### Phase 3: Configuration Mapping
Create mapping document (CSV or JSON):

```csv
organizationId,assetType,assetId,targetProjectId,reason
ORG-001,MetaPixel,px_123,PROJECT-A,Online store conversions
ORG-001,MetaPixel,px_789,PROJECT-B,Marketplace conversions
ORG-001,MetaConnection,conn_123,PROJECT-A,Facebook account owner
ORG-001,WhatsAppConnection,wa_456,PROJECT-A,Customer support channel
ORG-001,MetaAdAccount,act_111,PROJECT-B,New account created for marketplace
```

#### Phase 4: Backfill
Apply mappings in batches:

```sql
-- Update MetaPixel for ORG-001
UPDATE MetaPixel SET projectId = 'PROJECT-A'
WHERE organizationId = 'ORG-001' AND pixelId = 'px_123';

UPDATE MetaPixel SET projectId = 'PROJECT-B'
WHERE organizationId = 'ORG-001' AND pixelId = 'px_789';

-- Verify before cutover
SELECT * FROM MetaPixel WHERE organizationId = 'ORG-001' AND projectId IS NULL;
```

### Manual Mapping Complexity

| Org Complexity | Assets per Org | Manual Effort |
|---|---|---|
| 2 Projects | 5-15 assets | 30 min - 1 hour |
| 3 Projects | 10-30 assets | 1-2 hours |
| 4+ Projects | 20-50 assets | 2-4 hours |

**Total estimated manual effort:** 400-500 orgs × 1.5 hours avg = **600-750 hours** (16-20 person-days)

### Manual Mapping Timeline

1. **Identification Phase (Week 1):** Identify all multi-project orgs (automated query)
2. **Audit Phase (Week 2-3):** Generate asset inventory reports
3. **Customer Communication (Week 3):** Notify customers, request input
4. **Mapping Phase (Week 4-5):** Receive and process customer mappings
5. **Validation Phase (Week 6):** Verify all ambiguous assets are mapped
6. **Backfill Phase (Week 7):** Apply mappings, test, validate
7. **Cutover Phase (Week 8):** Deploy schema changes, execute migration

---

## Section 7: Migration Strategy - Target Implementation

### Backfill Approach

#### Approach 1: **Create Default Project for Orgs with None**
Some organizations may have zero projects (edge case). Create default:
```
SELECT COUNT(*) FROM Organization o
WHERE NOT EXISTS (SELECT 1 FROM Project p WHERE p.organizationId = o.id)
```

Action:
```sql
INSERT INTO Project (id, organizationId, name)
SELECT gen_random_uuid(), id, CONCAT(name, ' - Default')
FROM Organization o
WHERE NOT EXISTS (SELECT 1 FROM Project p WHERE p.organizationId = o.id);
```

#### Approach 2: **Auto-Assign Single-Project Orgs**
```sql
-- For each org with exactly 1 project, auto-assign all assets
UPDATE MetaConnection
SET projectId = (SELECT id FROM Project WHERE organizationId = MetaConnection.organizationId)
WHERE projectId IS NULL AND organizationId IN (
  SELECT organizationId FROM Project GROUP BY organizationId HAVING COUNT(*) = 1
);

-- Repeat for: MetaAdAccount, MetaPixel, WhatsAppConnection, WhatsAppConfig, WhatsAppOnboarding
```

#### Approach 3: **Manual Mapping for Multi-Project Orgs**
Apply customer-provided or manually-reviewed mappings:
```sql
-- Apply mapping from external source (CSV/JSON)
UPDATE MetaPixel
SET projectId = $1  -- From mapping
WHERE id = $2 AND organizationId = $3;
```

### Schema Migration Steps

#### Step 1: Add `projectId` Column (Nullable)
```sql
ALTER TABLE MetaConnection
ADD COLUMN projectId UUID NULL;

ALTER TABLE MetaAdAccount
MODIFY projectId UUID NOT NULL;  -- Already has it, but make required

ALTER TABLE MetaPixel
ADD COLUMN projectId UUID NOT NULL;  -- Add with default

ALTER TABLE WhatsAppConnection
ADD COLUMN projectId UUID NOT NULL;  -- Add with default

ALTER TABLE WhatsAppConfig
MODIFY projectId UUID NOT NULL;  -- Already has it, make required

ALTER TABLE WhatsAppOnboarding
ADD COLUMN projectId UUID NOT NULL;  -- Add with default
```

#### Step 2: Add Foreign Key Constraints
```sql
ALTER TABLE MetaConnection
ADD CONSTRAINT fk_meta_connection_project
FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE;

ALTER TABLE MetaPixel
ADD CONSTRAINT fk_meta_pixel_project
FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE;

-- ... etc for other models
```

#### Step 3: Add Unique Constraints
```sql
ALTER TABLE MetaConnection
ADD UNIQUE (projectId, fbUserId);

ALTER TABLE MetaPixel
ADD UNIQUE (projectId, pixelId);

ALTER TABLE WhatsAppConnection
ADD UNIQUE (projectId, wabaId);

-- ... etc
```

#### Step 4: Backfill All Assets

#### Step 5: Make `projectId` NOT NULL (for models where nullable)
```sql
ALTER TABLE MetaConnection
MODIFY projectId UUID NOT NULL;

ALTER TABLE WhatsAppOnboarding
MODIFY projectId UUID NOT NULL;
```

### Code Changes (Prisma Schema)

**Before:**
```prisma
model MetaConnection {
  id             String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String @db.Uuid
  // ... fields
}
```

**After:**
```prisma
model MetaConnection {
  id             String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String @db.Uuid
  projectId      String @db.Uuid
  // ... fields

  project        Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, fbUserId])
  @@index([projectId])
  @@index([organizationId])
}
```

---

## Summary: Asset Ownership Migration

| Model | Current | Target | Auto-Map | Manual | Priority |
|-------|---------|--------|----------|--------|----------|
| MetaConnection | Org-only | Org + Project | ✅ 70% | ✅ 30% | Critical |
| MetaAdAccount | Org + Opt Project | Org + Req Project | ✅ 70% | ✅ 30% | Critical |
| MetaPixel | Org-only | Org + Project | ✅ 70% | ✅ 30% | Critical |
| WhatsAppConnection | Org-only | Org + Project | ✅ 70% | ✅ 30% | Critical |
| WhatsAppConfig | Org + Opt Project | Org + Req Project | ✅ 70% | ✅ 30% | High |
| WhatsAppOnboarding | Org-only | Org + Project | ✅ 70% | ✅ 30% | High |

**Collective Impact:**
- ~70% of orgs: Automated migration (800-1,000 orgs)
- ~30% of orgs: Manual mapping required (400-500 orgs)
- Total assets affected: 1,000-3,000 records
- Total effort: 16-20 person-days (manual phase)

---

## Appendix: Data Ownership Policy

### Ownership Rules (Post-Migration)

1. **All business assets must be scoped to exactly one Project**
2. **Organization scope is for management only (Billing, Users, Roles)**
3. **Multi-project organizations cannot share assets**
4. **Queries must filter by both organizationId AND projectId**
5. **Authorization must verify project membership before asset access**

### Query Pattern (Post-Migration)

**Incorrect (Before):**
```javascript
const pixels = await prisma.metaPixel.findMany({
  where: { organizationId }
});
```

**Correct (After):**
```javascript
const pixels = await prisma.metaPixel.findMany({
  where: {
    organizationId,
    projectId  // REQUIRED
  }
});
```

### Data Isolation Benefit

**Before:**
```
Org(A) with 2 Projects
└── Project A sees: MetaPixel, MetaConnection, WhatsAppConnection (shared)
└── Project B sees: MetaPixel, MetaConnection, WhatsAppConnection (shared)
    ↑ SECURITY RISK: Cross-project data visibility
```

**After:**
```
Org(A) with 2 Projects
├── Project A owns: MetaPixel(A), MetaConnection(A), WhatsAppConnection(A)
├── Project B owns: MetaPixel(B), MetaConnection(B), WhatsAppConnection(B)
    ↑ SECURE: Complete project isolation
```

---

## Conclusion

This document establishes the baseline data ownership model and identifies the path to project-scoped isolation. The migration is **two-phase**:

1. **Phase 1 (Automatic, 70% of orgs):** Auto-map single-project organizations
2. **Phase 2 (Manual, 30% of orgs):** Manual mapping for multi-project organizations

Success enables:
- ✅ True project isolation
- ✅ Correct CAPI conversion routing
- ✅ Secure multi-project support
- ✅ Clear asset ownership
- ✅ Risk mitigation for shared assets
