# PRD 32 Phase 0: WhatsApp Connection Smoke Checklist

**Purpose**: Verify WhatsApp connection flow and ownership enforcement works correctly with organization and project scoping.

**Date**: 2026-03-14
**Scope**: Phase 0 Task 0.8

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
  'Test Org WhatsApp',
  'test-org-whatsapp-' || to_char(now(), 'YYYYMMDDHH24MISS'),
  now(),
  now()
) RETURNING id;
```

Save the organization ID for the next steps (referenced as `$TEST_ORG_ID`).

```sql
-- Create test projects (required for Phase 2 but establish now)
INSERT INTO projects (id, organization_id, name, created_at, updated_at)
VALUES
  (gen_random_uuid(), '$TEST_ORG_ID'::uuid, 'Project A - Support', now(), now()),
  (gen_random_uuid(), '$TEST_ORG_ID'::uuid, 'Project B - Sales', now(), now())
RETURNING id;
```

Save both project IDs for later verification.

### 2. Prepare Meta WhatsApp Business Account

You will need:
- A Meta WhatsApp Business Account (with at least one phone number)
- Meta Business Manager access
- Phone number linked to the account

**To get test credentials:**
1. Go to https://business.facebook.com
2. Navigate to WhatsApp Manager
3. Verify you have at least one phone number configured
4. Note: At this stage you won't connect yet - just verify it exists

### 3. Set Test Environment Variables

Verify these are configured in `.env.local`:
```
NEXT_PUBLIC_META_APP_ID=<your-meta-app-id>
NEXT_PUBLIC_META_CLIENT_TOKEN=<your-meta-client-token>
NEXT_PUBLIC_META_CONFIG_ID=<your-meta-config-id>
APP_URL=http://localhost:3000
```

---

## Smoke Test Flow: WhatsApp Connection

### Step 1: Initiate WhatsApp Onboarding

**What to do:**
1. Navigate to `/dashboard/settings/whatsapp`
2. Click "Conectar WhatsApp" button
3. Verify a popup opens for Meta login

**Expected result:**
- Popup URL should be: `https://www.facebook.com/dialog/oauth?...`
- Popup contains Meta login form
- URL parameters include: `scope=whatsapp_business_management,business_management`

**Database verification:**
```sql
-- Check that an onboarding session was created
SELECT id, organization_id, tracking_code, status, expires_at
FROM whatsapp_onboardings
WHERE organization_id = '$TEST_ORG_ID'::uuid
ORDER BY created_at DESC LIMIT 1;

-- Expected: 1 row with status='pending'
-- expires_at should be 24 hours from now
```

**Known issues:**
- If popup is blocked, check browser popup blocker settings
- Onboarding session expires after 24 hours

---

### Step 2: Complete OAuth Authorization

**What to do:**
1. In the Meta login popup, log in with your test Meta account
2. Select the WhatsApp Business Account you prepared
3. Review the permissions requested (WhatsApp Business Management, Business Management)
4. Click "Continue" or "Authorize"

**Expected result:**
- Popup closes automatically
- Dashboard redirects back to `/dashboard/settings/whatsapp`
- Success message appears (toast notification)

**Database verification:**
```sql
-- Check that onboarding was marked as completed
SELECT id, organization_id, tracking_code, status, completed_at
FROM whatsapp_onboardings
WHERE organization_id = '$TEST_ORG_ID'::uuid
ORDER BY created_at DESC LIMIT 1;

-- Expected: status='completed', completed_at is set
```

---

### Step 3: Verify Phone Numbers are Discovered

**What to do:**
1. Remain on `/dashboard/settings/whatsapp` page
2. Wait 3-5 seconds for phone numbers to load
3. You should see a table with available phone numbers

**Expected result:**
- Table shows phone numbers from the WhatsApp Business Account
- Columns: Display Phone, Verified Name, Status
- Status shows as "pending" (needs to be connected)

**Database verification:**
```sql
-- Check that WhatsAppConfig records were created for each phone
SELECT id, organization_id, project_id, waba_id, phone_id,
       display_phone, verified_name, status
FROM whatsapp_configs
WHERE organization_id = '$TEST_ORG_ID'::uuid
ORDER BY created_at DESC;

-- Expected: One row per phone number discovered
-- status='pending', all projectId values should be NULL
```

**Critical check - Ownership enforcement:**
```sql
-- Verify all phone configs are organization-scoped, not project-scoped
SELECT id, organization_id, project_id, phone_id
FROM whatsapp_configs
WHERE organization_id = '$TEST_ORG_ID'::uuid;

-- Expected: project_id should be NULL for all rows (Phase 0 behavior)
```

---

### Step 4: Connect a Phone Number

**What to do:**
1. In the phone numbers table, find one of your phone numbers
2. Click "Conectar" or similar button (if available in Phase 0)
3. Or verify the status changed to "connected"

**Expected result:**
- Phone number status changes to "connected" (green badge)
- Access token is securely stored
- Phone is ready to receive/send messages

**Database verification:**
```sql
-- Check that the phone config was updated
SELECT id, organization_id, project_id, phone_id, display_phone,
       verified_name, status, access_token_encrypted, token_expires_at
FROM whatsapp_configs
WHERE organization_id = '$TEST_ORG_ID'::uuid
AND phone_id = '$PHONE_ID';

-- Expected: status='connected'
-- access_token_encrypted=true, token_expires_at is in future
```

---

### Step 5: Verify Webhook Configuration

**What to do:**
1. Check Meta Business Manager webhook settings
2. Verify webhook URL is set to: `https://your-domain/api/v1/whatsapp/webhook`
3. Verify webhook is receiving messages (if you have an active WhatsApp chat)

**Expected result:**
- Webhook is registered with Meta
- Messages are being received and processed
- No errors in logs

**Database verification:**
```sql
-- Check that webhook events are being logged
SELECT id, organization_id, event_type, status, created_at
FROM whatsapp_webhook_events
WHERE organization_id = '$TEST_ORG_ID'::uuid
ORDER BY created_at DESC LIMIT 5;

-- Should see recent webhook events if messages are being sent
```

---

### Step 6: Verify Configuration Summary

**What to do:**
1. On the settings page, look for "Configuração Ativa" section
2. Should display the connected phone information

**Expected result:**
- Shows connected phone number
- Shows connection date
- Shows token expiration date (if available)
- "Reconectar" or "Desconectar" buttons available

**Database verification:**
```sql
-- Verify the phone configuration is correct
SELECT id, organization_id, phone_id, display_phone, verified_name,
       status, token_expires_at, last_webhook_at
FROM whatsapp_configs
WHERE organization_id = '$TEST_ORG_ID'::uuid
AND status = 'connected';

-- Expected: All required fields populated
```

---

### Step 7: Test Multi-Number Ambiguity Scenario

**What to do:**
1. If your WhatsApp Business Account has 2+ phone numbers:
   - Repeat Step 4 to connect a second phone number
   - Verify both appear in the database

**Expected result:**
- Multiple WhatsAppConfig records exist for same organization
- Each has unique phone_id
- Both show as "connected"

**Database verification:**
```sql
-- Check for multiple phones in same org
SELECT id, phone_id, display_phone, status
FROM whatsapp_configs
WHERE organization_id = '$TEST_ORG_ID'::uuid;

-- Expected: Multiple rows, each with different phone_id
```

**Multi-Number Limitation Note:**
In Phase 0, if you have 2+ phone numbers in the same organization:
- System does NOT know which project owns which number
- Inbound messages will be ambiguous (Phase 2 will fix this)
- See Phase 2 backfill strategy for resolution

---

### Step 8: Test Disconnection (Optional - May Not Be Available in Phase 0)

**What to do:**
1. Click "Desconectar" button (if available)
2. Confirm disconnection

**Expected result:**
- Phone status changes to "disconnected"
- Access token is cleared
- Configuration remains in DB (soft delete)

**Database verification:**
```sql
-- Check that config was soft-deleted
SELECT id, phone_id, status, disconnected_at, disconnected_by
FROM whatsapp_configs
WHERE organization_id = '$TEST_ORG_ID'::uuid;

-- Expected: status='disconnected', disconnected_at is set
```

---

## Verification Checklist

Use this checklist to verify all Phase 0 WhatsApp ownership is correct:

- [ ] WhatsAppConfig exists for each phone number with NULL projectId
- [ ] WhatsAppConfig.organizationId is correct for all records
- [ ] Phone numbers are correctly discovered from WhatsApp Business Account
- [ ] Access tokens are encrypted in database
- [ ] Token expiration dates are correct
- [ ] Onboarding session expires after 24 hours
- [ ] Webhook events are being logged
- [ ] No foreign key violations in database
- [ ] Audit logs record all actions (check `audit_logs` table)
- [ ] Multiple phone numbers can coexist in same organization

---

## Known Limitations (Phase 0)

1. **No Project Scoping**: All phone numbers are organization-scoped. projectId field exists but is NULL.
   - Resolution: Phase 2 backfill will map phone numbers to specific projects

2. **Multi-Number Ambiguity**: If organization has 2+ phone numbers + 2+ projects:
   - Inbound messages cannot be routed to correct project
   - System will route to "first matching project" (non-deterministic)
   - Resolution: Phase 2 will add explicit project selection during connection

3. **No Phone Selection During Onboarding**: User cannot choose which project each phone belongs to
   - Resolution: Phase 2 will add project selection dialog during onboarding flow

4. **Token Expiration Not Proactive**: Tokens are checked on-demand, not with proactive cron
   - Resolution: Phase 3 will add health check cron

5. **No Quota Enforcement**: WhatsApp connections are not quota-limited in Phase 0
   - Resolution: Phase 3 will add quota enforcement per plan tier

---

## Rollback Steps

If something breaks during testing:

### Option 1: Delete Test Organization
```sql
-- WARNING: This deletes everything related to the org
DELETE FROM organizations WHERE id = '$TEST_ORG_ID'::uuid;
```

### Option 2: Delete Specific Phone Config
```sql
DELETE FROM whatsapp_configs
WHERE organization_id = '$TEST_ORG_ID'::uuid AND phone_id = '$PHONE_ID';
```

### Option 3: Disconnect Without Deleting
```sql
UPDATE whatsapp_configs
SET status = 'pending', access_token = NULL, token_expires_at = NULL
WHERE organization_id = '$TEST_ORG_ID'::uuid AND phone_id = '$PHONE_ID';
```

---

## Success Criteria

✅ Test is successful when:
1. WhatsApp onboarding completes without errors
2. Phone numbers are discovered from WhatsApp Business Account
3. At least one phone can be connected successfully
4. All database records have correct organization_id
5. All projectId fields are NULL (Phase 0 behavior)
6. Webhook events are being received and logged
7. No audit log errors are recorded

---

## Notes for Phase 2

When implementing Phase 2 (project-level ownership), you will:
1. Add projectId selection to onboarding flow
2. Update WhatsAppConfig to require projectId
3. Backfill existing phone numbers to specific projects (see backfill strategy)
4. Add logic to route inbound messages to correct project based on phone_id + projectId
5. Update UI to show project context
6. Handle multi-project disambiguation explicitly

---

## Debugging Multi-Number Issues

If you have multiple phone numbers and encounter routing issues, use these queries:

```sql
-- Find all phone configs for an organization
SELECT phone_id, display_phone, verified_name, project_id, status
FROM whatsapp_configs
WHERE organization_id = '$TEST_ORG_ID'::uuid;

-- Check which project is being used for routing (if any)
SELECT phone_id, project_id, created_at
FROM whatsapp_configs
WHERE organization_id = '$TEST_ORG_ID'::uuid
ORDER BY created_at;

-- If multiple projects exist and multiple phones are connected:
-- System will use FIRST phone in creation order - this is the ambiguity!
```
