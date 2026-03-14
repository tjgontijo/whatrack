# PRD 32 Phase 2: Write Path Cutover (Meta Ads & WhatsApp)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure all NEW assets are created with `projectId`. Meta Ads OAuth state and WhatsApp onboarding session now carry and persist project ownership. Reads still use `organizationId` (cutover deferred to Phase 4).

**Architecture:** Capture `projectId` before OAuth/onboarding begins. Pass it through state/session. Persist it when creating assets. Reads unchanged for now.

**Tech Stack:** Next.js API routes, Prisma, OAuth state encoding/decoding.

---

## Chunk 1: Meta Ads Write Path

### Task 2.1: Update Meta Ads OAuth State to Include projectId

**Files:**
- Modify: `src/app/api/v1/meta-ads/connect/route.ts`
- Modify: `src/services/meta-ads/meta-oauth.service.ts` (if exists, or create helper)

**What to do:**

Update OAuth state to include `projectId`:

```typescript
// src/app/api/v1/meta-ads/connect/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { resolveProjectScope } from '@/server/auth/project-scope';
import { createOAuthState } from '@/services/meta-ads/meta-oauth.service';

export async function GET(request: NextRequest) {
  // 1. Verify auth
  const session = await auth.api.getSession(/* ... */);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const organizationId = session.user.organizationId;

  // 2. NEW: Resolve current project context
  const projectId = resolveProjectScope(request);
  if (!projectId) {
    return NextResponse.json(
      { error: 'Project context required to connect Meta Ads' },
      { status: 400 }
    );
  }

  // 3. Verify project belongs to organization
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project || project.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // 4. Create OAuth state with projectId
  const state = createOAuthState({
    organizationId,
    userId: session.user.id,
    projectId,  // NEW
  });

  // 5. Redirect to Meta
  const metaUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  metaUrl.searchParams.set('client_id', process.env.META_APP_ID!);
  metaUrl.searchParams.set('redirect_uri', process.env.META_REDIRECT_URI!);
  metaUrl.searchParams.set('state', state);
  metaUrl.searchParams.set('scope', 'ads_management,pages_read_engagement');

  return NextResponse.redirect(metaUrl);
}
```

Helper function:

```typescript
// src/services/meta-ads/meta-oauth.service.ts

export function createOAuthState(input: {
  organizationId: string;
  userId: string;
  projectId: string;
}): string {
  const payload = {
    organizationId: input.organizationId,
    userId: input.userId,
    projectId: input.projectId,  // NEW
    timestamp: Date.now(),
  };

  // Sign and encode state (example using jose or similar)
  return signAndEncode(payload);
}

export function verifyAndDecodeOAuthState(state: string): {
  organizationId: string;
  userId: string;
  projectId: string;
} {
  return verifyAndDecode(state);
}
```

- [ ] **Step 1: Update OAuth state creation**
- [ ] **Step 2: Update OAuth state verification**
- [ ] **Step 3: Run tests**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(meta-ads): add projectId to OAuth state (Phase 2)

- OAuth state now includes organizationId, userId, projectId
- Verify project belongs to organization before creating state
- Require projectId (from context header) to initiate connection
- Pass projectId through to callback handler

Backward compatible: Callback will verify state signature
"
```

**Verification:**
- Tests pass
- OAuth flow still works
- State includes projectId

---

### Task 2.2: Update Meta Ads Callback to Create Connection with projectId

**Files:**
- Modify: `src/app/api/v1/meta-ads/callback/route.ts`
- Modify: `src/services/meta-ads/meta-connection.service.ts`

**What to do:**

Update callback to use `projectId` from state when creating connection:

```typescript
// src/app/api/v1/meta-ads/callback/route.ts

export async function GET(request: NextRequest) {
  const { code, state } = Object.fromEntries(request.nextUrl.searchParams);

  if (!code || !state) {
    return NextResponse.json({ error: 'Invalid callback' }, { status: 400 });
  }

  // 1. Verify and decode state (now includes projectId)
  const { organizationId, userId, projectId } = verifyAndDecodeOAuthState(state);

  // 2. Exchange code for token
  const tokenResponse = await exchangeCodeForToken(code);
  const accessToken = tokenResponse.access_token;

  // 3. Fetch user info from Meta
  const userInfo = await fetchFbUserInfo(accessToken);

  // 4. Create connection WITH projectId
  const connection = await metaConnectionService.createOrUpdateConnection({
    organizationId,
    projectId,  // NEW: from state
    fbUserId: userInfo.id,
    fbUserName: userInfo.name,
    accessToken,
    tokenExpiresAt: calculateTokenExpiry(tokenResponse.expires_in),
  });

  // 5. Sync ad accounts (will inherit projectId from connection)
  await metaAdAccountService.syncAdAccounts({
    organizationId,
    connectionId: connection.id,
    projectId,  // NEW
    accessToken,
  });

  // 6. Redirect to UI with success
  return NextResponse.redirect(
    new URL(
      `/dashboard/settings/integrations?tab=meta-ads&success=true&projectId=${projectId}`,
      request.url
    )
  );
}
```

Update service:

```typescript
// src/services/meta-ads/meta-connection.service.ts

export async function createOrUpdateConnection(input: {
  organizationId: string;
  projectId: string;  // NEW: required in Phase 2
  fbUserId: string;
  fbUserName: string;
  accessToken: string;
  tokenExpiresAt: Date;
}): Promise<MetaConnection> {
  // Create or update with both organizationId and projectId
  return prisma.metaConnection.upsert({
    where: {
      // Check if connection already exists for this project/user combo
      projectId_fbUserId: {
        projectId: input.projectId,
        fbUserId: input.fbUserId,
      },
    },
    create: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      fbUserId: input.fbUserId,
      fbUserName: input.fbUserName,
      accessToken: input.accessToken,
      tokenExpiresAt: input.tokenExpiresAt,
      status: 'ACTIVE',
    },
    update: {
      fbUserName: input.fbUserName,
      accessToken: input.accessToken,
      tokenExpiresAt: input.tokenExpiresAt,
      status: 'ACTIVE',
    },
  });
}

export async function syncAdAccounts(input: {
  organizationId: string;
  connectionId: string;
  projectId: string;  // NEW: inherited from connection
  accessToken: string;
}): Promise<MetaAdAccount[]> {
  // Fetch accounts from Meta API
  const accounts = await fetchAdAccountsFromMeta(input.accessToken);

  // Create/update accounts with projectId
  const created = await Promise.all(
    accounts.map(acc =>
      prisma.metaAdAccount.upsert({
        where: {
          organizationId_adAccountId: {
            organizationId: input.organizationId,
            adAccountId: acc.id,
          },
        },
        create: {
          organizationId: input.organizationId,
          projectId: input.projectId,  // NEW
          connectionId: input.connectionId,
          adAccountId: acc.id,
          adAccountName: acc.name,
          isActive: false,
        },
        update: {
          projectId: input.projectId,  // NEW: update existing to new project
          adAccountName: acc.name,
        },
      })
    )
  );

  return created;
}
```

- [ ] **Step 1: Update callback route**
- [ ] **Step 2: Update connection service**
- [ ] **Step 3: Update sync service**
- [ ] **Step 4: Write test for callback with projectId in state**
- [ ] **Step 5: Run tests**
- [ ] **Step 6: Commit**

**Verification:**
- Tests pass
- Callback creates connection with projectId
- Ad accounts inherit projectId

---

## Chunk 2: WhatsApp Write Path

### Task 2.3: Update WhatsApp Onboarding to Include projectId

**Files:**
- Modify: `src/app/api/v1/whatsapp/onboarding/route.ts`
- Modify: `src/services/whatsapp/whatsapp-onboarding.service.ts`

**What to do:**

Update onboarding session to include `projectId`:

```typescript
// src/app/api/v1/whatsapp/onboarding/route.ts

export async function GET(request: NextRequest) {
  // 1. Verify auth
  const session = await auth.api.getSession(/* ... */);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const organizationId = session.user.organizationId;

  // 2. NEW: Resolve current project context
  const projectId = resolveProjectScope(request);
  if (!projectId) {
    return NextResponse.json(
      { error: 'Project context required to connect WhatsApp' },
      { status: 400 }
    );
  }

  // 3. Verify project
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project || project.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // 4. Create onboarding session WITH projectId
  const onboarding = await whatsappOnboardingService.createOnboardingSession({
    organizationId,
    projectId,  // NEW
  });

  return NextResponse.json({
    trackingCode: onboarding.trackingCode,
    redirectUrl: buildOnboardingUrl(onboarding.trackingCode),
  });
}
```

Service update:

```typescript
// src/services/whatsapp/whatsapp-onboarding.service.ts

export async function createOnboardingSession(input: {
  organizationId: string;
  projectId: string;  // NEW: required in Phase 2
}): Promise<WhatsAppOnboarding> {
  const trackingCode = generateUniqueCode();

  return prisma.whatsAppOnboarding.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId,  // NEW
      trackingCode,
      status: 'pending',
    },
  });
}
```

- [ ] **Step 1: Update onboarding route**
- [ ] **Step 2: Update onboarding service**
- [ ] **Step 3: Write test**
- [ ] **Step 4: Commit**

**Verification:**
- Tests pass
- Onboarding session stores projectId

---

### Task 2.4: Update WhatsApp Callback to Use projectId from Session

**Files:**
- Modify: `src/app/api/v1/whatsapp/callback/route.ts`

**What to do:**

Update callback to create connection and config with `projectId` from onboarding session:

```typescript
// src/app/api/v1/whatsapp/callback/route.ts

export async function POST(request: NextRequest) {
  const { code, tracking_code } = await request.json();

  if (!code || !tracking_code) {
    return NextResponse.json({ error: 'Invalid callback' }, { status: 400 });
  }

  // 1. Find onboarding session (now has projectId)
  const onboarding = await prisma.whatsAppOnboarding.findUnique({
    where: { trackingCode: tracking_code },
  });

  if (!onboarding) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { organizationId, projectId } = onboarding;

  // 2. Exchange code for token
  const tokenResponse = await exchangeCodeForToken(code);

  // 3. Fetch account info
  const accountInfo = await fetchWhatsAppAccountInfo(tokenResponse.access_token);

  // 4. Create connection WITH projectId
  const connection = await prisma.whatsAppConnection.create({
    data: {
      organizationId,
      projectId,  // NEW: from session
      wabaId: accountInfo.waba_id,
      ownerBusinessId: accountInfo.owner_business_id,
      phoneNumberId: accountInfo.phone_number_id,
      status: 'connected',
      connectedAt: new Date(),
    },
  });

  // 5. Create config WITH projectId
  const config = await prisma.whatsAppConfig.create({
    data: {
      organizationId,
      projectId,  // NEW: from session
      connectionId: connection.id,
      phoneNumberId: accountInfo.phone_number_id,
      webhookToken: generateWebhookToken(),
      status: 'active',
    },
  });

  // 6. Mark onboarding as complete
  await prisma.whatsAppOnboarding.update({
    where: { id: onboarding.id },
    data: {
      status: 'completed',
      authorizationCode: code,
    },
  });

  return NextResponse.json({
    success: true,
    connectionId: connection.id,
    configId: config.id,
  });
}
```

- [ ] **Step 1: Update callback to use projectId from session**
- [ ] **Step 2: Write test for callback with projectId**
- [ ] **Step 3: Commit**

**Verification:**
- Tests pass
- Callback creates connection/config with projectId

---

## Chunk 3: Validation and Testing

### Task 2.5: Write Tests for Write Path Cutover

**Files:**
- Create: `src/__tests__/phase-2/meta-ads-write-cutover.test.ts`
- Create: `src/__tests__/phase-2/whatsapp-write-cutover.test.ts`

**What to do:**

Write integration tests for Phase 2 write path:

```typescript
// src/__tests__/phase-2/meta-ads-write-cutover.test.ts

describe('Meta Ads Write Path - Phase 2', () => {
  it('should include projectId in OAuth state', async () => {
    const projectId = 'test-project-123';
    const state = createOAuthState({
      organizationId: 'org-123',
      userId: 'user-456',
      projectId,
    });

    const decoded = verifyAndDecodeOAuthState(state);
    expect(decoded.projectId).toBe(projectId);
  });

  it('should create connection with projectId on callback', async () => {
    const projectId = 'test-project-123';
    const state = createOAuthState({
      organizationId: 'org-123',
      userId: 'user-456',
      projectId,
    });

    // Simulate callback
    const connection = await metaConnectionService.createOrUpdateConnection({
      organizationId: 'org-123',
      projectId,
      fbUserId: 'fb-user-123',
      fbUserName: 'Test User',
      accessToken: 'test-token',
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 24 * 1000),
    });

    expect(connection.projectId).toBe(projectId);
  });

  it('should sync ad accounts with projectId', async () => {
    const projectId = 'test-project-123';
    const connection = await prisma.metaConnection.create({
      data: {
        organizationId: 'org-123',
        projectId,
        fbUserId: 'test-user',
        fbUserName: 'Test',
        accessToken: 'token',
        tokenExpiresAt: new Date(),
      },
    });

    const accounts = await metaAdAccountService.syncAdAccounts({
      organizationId: 'org-123',
      connectionId: connection.id,
      projectId,
      accessToken: 'token',
    });

    accounts.forEach(acc => {
      expect(acc.projectId).toBe(projectId);
    });
  });
});
```

```typescript
// src/__tests__/phase-2/whatsapp-write-cutover.test.ts

describe('WhatsApp Write Path - Phase 2', () => {
  it('should create onboarding session with projectId', async () => {
    const projectId = 'test-project-123';
    const onboarding = await whatsappOnboardingService.createOnboardingSession({
      organizationId: 'org-123',
      projectId,
    });

    expect(onboarding.projectId).toBe(projectId);
    expect(onboarding.status).toBe('pending');
  });

  it('should create connection and config with projectId on callback', async () => {
    const projectId = 'test-project-123';
    const onboarding = await prisma.whatsAppOnboarding.create({
      data: {
        organizationId: 'org-123',
        projectId,
        trackingCode: 'test-code',
        status: 'pending',
      },
    });

    // Simulate callback (in real test, mock provider response)
    const result = await handleWhatsAppCallback({
      code: 'test-auth-code',
      tracking_code: onboarding.trackingCode,
    });

    const connection = await prisma.whatsAppConnection.findUnique({
      where: { id: result.connectionId },
    });

    expect(connection?.projectId).toBe(projectId);
  });
});
```

- [ ] **Step 1: Write Meta Ads tests**
- [ ] **Step 2: Write WhatsApp tests**
- [ ] **Step 3: Run tests**
- [ ] **Step 4: Commit**

**Verification:**
- All tests pass
- Tests verify projectId is captured and persisted

---

### Task 2.6: Run Smoke Checks

**Files:**
- Reference: `docs/PRD/32_SMOKE_CHECKLIST_META_ADS.md`
- Reference: `docs/PRD/32_SMOKE_CHECKLIST_WHATSAPP.md`

**What to do:**

Run manual smoke tests with project context:

- [ ] **Step 1: Test Meta Ads connection with project context**
  - Use the checklist from Phase 0
  - Verify new connections are created with `projectId` set
  - Verify existing connections with null projectId still work

- [ ] **Step 2: Test WhatsApp connection with project context**
  - Use the checklist from Phase 0
  - Verify new connections are created with `projectId` set
  - Verify existing connections with null projectId still work

- [ ] **Step 3: Test without project context**
  - Verify that initiating connection without projectId fails with clear error
  - Error should guide user to select project first

**Verification:**
- New assets have projectId
- Existing org-scoped assets (from before Phase 2) still work
- Error handling is clear

---

## Chunk 4: Phase 2 Completion

### Task 2.7: Phase 2 Completion and Commit

**Files:**
- All modified files from Phase 2

**What to do:**

Verify Phase 2 completion:

- [ ] **Step 1: Verify all writes use projectId**

```sql
-- All new connections should have projectId
SELECT COUNT(*) FROM "MetaConnection" WHERE "projectId" IS NULL;

-- If this returns 0 (or only old data from before Phase 2), we're good
```

- [ ] **Step 2: Run full test suite**

```bash
npm run lint && npm run test -- --run && npm run build
```

- [ ] **Step 3: Run smoke checks from Phase 0**

Meta Ads and WhatsApp flows should still work end-to-end.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(phase-2): write path cutover for Meta Ads and WhatsApp

Meta Ads:
- OAuth state now includes projectId
- Callback creates connection with projectId
- Ad accounts inherit projectId from connection
- Require project context to initiate connection

WhatsApp:
- Onboarding session now includes projectId
- Callback creates connection and config with projectId
- Multiple numbers per project now tracked at project level
- Require project context to initiate connection

Testing:
- All tests pass
- Smoke checks confirm no regressions
- New assets created with projectId
- Old org-scoped assets still functional

Ready for Phase 3: Backfill
"
```

**Verification:**
- All tests pass
- Build succeeds
- Smoke checks pass
- All new assets have projectId

---

## Phase 2 Exit Criteria

Phase 2 is complete when:

1. ✅ All NEW Meta Ads connections are created with `projectId`
2. ✅ All NEW Meta Ad Accounts are created with `projectId`
3. ✅ All NEW WhatsApp connections are created with `projectId`
4. ✅ All NEW WhatsApp configs are created with `projectId`
5. ✅ OAuth state includes `projectId`
6. ✅ Onboarding session includes `projectId`
7. ✅ Callbacks use `projectId` from state/session
8. ✅ Require project context to initiate connection
9. ✅ All reads still use `organizationId` (cutover deferred to Phase 4)
10. ✅ All tests pass
11. ✅ Smoke checks pass

**Next Phase: Phase 3 — Backfill Legacy Data**

Phase 3 will:
- Auto-map single-project orgs
- Require manual mapping for multi-project orgs
- Ensure all assets have projectId before Phase 4
