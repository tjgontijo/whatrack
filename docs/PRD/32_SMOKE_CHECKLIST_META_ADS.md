# PRD 32 Phase 0: Meta Ads Connection Smoke Checklist

**Purpose**: Verify Meta Ads connection flow and ownership enforcement works correctly with organization and project scoping.

**Date**: 2026-03-14
**Scope**: Phase 0 Task 0.7

---

## Pre-Test Setup

### 1. Prepare Test Data

Run these commands to create test organization and projects:

```bash
# Connect to database (adjust connection string as needed)
psql postgresql://user:password@localhost:5432/whatrack
```

```sql
-- Create test organization
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Test Org Meta Ads',
  'test-org-meta-ads-' || to_char(now(), 'YYYYMMDDHH24MISS'),
  now(),
  now()
) RETURNING id;
```

Save the organization ID for the next steps (referenced as `$TEST_ORG_ID`).

```sql
-- Create test projects (required for Phase 2 but establish now)
INSERT INTO projects (id, organization_id, name, created_at, updated_at)
VALUES
  (gen_random_uuid(), '$TEST_ORG_ID'::uuid, 'Project A - Campaigns', now(), now()),
  (gen_random_uuid(), '$TEST_ORG_ID'::uuid, 'Project B - Analytics', now(), now())
RETURNING id;
```

Save both project IDs for later verification.

### 2. Create Test User Account

- Create a test Facebook/Meta account or use an existing personal account
- Ensure the account has access to at least one Meta Ad Account
- Note the Facebook User ID and Ad Account ID

### 3. Set Test Environment Variables

Verify these are configured in `.env.local`:
```
NEXT_PUBLIC_META_APP_ID=<your-meta-app-id>
NEXT_PUBLIC_META_CLIENT_TOKEN=<your-meta-client-token>
NEXT_PUBLIC_META_CONFIG_ID=<your-meta-config-id>
NEXT_PUBLIC_META_BUSINESS_ACCOUNT_ID=<your-meta-business-account-id>
```

---

## Smoke Test Flow: Meta Ads Connection

### Step 1: Initiate OAuth Connection

**What to do:**
1. Navigate to `/dashboard/settings/meta-ads`
2. Click "Conectar Meta Ads" button
3. Verify a popup opens for Meta login

**Expected result:**
- Popup URL should be: `https://www.facebook.com/dialog/oauth?...`
- Popup contains Meta login form

**Database verification:**
```sql
-- Check that a state token was created
SELECT id, organization_id, status FROM meta_oauth_states
WHERE organization_id = '$TEST_ORG_ID'::uuid
ORDER BY created_at DESC LIMIT 1;

-- Expected: 1 row with status='pending'
```

**Known issues:**
- If popup is blocked, check browser popup blocker settings
- State token should expire after 30 minutes

---

### Step 2: Complete OAuth Authorization

**What to do:**
1. In the Meta login popup, log in with your test Meta account
2. Review the permissions requested
3. Click "Continue" or "Authorize"

**Expected result:**
- Popup closes automatically
- Dashboard shows "Conectado" badge on the button
- No error toast appears

**Database verification:**
```sql
-- Check that MetaConnection was created
SELECT id, organization_id, fb_user_id, fb_user_name, status, created_at
FROM meta_connections
WHERE organization_id = '$TEST_ORG_ID'::uuid
ORDER BY created_at DESC LIMIT 1;

-- Expected: 1 row with status='ACTIVE'
```

**Critical check - Ownership enforcement:**
```sql
-- IMPORTANT: Verify NO projectId is set (Phase 0 behavior)
SELECT id, organization_id, project_id
FROM meta_connections
WHERE organization_id = '$TEST_ORG_ID'::uuid;

-- Expected: project_id column should be NULL for all rows
-- This will change in Phase 2 backfill
```

---

### Step 3: Verify Ad Accounts are Loaded

**What to do:**
1. Remain on `/dashboard/settings/meta-ads` page
2. Wait 3-5 seconds for ad accounts to load
3. You should see a table with connected ad accounts

**Expected result:**
- Table shows ad accounts from the connected Meta account
- Columns: Account Name, Account ID, Status
- Each row shows "active" status (green badge)

**Database verification:**
```sql
-- Check that MetaAdAccount records were created
SELECT id, organization_id, meta_connection_id, fb_ad_account_id, name
FROM meta_ad_accounts
WHERE organization_id = '$TEST_ORG_ID'::uuid;

-- Expected: Multiple rows (one per ad account in Meta account)
```

**Critical check - Ownership enforcement:**
```sql
-- Verify ad accounts are linked to correct organization, no projectId yet
SELECT id, organization_id, project_id, meta_connection_id
FROM meta_ad_accounts
WHERE organization_id = '$TEST_ORG_ID'::uuid;

-- Expected: project_id should be NULL for all rows
-- meta_connection_id should match the connection we just created
```

---

### Step 4: Verify Connections List

**What to do:**
1. Look at the "Conexões Ativas" section on the same page
2. You should see the connection you just created

**Expected result:**
- Shows your test account (Name: "Test User" or similar)
- Shows connection date
- "Desconectar" button is available

**Database verification:**
```sql
-- Verify the connection is listed correctly
SELECT id, organization_id, fb_user_id, fb_user_name, status, created_at, updated_at
FROM meta_connections
WHERE organization_id = '$TEST_ORG_ID'::uuid;

-- Expected: Exactly 1 row for our test connection
```

---

### Step 5: Test Pixel Connection (Optional - Phase 0)

**What to do:**
1. On the same settings page, look for "Pixels" section
2. Click "Adicionar Pixel" button (if available)
3. Enter a valid Pixel ID from your Meta account

**Expected result:**
- Pixel is created in database
- Shows in active pixels list

**Database verification:**
```sql
-- Check MetaPixel table
SELECT id, organization_id, project_id, pixel_id, name, is_active
FROM meta_pixels
WHERE organization_id = '$TEST_ORG_ID'::uuid;

-- Expected: project_id should be NULL (Phase 0 behavior)
```

---

### Step 6: Test Disconnection

**What to do:**
1. Find the connection you created in "Conexões Ativas"
2. Click "Desconectar" button
3. Confirm disconnection in dialog

**Expected result:**
- Connection disappears from UI immediately
- Ad accounts table becomes empty
- No error messages

**Database verification:**
```sql
-- Verify connection is soft-deleted (or status changed)
SELECT id, organization_id, status, created_at, updated_at
FROM meta_connections
WHERE organization_id = '$TEST_ORG_ID'::uuid;

-- Expected: status should be 'DELETED' or similar, or row deleted entirely
```

---

## Verification Checklist

Use this checklist to verify all Phase 0 Meta Ads ownership is correct:

- [ ] MetaConnection exists with NULL projectId
- [ ] All MetaAdAccount records have NULL projectId
- [ ] All MetaPixel records have NULL projectId
- [ ] MetaConnection.organizationId is correct
- [ ] MetaAdAccount.organizationId matches MetaConnection.organizationId
- [ ] MetaPixel.organizationId is correct
- [ ] State token expires after 30 minutes
- [ ] Disconnection removes all related records properly
- [ ] No foreign key violations in database
- [ ] Audit logs record all actions (check `audit_logs` table)

---

## Known Limitations (Phase 0)

1. **No Project Scoping**: All assets are organization-scoped. projectId field exists but is NULL.
   - Resolution: Phase 2 backfill will map assets to specific projects based on user selection

2. **Single Connection Per Org**: If you connect a second Meta account, it will replace the first.
   - Resolution: Phase 2 will support multiple connections per project

3. **No Asset Disambiguation**: If org has multiple projects, users can't specify which project owns which pixel/account.
   - Resolution: Phase 2 will add project selection UI during connection flow

4. **No Quota Enforcement**: Meta Ads connections are not quota-limited in Phase 0.
   - Resolution: Phase 3 will add quota enforcement per plan tier

---

## Rollback Steps

If something breaks during testing:

### Option 1: Delete Test Organization
```sql
-- WARNING: This deletes everything related to the org
DELETE FROM organizations WHERE id = '$TEST_ORG_ID'::uuid;
```

### Option 2: Delete Specific Connection
```sql
DELETE FROM meta_connections
WHERE organization_id = '$TEST_ORG_ID'::uuid AND id = '$CONNECTION_ID'::uuid;

-- This cascades to related MetaAdAccount records
```

---

## Success Criteria

✅ Test is successful when:
1. Meta Ads connection completes without errors
2. All database records have correct organization_id
3. All projectId fields are NULL (Phase 0 behavior)
4. Disconnection properly cleans up all related records
5. No audit log errors are recorded

---

## Notes for Phase 2

When implementing Phase 2 (project-level ownership), you will:
1. Add projectId selection to OAuth flow
2. Update MetaConnection to require projectId
3. Backfill existing connections to specific projects (see backfill strategy)
4. Add project-level filtering to all queries
5. Update UI to show project context
