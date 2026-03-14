# PRD 32: Baseline Meta Ads OAuth Connection Flow

**Document Purpose**: Document the current (baseline) Meta Ads OAuth connection flow to establish the foundation for PRD 32 - Project Strict Ownership Implementation.

**Status**: Baseline (current implementation as of 2026-03-14)

---

## Flow Overview

The Meta Ads connection process is a two-stage OAuth flow that connects a Facebook user's ad accounts to a WhaTrack organization. The flow captures the organizational context in an OAuth state token and uses it to associate all connected accounts with the organization.

### Key Actors
- **User**: Authenticated WhaTrack user initiating the connection
- **Organization**: WhaTrack organization context for the user
- **Meta/Facebook**: OAuth provider
- **WhaTrack Backend**: Handles state management and persistence

---

## Stage 1: Initiate Connection

### Entry Point: `GET /api/v1/meta-ads/connect`

**Request**:
```
GET /api/v1/meta-ads/connect?organizationId={organizationId}
```

**Authorization**:
- Must have authenticated session with valid `organizationId` and `userId`
- Uses `validateFullAccess()` guard to ensure user has full access to the organization

**Request Validation**:
1. Extract `organizationId` and `userId` from authenticated session
2. Verify both values are present (return 401 if missing)
3. Verify `META_ADS_APP_ID` environment variable is configured (return 500 if missing)

**State Creation**:
1. Create OAuth state token via `createMetaOAuthState()`:
   - Generate random UUID as state token
   - Store in Redis with 10-minute TTL (600 seconds)
   - Payload: `{ organizationId, userId }`
   - State key format: `oauth_state:{stateToken}`

**Authorization URL Building**:
1. Build Meta OAuth authorization URL via `buildMetaAdsAuthorizeUrl()`:
   - **Client ID**: `META_ADS_APP_ID` environment variable
   - **Redirect URI**: `{origin}/api/v1/meta-ads/callback` or `META_OAUTH_REDIRECT_URI` env var
   - **Scopes**: `ads_read,ads_management,public_profile`
   - **State**: The state token generated above
   - **Response Type**: `code`
   - Base URL: `https://www.facebook.com/v25.0/dialog/oauth`

**Response**:
- HTTP 302 redirect to Meta's OAuth authorization dialog
- User authenticates with Facebook and authorizes WhaTrack to access their ad accounts

### OAuth State Structure

```json
{
  "organizationId": "uuid-of-organization",
  "userId": "uuid-of-user"
}
```

**Important Limitations (Current)**:
- ❌ No `projectId` in state
- ❌ Cannot target specific project during OAuth flow
- ⚠️ All connected accounts will be unassigned to projects (default `projectId = null`)
- ⚠️ User must manually assign accounts to projects post-connection via dashboard

---

## Stage 2: OAuth Callback & Account Sync

### Entry Point: `GET /api/v1/meta-ads/callback`

**Query Parameters**:
- `code`: Authorization code from Meta (required)
- `state`: OAuth state token (required)

**Validation**:
1. Verify both `code` and `state` are present
2. If either is missing, redirect to `/dashboard/settings/meta-ads?error=meta_auth_failed`

### Callback Processing: `completeMetaAdsOAuthCallback()`

The callback orchestrates the complete account synchronization flow:

#### Step 1: Retrieve State Data
- Call `consumeMetaOAuthState(stateToken)`:
  - Look up state in Redis using key `oauth_state:{stateToken}`
  - Delete state key from Redis (one-time use)
  - Return parsed payload: `{ organizationId, userId }`
  - Return `null` if not found or parsing fails
- If state is invalid/missing:
  - Return failure with reason `meta_auth_invalid_state`
  - Callback route redirects to `/dashboard/settings/meta-ads?error=meta_auth_invalid_state`

#### Step 2: Exchange Code for Tokens
- Call `metaAccessTokenService.getShortLivedToken(code, redirectUri)`:
  - Make request to `https://graph.facebook.com/{META_API_VERSION}/oauth/access_token`
  - Parameters:
    - `client_id`: `META_ADS_APP_ID`
    - `client_secret`: `META_ADS_APP_SECRET`
    - `redirect_uri`: Must match the original request's redirect URI
    - `code`: Authorization code from Meta
  - Extract `access_token` from response (short-lived, expires in ~2 hours)

#### Step 3: Create or Update Meta Connection
- Call `metaAccessTokenService.upsertConnection(organizationId, shortLivedToken)`:

  **Token Validation**:
  - Call `debugToken(shortLivedToken)` to verify token validity and scopes
  - Throw error if `is_valid: false`

  **Get User Information**:
  - Call `getUserInfo(accessToken)`:
    - Request to `https://graph.facebook.com/{META_API_VERSION}/me`
    - Fields: `id,name`
    - Extract `id` (fbUserId) and `name` (fbUserName)

  **Exchange for Long-Lived Token**:
  - Call `getLongLivedToken(shortLivedToken)`:
    - Request to `https://graph.facebook.com/{META_API_VERSION}/oauth/access_token`
    - Parameters:
      - `grant_type`: `fb_exchange_token`
      - `client_id`: `META_ADS_APP_ID`
      - `client_secret`: `META_ADS_APP_SECRET`
      - `fb_exchange_token`: Short-lived token
    - Extract `access_token` (long-lived) and `expires_in` (seconds)
    - Calculate `tokenExpiresAt`: Default to 60 days if `expires_in` not provided, otherwise use provided duration

  **Encrypt & Persist Connection**:
  - Encrypt long-lived token using `encryption.encrypt()`
  - Upsert into `metaConnection` table:
    - **Unique Key**: `(organizationId, fbUserId)`
    - **On Create**:
      - `organizationId`: From OAuth state
      - `fbUserId`: User's Facebook ID
      - `fbUserName`: User's Facebook name
      - `accessToken`: Encrypted long-lived token
      - `tokenExpiresAt`: Token expiration date
      - `status`: `ACTIVE`
    - **On Update** (existing user reconnecting):
      - Update `fbUserName`, `accessToken`, `tokenExpiresAt`, `status`, `updatedAt`

#### Step 4: Synchronize Ad Accounts
- Call `metaAdAccountService.syncAdAccounts(connectionId)`:

  **Fetch Available Accounts**:
  - Retrieve decrypted token via `metaAccessTokenService.getDecryptedToken(connectionId)`
  - Request to `https://graph.facebook.com/{META_API_VERSION}/me/adaccounts`
  - Parameters:
    - `access_token`: Decrypted connection token
    - `fields`: `id,name,account_status`
    - `limit`: 100
  - Extract array of accounts: `[{ id, name, account_status }, ...]`

  **Upsert Accounts**:
  - For each account from Meta:
    - Upsert into `metaAdAccount` table
    - **Unique Key**: `(organizationId, adAccountId)`
    - **On Create**:
      - `organizationId`: From OAuth state
      - `connectionId`: From upserted connection
      - `adAccountId`: Account ID from Meta
      - `adAccountName`: Account name from Meta
      - `isActive`: `false` (default inactive)
      - `projectId`: `null` (unassigned)
    - **On Update** (existing account):
      - Update `adAccountName` and `connectionId`
  - Return all synced accounts for the connection

#### Step 5: Audit Logging
- Log audit event via `auditService.log()`:
  - `action`: `meta_ads.connected`
  - `resourceType`: `meta_connection`
  - `resourceId`: Connection ID
  - `organizationId`: From OAuth state
  - `userId`: From OAuth state
  - `after`: `{ fbUserId, fbUserName }`

### Response on Success

**Route Handler Response**:
- Return HTML document that attempts to close the OAuth popup window
- Fallback behavior:
  - Try to post message to window opener: `{ type: 'meta-ads-oauth-success' }`
  - Close popup if opener exists
  - Redirect to `/dashboard/settings/meta-ads?status=success` as fallback

### Error Handling

| Error Condition | Reason Code | Redirect |
|---|---|---|
| Missing code or state parameter | N/A | `/dashboard/settings/meta-ads?error=meta_auth_failed` |
| OAuth state token not found or expired | `meta_auth_invalid_state` | `/dashboard/settings/meta-ads?error=meta_auth_invalid_state` |
| Token exchange fails, account sync fails, or audit logging fails | `meta_callback_error` | `/dashboard/settings/meta-ads?error=meta_callback_error` |

---

## Data Persistence

### MetaConnection Table
Represents a Facebook user's connection to a WhaTrack organization.

```
id: UUID (primary key)
organizationId: UUID (foreign key, part of unique constraint)
fbUserId: String (Facebook User ID, part of unique constraint)
fbUserName: String (Facebook user's display name)
accessToken: String (encrypted long-lived access token)
tokenExpiresAt: Date (when token expires)
status: ENUM ['ACTIVE', 'INACTIVE'] (connection status)
createdAt: Date
updatedAt: Date

Unique Constraint: (organizationId, fbUserId)
```

### MetaAdAccount Table
Represents a Meta Ads account available to an organization.

```
id: UUID (primary key)
organizationId: UUID (foreign key)
connectionId: UUID (foreign key to MetaConnection)
adAccountId: String (Meta Ads account ID, part of unique constraint)
adAccountName: String (Ads account display name)
isActive: Boolean (whether tracking is enabled)
projectId: UUID | null (foreign key to Project, nullable)
createdAt: Date
updatedAt: Date

Unique Constraint: (organizationId, adAccountId)
Foreign Key: connectionId -> MetaConnection.id
Foreign Key: organizationId -> Organization.id
Foreign Key: projectId -> Project.id (nullable)
```

---

## Current Limitations (Target for PRD 32)

### 1. No Project Context in OAuth State
**Current**: OAuth state only contains `{ organizationId, userId }`
**Impact**: All newly synced accounts are created with `projectId = null`
**Workaround**: User must manually assign accounts to projects after connection

### 2. No Project Assignment During Connection
**Current**: Accounts are created inactive and unassigned
**Impact**: Multi-step process: Connect → Sync accounts → Assign to project → Enable tracking
**Desired**: Support optional `projectId` parameter to pre-assign during connection

### 3. No Validation of Project Ownership
**Current**: Account assignment to project happens post-connection
**Impact**: No early validation that user's project can claim this account
**Desired**: Validate ownership before or during sync

### 4. Single Connection per Organization per User
**Current**: Unique constraint is `(organizationId, fbUserId)`
**Impact**: Cannot maintain separate connections for the same Facebook user across org/projects
**Concern**: May be intentional to prevent duplicate API calls and data consistency

---

## Environment Variables Required

```
META_ADS_APP_ID: Meta app ID for OAuth client
META_ADS_APP_SECRET: Meta app secret for token exchange
META_API_VERSION: Meta Graph API version (e.g., "v25.0")
META_OAUTH_REDIRECT_URI: Optional override for callback URL (defaults to {origin}/api/v1/meta-ads/callback)
APP_URL: Base app URL (used as fallback in token exchange)
```

---

## Configuration & Behavior Constants

| Setting | Value | Purpose |
|---|---|---|
| OAuth State TTL | 600 seconds (10 minutes) | Prevent replay attacks, allow user time to complete auth |
| Meta Graph API Version | v25.0 | Consistent Meta API endpoint |
| Long-Lived Token Default Expiry | 60 days | Default if Meta doesn't provide `expires_in` |
| Ad Account Default State | `isActive: false, projectId: null` | Explicit opt-in required |
| Account Sync Limit | 100 accounts per request | Pagination handled by Meta API |

---

## Integration Points with Other Systems

### Audit Service
- Logs connection events for compliance and troubleshooting
- Action: `meta_ads.connected` (on success) or implicit failure if not logged

### Billing & Subscription
- Not called during OAuth flow
- Called later when accounts are assigned via `assertMetaAdAccountAllowedForProject()`

### Encryption Service
- Used to encrypt long-lived access tokens before storage
- Tokens decrypted on-demand when making Meta API requests

### Redis
- Stores OAuth state tokens with short TTL
- Prevents state reuse attacks and manages flow timeout

---

## Sequence Diagram

```
User                  WhaTrack              Redis              Meta OAuth           Meta Graph API
 |                        |                  |                   |                      |
 |-- GET /connect ------→ |                  |                   |                      |
 |                        |-- createState --→|                  |                      |
 |                        |------ stateToken----------→ Redirect to Meta OAuth Dialog |
 |                        |                  |                   |                      |
 |                        |                  |              (User authenticates)        |
 |                        |                  |          (User authorizes WhaTrack)     |
 |                        |←-- Redirect with code & state -------|                      |
 |                        |                  |                   |                      |
 |-- GET /callback -----→ |                  |                   |                      |
 |    (code, state)       |-- consumeState --→|                  |                      |
 |                        |←-- {org, user} --|                  |                      |
 |                        |                  |                   |-- Exchange Code ---→|
 |                        |                  |                   |←-- accessToken ----|
 |                        |-- debugToken -----┼---────────────────────────────────→|
 |                        |←--- is_valid --------────────────────────────────────--|
 |                        |-- getUserInfo ----┼───────────────────────────────────→|
 |                        |←--- {id, name} ----────────────────────────────────--|
 |                        |-- getLongLived ---┼───────────────────────────────────→|
 |                        |←--- longToken -----────────────────────────────────--|
 |                        |-- upsertConnection      |                      |
 |                        |    (encrypted)         |                      |
 |                        |-- syncAdAccounts ------┼─────────────────────→|
 |                        |←---- accounts ------────────────────────────--|
 |                        |-- auditLog             |                      |
 |                        |-- Response HTML ---→|                  |                      |
 |←- Close popup + Redirect to dashboard -|                  |                      |
```

---

## File References

- **Routes**:
  - `src/app/api/v1/meta-ads/connect/route.ts` - OAuth initiation
  - `src/app/api/v1/meta-ads/callback/route.ts` - OAuth callback handler

- **Services**:
  - `src/services/meta-ads/meta-oauth-state.service.ts` - State token management
  - `src/services/meta-ads/meta-oauth.service.ts` - OAuth orchestration
  - `src/services/meta-ads/access-token.service.ts` - Token exchange and persistence
  - `src/services/meta-ads/ad-account.service.ts` - Account synchronization
  - `src/services/meta-ads/meta-connection.service.ts` - Connection CRUD operations

---

## Notes for PRD 32 Implementation

This baseline documents the current behavior without `projectId` support. PRD 32 will need to:

1. **Extend OAuth State**: Add optional `projectId` parameter to state token
2. **Validate Ownership**: Check project-account relationship before persistence
3. **Update Persistence**: Support `projectId` assignment at account creation time
4. **Update UI**: Allow project selection in OAuth initiation dialog
5. **Backward Compatibility**: Handle existing connections and accounts without `projectId`

All current tests and flows should continue to work with these enhancements.
