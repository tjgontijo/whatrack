# PRD 32: WhatsApp Onboarding Flow Baseline Documentation

**Document Version:** 1.0
**Date:** 2026-03-14
**Purpose:** Establish baseline understanding of the current WhatsApp onboarding and connection flow before PRD 32 (Project Strict Ownership) implementation.

---

## Table of Contents

1. [Overview](#overview)
2. [Entry Point: Onboarding Initiation](#entry-point-onboarding-initiation)
3. [Onboarding Session Structure](#onboarding-session-structure)
4. [OAuth Flow with Meta](#oauth-flow-with-meta)
5. [Callback Handler Flow](#callback-handler-flow)
6. [Data Persistence](#data-persistence)
7. [Multi-Number Scenario](#multi-number-scenario)
8. [Current Limitations](#current-limitations)
9. [Architecture Summary](#architecture-summary)

---

## Overview

The WhatsApp onboarding flow enables organizations to connect their Meta (Facebook) WhatsApp Business Accounts (WABAs) to WhaTrack. The process follows a standard OAuth 2.0 pattern with Meta Cloud API.

**Key participants:**
- User's browser (initiates onboarding)
- WhaTrack application (backend & frontend)
- Meta OAuth server (`https://www.facebook.com/dialog/oauth`)
- Meta Cloud API (retrieves WABA and phone number data)

**Authentication requirement:** User must have `manage:whatsapp` permission in the organization.

---

## Entry Point: Onboarding Initiation

### Endpoint: `GET /api/v1/whatsapp/onboarding`

**Request:**
```
GET /api/v1/whatsapp/onboarding?organizationId=<org-uuid>
```

**Authentication:**
- Validates user has `manage:whatsapp` permission
- Extracts `organizationId` from auth context
- Returns `401 Unauthorized` if permission denied

**Flow (from `src/app/api/v1/whatsapp/onboarding/route.ts`):**

1. Rate limit check applied
2. Permission validation: `validatePermissionAccess(request, 'manage:whatsapp')`
3. Call: `createWhatsAppOnboardingSession(organizationId, baseUrl)`
4. Return onboarding URL and tracking code

**Response (Success):**
```json
{
  "onboardingUrl": "https://www.facebook.com/dialog/oauth?client_id=...",
  "trackingCode": "c1234abcd...",
  "expiresIn": 86400
}
```

**Response (Error):**
```json
{
  "error": "Missing required env vars: NEXT_PUBLIC_META_APP_ID, NEXT_PUBLIC_META_CONFIG_ID, APP_URL"
}
```

**Frontend integration:**
- User clicks "Connect WhatsApp" button
- Opens onboarding URL in a new popup window
- URL points to Meta's OAuth dialog with WhaTrack as the OAuth client

---

## Onboarding Session Structure

### Database Table: `WhatsAppOnboarding`

Stores session metadata for each onboarding attempt.

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Unique session identifier |
| `organizationId` | UUID | Organization attempting to connect |
| `trackingCode` | String (unique) | OAuth state parameter - used to validate callback |
| `authorizationCode` | String? | Authorization code from Meta (populated at callback) |
| `status` | String (enum) | One of: `pending`, `completed`, `failed`, `expired` |
| `initiatedAt` | DateTime | When session was created |
| `authorizedAt` | DateTime? | When user completed OAuth authorization |
| `completedAt` | DateTime? | When all phone numbers were imported |
| `expiresAt` | DateTime | 24 hours from creation (hard deadline) |
| `wabaId` | String? | Primary WABA ID (if successful) |
| `ownerBusinessId` | String? | Meta business ID owning the WABA |
| `phoneNumberId` | String? | Deprecated/unused field |
| `errorMessage` | String? | Human-readable error description |
| `errorCode` | String? | Error code from Meta (e.g., "invalid_client") |
| `createdAt` | DateTime | Record creation timestamp |
| `updatedAt` | DateTime | Last modification timestamp |

**Key constraint:** `trackingCode` is unique across all onboarding sessions.

**Indexes:**
- `organizationId` - for listing all sessions of an organization

---

## OAuth Flow with Meta

### Session Creation (from `createWhatsAppOnboardingSession`)

**Step 1: Database Insert**
```typescript
await prisma.whatsAppOnboarding.create({
  data: {
    organizationId,
    trackingCode,      // CUID2 generated
    expiresAt,         // Now + 24 hours
    status: 'pending',
  },
})
```

**Step 2: OAuth URL Construction**

Meta OAuth URL is built with these parameters:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `client_id` | `NEXT_PUBLIC_META_APP_ID` | WhaTrack's registered Meta app ID |
| `redirect_uri` | `${baseUrl}/api/v1/whatsapp/onboarding/callback` | Where Meta sends the callback |
| `state` | `trackingCode` | Security token to prevent CSRF attacks |
| `scope` | `whatsapp_business_management,business_management` | Permissions being requested |
| `response_type` | `code` | OAuth 2.0 authorization code grant |
| `config_id` | `NEXT_PUBLIC_META_CONFIG_ID` | Meta config for WhaTrack integration |

**Complete URL structure:**
```
https://www.facebook.com/dialog/oauth?
  client_id={NEXT_PUBLIC_META_APP_ID}
  &redirect_uri={APP_URL}/api/v1/whatsapp/onboarding/callback
  &state={trackingCode}
  &scope=whatsapp_business_management,business_management
  &response_type=code
  &config_id={NEXT_PUBLIC_META_CONFIG_ID}
```

### User Authorization

1. Meta redirects user to their login/authorization page
2. User is shown what permissions WhaTrack is requesting
3. User clicks "Authorize" or denies the request
4. Meta redirects to callback endpoint with either:
   - **Success:** `?code=...&state=trackingCode`
   - **Error:** `?error=access_denied&error_description=...&state=trackingCode`

---

## Callback Handler Flow

### Endpoint: `GET /api/v1/whatsapp/onboarding/callback`

**No authentication required** - This is the redirect target from Meta, not a user-initiated request.

**Handler flow (from `src/app/api/v1/whatsapp/onboarding/callback/route.ts`):**

1. Extract query parameters:
   - `code` - OAuth authorization code
   - `state` - Tracking code for validation
   - `error` - Error code if authorization failed
   - `error_description` - Human-readable error message

2. Call: `handleWhatsAppOnboardingCallback(input, baseUrl)`

3. Return HTML response with:
   - localStorage storage of status
   - PostMessage to parent window (if opened as popup)
   - Auto-redirect to `/dashboard/settings/integrations?tab=whatsapp`

**Handler Implementation (from `handleWhatsAppOnboardingCallback`):**

### Phase 1: Error Handling

```typescript
if (input.error) {
  // Mark onboarding as failed
  await prisma.whatsAppOnboarding.updateMany({
    where: { trackingCode: input.state },
    data: {
      status: 'failed',
      errorMessage: `${input.error}: ${input.errorDescription}`,
      errorCode: input.error,
    },
  })
  return { success: false, message }
}
```

**Common Meta errors:**
- `access_denied` - User declined authorization
- `invalid_scope` - Requested scopes not available
- `invalid_client` - App configuration issue

### Phase 2: Validation

```typescript
if (!input.code || !input.state) {
  return { success: false, message: 'Missing code or state in callback' }
}
```

**Verify tracking code exists:**
```typescript
const onboarding = await prisma.whatsAppOnboarding.findUnique({
  where: { trackingCode: input.state },
})

if (!onboarding) {
  return { success: false, message: 'Invalid or expired tracking code' }
}
```

**Check expiration:**
```typescript
if (onboarding.expiresAt < new Date()) {
  await prisma.whatsAppOnboarding.update({
    where: { id: onboarding.id },
    data: { status: 'expired' },
  })
  return { success: false, message: 'Tracking code expired' }
}
```

### Phase 3: OAuth Token Exchange

```typescript
const tokenData = await MetaCloudService.exchangeCodeForToken(input.code, redirectUri)
const accessToken = tokenData.access_token
```

**Purpose:** Exchange short-lived authorization code for long-lived access token.

**Failure handling:** If token exchange fails, mark onboarding as failed and return error.

### Phase 4: Fetch WABAs

```typescript
const wabas = await MetaCloudService.listWabas(accessToken)
```

**What are WABAs?** WhatsApp Business Accounts - the organizational unit in Meta for WhatsApp business features.

**Response format:**
```typescript
Array<{
  wabaId: string         // Meta's unique identifier
  wabaName: string       // Display name of the account
  businessId: string     // Associated Meta business ID
}>
```

**Failure handling:** If no WABAs found, mark as failed with message.

### Phase 5: Create/Update Connection Records

For each WABA, a `WhatsAppConnection` record is created or updated:

```typescript
const connection = await prisma.whatsAppConnection.upsert({
  where: {
    organizationId_wabaId: {
      organizationId: onboarding.organizationId,
      wabaId: waba.wabaId,
    },
  },
  create: {
    organizationId: onboarding.organizationId,
    wabaId: waba.wabaId,
    ownerBusinessId: waba.businessId,
    status: 'active',
    connectedAt: new Date(),
    healthStatus: 'healthy',
  },
  update: {
    // Update existing connection if WABA was previously connected
    ownerBusinessId: waba.businessId,
    status: 'active',
    connectedAt: new Date(),
    healthStatus: 'healthy',
    disconnectedAt: null,
  },
})
```

**Key point:** Connection uses compound unique constraint `(organizationId, wabaId)` - ensures one connection per organization per WABA.

### Phase 6: Fetch Phone Numbers

```typescript
const phones = await MetaCloudService.listPhoneNumbers({
  wabaId: waba.wabaId,
  accessToken,
})
```

**Phone object structure:**
```typescript
{
  id: string                          // Phone ID from Meta
  display_phone_number?: string       // E.g., "+55 11 98765-4321"
  verified_name?: string              // Verified business name
  // ... other fields (quality_rating, status, etc.)
}
```

**Possible outcomes:**

#### No Phone Numbers Found
If phones array is empty:
1. Create a placeholder `WhatsAppConfig` record with status `pending`
2. Use `pending_{wabaId}` as phoneId
3. Display name: "Número em configuração" (Number being set up)
4. This allows UI to show "awaiting phone setup" state

#### Phone Numbers Found
For each actual phone number:
1. Create or update `WhatsAppConfig` record with status `connected`
2. Delete any placeholder pending configs for this WABA

### Phase 7: Create/Update Config Records

**For each phone number:**

```typescript
await prisma.whatsAppConfig.upsert({
  where: { phoneId: phone.id },
  create: {
    organizationId: onboarding.organizationId,
    connectionId: connection.id,
    wabaId: waba.wabaId,
    phoneId: phone.id,
    displayPhone: phone.display_phone_number,
    verifiedName: phone.verified_name,
    accessToken: encryptedToken,
    accessTokenEncrypted: true,
    status: 'connected',
    connectedAt: new Date(),
  },
  update: {
    // Update existing config
    organizationId: onboarding.organizationId,
    connectionId: connection.id,
    displayPhone: phone.display_phone_number,
    verifiedName: phone.verified_name,
    accessToken: encryptedToken,
    accessTokenEncrypted: true,
    status: 'connected',
    connectedAt: new Date(),
    disconnectedAt: null,
  },
})
```

**Important:** Access token is encrypted before storage using `encryption.encrypt()`.

### Phase 8: Subscribe to Webhooks

```typescript
try {
  await MetaCloudService.subscribeToWaba(waba.wabaId, accessToken)
} catch {
  // non-blocking - if subscription fails, continue
}
```

**Purpose:** Register WhaTrack to receive webhook events when messages arrive.

### Phase 9: Audit Logging

```typescript
await prisma.whatsAppAuditLog.create({
  data: {
    organizationId: onboarding.organizationId,
    connectionId: connection.id,
    action: 'ONBOARDING_COMPLETED',
    description: `WhatsApp connected: ${waba.wabaName} with ${phones.length} phone number(s)`,
    trackingCode: input.state,
    metadata: {
      wabaId: waba.wabaId,
      businessId: waba.businessId,
      phoneCount: phones.length,
    },
  },
})
```

Records the successful connection for audit trail.

### Phase 10: Mark Onboarding Complete

```typescript
await prisma.whatsAppOnboarding.update({
  where: { id: onboarding.id },
  data: {
    status: 'completed',
    completedAt: new Date(),
    wabaId: wabas[0]?.wabaId,
    ownerBusinessId: wabas[0]?.businessId,
  },
})
```

**Returns:** `{ success: true, totalPhones }`

---

## Data Persistence

### WhatsApp-Related Tables

Four main tables store WhatsApp connection state:

#### 1. `WhatsAppOnboarding`
**Purpose:** Session tracking for OAuth flow
**Lifecycle:** Created at step 1, updated at callback (mark success/fail)
**Retention:** Indefinite (audit trail)
**Organization scope:** Yes (`organizationId`)
**Project scope:** No - sessions are organization-wide

#### 2. `WhatsAppConnection`
**Purpose:** Represents a WABA connected to the organization
**Lifecycle:** Created at first successful callback for a WABA, updated on subsequent connections
**Status flow:** `pending` → `active` (on successful connection) → `disconnected` (if deleted)
**Retention:** Indefinite
**Organization scope:** Yes - unique per `(organizationId, wabaId)`
**Project scope:** No - connections are organization-wide
**Data stored:**
- WABA identifier (`wabaId`)
- Meta business ID (`ownerBusinessId`)
- Health status (from periodic checks)
- Connection timestamps

#### 3. `WhatsAppConfig`
**Purpose:** Represents a phone number instance within a WABA
**Lifecycle:** Created at callback for each phone, updated when phone details change
**Status flow:** `pending` (awaiting phone setup) → `connected` (phone active) → `disconnected` (if deleted)
**Retention:** Indefinite
**Organization scope:** Yes - all configs belong to org (`organizationId`)
**Project scope:** Yes - **may be assigned to a specific project** (`projectId`)
**Data stored:**
- Phone identifier from Meta (`phoneId`)
- Display phone number (`displayPhone`)
- Verified business name (`verifiedName`)
- Access token (encrypted)
- Token health status (`tokenStatus`, `tokenExpiresAt`, `tokenLastCheckedAt`)
- History sync state (for message history migration)

#### 4. `WhatsAppAuditLog`
**Purpose:** Immutable audit trail of all WhatsApp actions
**Lifecycle:** Records created for each significant action (onboarding, connect, disconnect, etc.)
**Status:** Immutable
**Organization scope:** Yes - logs are per organization
**Project scope:** Possible via `connectionId` foreign key
**Data stored:**
- Action type (`ONBOARDING_COMPLETED`, `WEBHOOK_RECEIVED`, etc.)
- Description
- Associated metadata
- Connection/organization context

---

## Multi-Number Scenario

### How Multiple Phone Numbers in Same WABA Are Handled

**Scenario:** A business adds multiple phone numbers to the same WhatsApp Business Account.

**Current behavior (from Phase 6 in callback):**

1. **First onboarding:** User connects a WABA that has 2 phone numbers
   - `WhatsAppConnection` created (1 per WABA)
   - 2x `WhatsAppConfig` records created (1 per phone)
   - Both configs have same `connectionId` and `wabaId`
   - Both share same `accessToken` (WABA-level token, not phone-specific)

2. **Data structure:**
   ```
   Organization A
   ├── WhatsAppConnection (WABA: waba_123)
   │   ├── WhatsAppConfig (Phone: +55-11-98765-4321)
   │   └── WhatsAppConfig (Phone: +55-11-99999-8888)
   ```

3. **Accessing configs by phone:**
   - Query by `phoneId` (unique constraint) - returns specific phone config
   - Query by `connectionId` - returns all phones in that WABA
   - Query by `wabaId` - returns all phones in that WABA (less direct, via join)

### How Multiple Phone Numbers Are Handled in Subsequent Onboardings

**Scenario:** Same user re-connects the same WABA (e.g., token refresh or retry)

**Current behavior:**

1. **Second onboarding attempt:**
   - `WhatsAppConnection.upsert()` with `organizationId_wabaId` key
   - Existing connection is updated (status reset to `active`)
   - Fetch fresh list of phone numbers from Meta

2. **Phone reconciliation:**
   ```typescript
   // Delete any pending placeholder configs
   await prisma.whatsAppConfig.deleteMany({
     where: {
       organizationId: onboarding.organizationId,
       wabaId: waba.wabaId,
       phoneId: buildPendingPhoneId(waba.wabaId),
     },
   })

   // Upsert actual phone configs
   for (const phone of phones) {
     await prisma.whatsAppConfig.upsert({ ... })
   }
   ```

3. **Result:**
   - Existing phone configs are updated with fresh data (displayPhone, verifiedName)
   - New phones (added to WABA since last connection) get new configs
   - Removed phones retain their configs (marked as disconnected by separate process)

### How Multiple Projects Share Same Phone Number

**Current limitation:** A `WhatsAppConfig` can only be assigned to one `projectId` at a time.

**Assignment flow:**
1. After onboarding, all phone configs have `projectId = null`
2. Admin manually assigns each phone to a project via `/api/v1/whatsapp/config` endpoint
3. Function: `assignWhatsAppConfigProject()` sets the `projectId`
4. Only conversations from that phone are associated with that project

**Multi-number same-project scenario:**
- Both phone1 and phone2 assigned to Project A
- Messages from either number are tagged with Project A
- UI can filter conversations by phone or by project

**Cross-project scenario:**
- phone1 assigned to Project A
- phone2 assigned to Project B
- Conversations are segregated by project

---

## Current Limitations

### 1. No ProjectId in Onboarding Session

**Current state:**
- `WhatsAppOnboarding` has no `projectId` field
- Onboarding is organization-level only
- All connected phones start with `projectId = null`
- Project assignment happens as a separate step (manual or automated)

**Impact:** Cannot scope onboarding to a specific project; users must connect at org level then assign.

### 2. No ProjectId in Connection Records

**Current state:**
- `WhatsAppConnection` has no `projectId` field
- Connections represent the WABA at organization level
- Project scoping only at config level (individual phone numbers)

**Impact:** Cannot prevent a user from accessing a WABA they shouldn't have project access to.

**Example:**
- User A has access to Project A only
- WABA has 2 phone numbers: phone1 (assigned to Project A), phone2 (assigned to Project B)
- User A can see phone1's config and read its audit logs
- Current system doesn't block access to phone2 at the connection level

### 3. Multi-Number Same-Project Scenario Not Optimized

**Current state:**
- Each phone number in same WABA gets separate `WhatsAppConfig` record
- No de-duplication of shared data (accessToken, connection metadata)
- At query time, no built-in way to say "all phones in project A from same WABA"

**Impact:** Slightly higher storage and slight complexity in multi-phone queries.

### 4. Access Control at API Level Only

**Current state:**
- Authorization checks happen at route handlers
- No database-level constraints enforce project access
- Service layer doesn't automatically filter by project

**Example vulnerability:**
- If project ID check is missed in one route, data leaks across projects
- No referential integrity to prevent config assignment to inaccessible project

### 5. Token Sharing Across Multiple Phones in Same WABA

**Current state:**
- All phone configs in same WABA share same `accessToken`
- If token is revoked/refreshed, must update all phone configs
- No per-phone token management

**Impact:** Cannot granularly revoke per-phone tokens; must revoke entire WABA token.

### 6. No Phone-Level Configuration

**Current state:**
- Phone-specific settings (e.g., auto-response templates) stored in `WhatsAppConfig`
- No separate phone configuration model
- All webhooks go to single endpoint for entire organization

**Impact:** Difficult to set phone-specific behavior without changes.

---

## Architecture Summary

### High-Level Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│ Frontend: /dashboard/settings/integrations                       │
│ User clicks "Connect WhatsApp"                                   │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ GET /api/v1/whatsapp/ │
         │ onboarding            │
         │ (Auth + Permission)   │
         └────────────┬──────────┘
                      │
                      ▼
      ┌────────────────────────────────────┐
      │ createWhatsAppOnboardingSession()   │
      │ - Create session in DB             │
      │ - Build OAuth URL                  │
      ├────────────────────────────────────┤
      │ Returns: onboardingUrl, tracking   │
      │ Code, expiresIn                    │
      └────────────┬───────────────────────┘
                   │
                   ▼
      ┌──────────────────────────────────┐
      │ Open popup to onboardingUrl       │
      │ (Meta OAuth dialog)               │
      └────────────┬─────────────────────┘
                   │
                   ▼
       ┌───────────────────────────┐
       │ User authorizes WhaTrack  │
       │ in Meta/Facebook          │
       └────────────┬──────────────┘
                    │
                    ▼
      ┌──────────────────────────────────┐
      │ GET /api/v1/whatsapp/onboarding/ │
      │ callback                         │
      │ ?code=...&state=trackingCode     │
      └────────────┬─────────────────────┘
                   │
                   ▼
      ┌──────────────────────────────────┐
      │ handleWhatsAppOnboardingCallback()│
      ├──────────────────────────────────┤
      │ 1. Validate tracking code        │
      │ 2. Exchange code for token       │
      │ 3. Fetch WABAs                   │
      │ 4. For each WABA:                │
      │    - Create/update Connection    │
      │    - Fetch phone numbers         │
      │    - Create/update Configs       │
      │    - Subscribe to webhooks       │
      │ 5. Create audit log              │
      │ 6. Mark onboarding complete      │
      └────────────┬─────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────┐
    │ Return HTML response with        │
    │ localStorage + postMessage +     │
    │ redirect to dashboard            │
    └─────────────────────────────────┘
```

### Data Model Relationships

```
Organization (1)
    ▼
    └─── WhatsAppOnboarding (many) - Session records
    └─── WhatsAppConnection (many) - WABAs - unique(org, waba)
         └─── WhatsAppConfig (many) - Phone numbers
              └─── Conversation (many) - Messages
    └─── WhatsAppAuditLog (many) - Action audit trail
```

### Authorization & Scope

**Organization-level operations:**
- Create onboarding session
- View all connections and phone configs
- Manage all phone assignments
- **Check:** `manage:whatsapp` permission

**Project-level operations:**
- View phone configs assigned to a project
- Create conversations for a project
- Access messages in a project
- **Check:** Project membership + config assignment

---

## Related Files

### API Routes
- `/src/app/api/v1/whatsapp/onboarding/route.ts` - Session creation
- `/src/app/api/v1/whatsapp/onboarding/callback/route.ts` - OAuth callback handler
- `/src/app/api/v1/whatsapp/config/route.ts` - Manage phone configs
- `/src/app/api/v1/whatsapp/disconnect/route.ts` - Disconnect phone/WABA
- `/src/app/api/v1/whatsapp/phone-numbers/route.ts` - List available phones

### Services
- `src/services/whatsapp/whatsapp-onboarding.service.ts` - Onboarding logic
- `src/services/whatsapp/whatsapp-config.service.ts` - Config management
- `src/services/whatsapp/meta-cloud.service.ts` - Meta API communication

### Database Schema
- `prisma/schema.prisma` - Models: WhatsAppOnboarding, WhatsAppConnection, WhatsAppConfig, WhatsAppAuditLog

### Environment Variables
- `NEXT_PUBLIC_META_APP_ID` - Meta OAuth app ID
- `NEXT_PUBLIC_META_CONFIG_ID` - Meta config ID for WhaTrack
- `NEXT_PUBLIC_META_APP_SECRET` - Meta OAuth app secret (backend only)
- `APP_URL` - Public URL for redirect URI

