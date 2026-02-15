# WhatsApp Embedded Signup — Onboarding Spec

> **Version:** 1.0  
> **Last Updated:** 2026-02-13  
> **API Version:** Meta Graph API v24.0  
> **Reference:** [Meta Embedded Signup Documentation](https://developers.facebook.com/docs/whatsapp/embedded-signup)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Flow Diagram](#3-flow-diagram)
4. [Frontend Implementation](#4-frontend-implementation)
5. [Backend Implementation](#5-backend-implementation)
6. [Meta API Integration](#6-meta-api-integration)
7. [Database Schema](#7-database-schema)
8. [Environment Variables](#8-environment-variables)
9. [Security Considerations](#9-security-considerations)
10. [Error Handling](#10-error-handling)
11. [Compliance Checklist](#11-compliance-checklist)
12. [Known Limitations & Risks](#12-known-limitations--risks)
13. [Future Improvements](#13-future-improvements)

---

## 1. Overview

### What is Embedded Signup?

Meta's **Embedded Signup** allows businesses to onboard to the WhatsApp Business Platform directly within a partner's (our) application. Instead of redirecting users to a separate Meta page, the signup flow is embedded as a popup/dialog.

### Our Implementation

We use the **Embedded Signup v3** flow with the following characteristics:

| Aspect | Choice |
|--------|--------|
| Signup type | Embedded Signup (popup) |
| Auth method | OAuth 2.0 Authorization Code flow |
| Token exchange | Server-side (secure) |
| Webhook subscription | Automatic on successful connection |
| Multi-instance | Supported (per organization) |

### Key Files

| File | Purpose |
|------|---------|
| `src/hooks/whatsapp/use-whatsapp-onboarding.ts` | React hook managing onboarding state and Meta popup |
| `src/components/whatsapp/embedded-signup-button.tsx` | UI component for the connect button |
| `src/app/dashboard/settings/whatsapp/page.tsx` | Settings page handling OAuth callback |
| `src/app/api/v1/whatsapp/claim-waba/route.ts` | Server endpoint for token exchange & WABA claim |
| `src/app/api/v1/whatsapp/check-connection/route.ts` | Polling endpoint for connection status |
| `src/app/api/v1/whatsapp/phone-numbers/route.ts` | Lists phone numbers for connected WABAs |
| `src/app/api/v1/whatsapp/webhook/route.ts` | Webhook receiver for Meta events |
| `src/services/whatsapp/meta-cloud.service.ts` | Meta Cloud API service layer |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│                                                         │
│  ┌──────────────────┐    ┌───────────────────────────┐  │
│  │ EmbeddedSignup   │───▶│ useWhatsAppOnboarding     │  │
│  │ Button           │    │ (hook)                    │  │
│  └──────────────────┘    │                           │  │
│                          │ • Opens Meta popup        │  │
│  ┌──────────────────┐    │ • Listens postMessage     │  │
│  │ WhatsApp Settings│◀───│ • Polls check-connection  │  │
│  │ Page             │    │ • Manages status FSM      │  │
│  └──────────────────┘    └───────────────────────────┘  │
│         │                         │                     │
│         │ OAuth callback          │ WA_CALLBACK_DATA    │
│         │ (code + wabaId)         │ postMessage         │
│         ▼                         ▼                     │
├─────────────────────────────────────────────────────────┤
│                      BACKEND                            │
│                                                         │
│  ┌──────────────────┐    ┌───────────────────────────┐  │
│  │ /claim-waba      │───▶│ MetaCloudService          │  │
│  │ POST             │    │                           │  │
│  │ • Exchange code  │    │ • exchangeCodeForToken()  │  │
│  │ • Fetch phones   │    │ • listPhoneNumbers()      │  │
│  │ • Upsert config  │    │ • subscribeToWaba()       │  │
│  │ • Sub webhooks   │    │ • getConfig()             │  │
│  └──────────────────┘    └───────────────────────────┘  │
│                                                         │
│  ┌──────────────────┐    ┌───────────────────────────┐  │
│  │ /check-connection│    │ /webhook                  │  │
│  │ POST             │    │ GET (verify)              │  │
│  │ • Polls DB       │    │ POST (receive events)     │  │
│  └──────────────────┘    └───────────────────────────┘  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    DATABASE                             │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ WhatsAppConfig                                    │   │
│  │ • wabaId, phoneId, accessToken, status, etc.     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ WhatsAppWebhookLog                                │   │
│  │ • Audit trail of all webhook payloads            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Flow Diagram

### Happy Path — Step by Step

```
User                Frontend               Meta Popup            Backend               Meta API
 │                    │                       │                     │                     │
 │  Click "Connect"   │                       │                     │                     │
 │───────────────────▶│                       │                     │                     │
 │                    │  window.open()        │                     │                     │
 │                    │──────────────────────▶│                     │                     │
 │                    │  status='pending'     │                     │                     │
 │                    │                       │                     │                     │
 │                    │                       │  User completes     │                     │
 │                    │                       │  signup in Meta UI  │                     │
 │                    │                       │                     │                     │
 │                    │                       │  Redirect to        │                     │
 │                    │                       │  callback URL       │                     │
 │                    │                       │  ?code=XXX          │                     │
 │                    │                       │  &state=WABA_ID     │                     │
 │                    │                       │──────────────────▶  │                     │
 │                    │                       │                     │                     │
 │                    │  postMessage          │                     │                     │
 │                    │  WA_CALLBACK_DATA     │                     │                     │
 │                    │◀──────────────────────│                     │                     │
 │                    │                       │  window.close()     │                     │
 │                    │                       │                     │                     │
 │                    │  status='checking'    │                     │                     │
 │                    │                       │                     │                     │
 │                    │  POST /claim-waba     │                     │                     │
 │                    │  {code, wabaId}       │                     │                     │
 │                    │──────────────────────────────────────────▶  │                     │
 │                    │                       │                     │                     │
 │                    │                       │                     │  Exchange code      │
 │                    │                       │                     │  for token          │
 │                    │                       │                     │────────────────────▶│
 │                    │                       │                     │◀────────────────────│
 │                    │                       │                     │  access_token       │
 │                    │                       │                     │                     │
 │                    │                       │                     │  List phones        │
 │                    │                       │                     │────────────────────▶│
 │                    │                       │                     │◀────────────────────│
 │                    │                       │                     │  [{id, number}]     │
 │                    │                       │                     │                     │
 │                    │                       │                     │  Subscribe webhooks │
 │                    │                       │                     │────────────────────▶│
 │                    │                       │                     │◀────────────────────│
 │                    │                       │                     │                     │
 │                    │                       │                     │  Upsert DB config   │
 │                    │                       │                     │                     │
 │                    │  200 OK {success}     │                     │                     │
 │                    │◀──────────────────────────────────────────  │                     │
 │                    │  status='success'     │                     │                     │
 │                    │                       │                     │                     │
 │  "Connected!" UI   │                       │                     │                     │
 │◀───────────────────│                       │                     │                     │
```

### State Machine

The `useWhatsAppOnboarding` hook manages a finite state machine:

```
                    ┌───────────┐
          ┌────────▶│   idle    │◀─────────────────┐
          │         └─────┬─────┘                   │
          │               │ startOnboarding()       │ reset()
          │               ▼                         │
          │         ┌───────────┐                   │
          │         │  pending  │───────────────────┤
          │         └─────┬─────┘  popup closed     │
          │               │        without callback │
          │               │ WA_CALLBACK_DATA        │
          │               │ received                │
          │               ▼                         │
          │         ┌───────────┐                   │
          │         │ checking  │───────────────────┤
          │         └─────┬─────┘  claim-waba fails │
          │               │                         │
          │               │ claim-waba succeeds     │
          │               ▼                         │
          │         ┌───────────┐                   │
          └─────────│  success  │                   │
           (auto)   └───────────┘                   │
                                                    │
                    ┌───────────┐                   │
                    │   error   │───────────────────┘
                    └───────────┘
```

**States:**

| State | Description | UI |
|-------|-------------|-----|
| `idle` | No onboarding in progress | "Conectar com a Meta" button enabled |
| `pending` | Meta popup is open, waiting for user action | Button disabled, loading spinner |
| `checking` | Callback received, exchanging token server-side | "Verificando conexão..." text |
| `success` | WABA successfully claimed and configured | Success message, then auto-reset |
| `error` | Something failed | Error message with retry option |

---

## 4. Frontend Implementation

### 4.1 `useWhatsAppOnboarding` Hook

**File:** `src/hooks/whatsapp/use-whatsapp-onboarding.ts`

#### Responsibilities

1. **Construct Meta OAuth URL** with required parameters
2. **Open popup window** pointing to Meta's Embedded Signup
3. **Listen for `postMessage` events** from two sources:
   - `WA_EMBEDDED_SIGNUP` — from Meta's SDK (origin: `*.facebook.com`)
   - `WA_CALLBACK_DATA` — from our callback page (same origin)
4. **Call `/claim-waba`** when callback data is received
5. **Poll `/check-connection`** as a fallback if postMessage fails
6. **Manage state** via the FSM described above

#### Meta OAuth URL Construction

```
https://www.facebook.com/v24.0/dialog/oauth
  ?client_id={META_APP_ID}
  &redirect_uri={CALLBACK_URL}
  &state={RANDOM_STATE}
  &scope=whatsapp_business_management,whatsapp_business_messaging
  &response_type=code
  &config_id={META_CONFIG_ID}
```

**Critical Parameters:**

| Parameter | Source | Notes |
|-----------|--------|-------|
| `client_id` | `NEXT_PUBLIC_META_APP_ID` | Must match Meta App Dashboard |
| `redirect_uri` | Dynamically constructed | Must match Meta App "Valid OAuth Redirect URIs" |
| `config_id` | `NEXT_PUBLIC_META_CONFIG_ID` | Created in Meta Business Manager |
| `scope` | Hardcoded | `whatsapp_business_management,whatsapp_business_messaging` |
| `response_type` | Hardcoded | `code` (authorization code flow) |

#### postMessage Listener

The hook listens for two types of messages:

**1. `WA_EMBEDDED_SIGNUP` (from Meta)**

```typescript
// Origin check: event.origin must include 'facebook.com'
if (event.data?.type === 'WA_EMBEDDED_SIGNUP') {
  const { event: metaEvent, data } = event.data;
  
  switch (metaEvent) {
    case 'FINISH':
      // User completed signup — data contains WABA info
      break;
    case 'CANCEL':
      // User cancelled — reset state
      break;
    case 'ERROR':
      // Error in Meta's flow
      break;
  }
}
```

> **⚠️ Important:** The `WA_EMBEDDED_SIGNUP` postMessage is documented in Meta's v3 Embedded Signup docs. Per the documentation, when the user finishes the Embedded Signup flow, Meta sends a `postMessage` with `type: 'WA_EMBEDDED_SIGNUP'` and `event: 'FINISH'`. The data payload contains `phone_number_id` and `waba_id`.

**2. `WA_CALLBACK_DATA` (from our callback page)**

```typescript
// Origin check: event.origin must match window.location.origin
if (event.data?.type === 'WA_CALLBACK_DATA') {
  const { code, wabaId, status, error } = event.data;
  // Proceed to claim-waba with code and wabaId
}
```

#### Polling Fallback

If neither postMessage fires within a reasonable time (popup might be blocked, or user navigates away), the hook polls `/check-connection` every 3 seconds for up to 2 minutes:

```typescript
const POLL_INTERVAL = 3000;  // 3 seconds
const MAX_POLL_TIME = 120000; // 2 minutes
```

### 4.2 `EmbeddedSignupButton` Component

**File:** `src/components/whatsapp/embedded-signup-button.tsx`

A presentational component that:
- Renders a card with a "Conectar WhatsApp Business" button
- Delegates all logic to `useWhatsAppOnboarding`
- Shows different UI states based on the hook's `status`
- Displays error messages when `status === 'error'`

### 4.3 WhatsApp Settings Page

**File:** `src/app/dashboard/settings/whatsapp/page.tsx`

This page serves dual purposes:

1. **Settings view:** Displays connected phone numbers and configuration
2. **OAuth callback handler:** When Meta redirects back with `?code=XXX`, the page:
   - Detects it's running inside a popup (`window.opener` exists)
   - Posts `WA_CALLBACK_DATA` to the parent window
   - Closes itself
   - OR, if not in a popup, processes the callback directly

#### OAuth Callback Flow (in Settings Page)

```typescript
useEffect(() => {
  const code = searchParams.get('code');
  const wabaId = searchParams.get('state'); // We pass wabaId as state param
  const errorParam = searchParams.get('error');

  // If we're in a popup, relay data to parent
  if (window.opener && window.opener !== window && (code || errorParam)) {
    window.opener.postMessage({
      type: 'WA_CALLBACK_DATA',
      status: errorParam ? 'error' : 'success',
      code,
      wabaId,
      error: errorParam
    }, window.location.origin);
    window.close();
    return;
  }

  // If we're NOT in a popup (direct navigation), handle inline
  if (code && wabaId && !isClaiming) {
    // Call claim-waba directly
  }
}, [searchParams]);
```

---

## 5. Backend Implementation

### 5.1 `POST /api/v1/whatsapp/claim-waba`

**File:** `src/app/api/v1/whatsapp/claim-waba/route.ts`

#### Request

```json
{
  "wabaId": "123456789",
  "code": "AQD..."
}
```

#### Processing Steps

1. **Authenticate** — Verify session and get `organizationId`
2. **Exchange code for token** — `MetaCloudService.exchangeCodeForToken(code)`
   - POST to `https://graph.facebook.com/v24.0/oauth/access_token`
   - Body: `{ client_id, client_secret, code, redirect_uri }`
   - Returns: `{ access_token, token_type, expires_in }`
3. **List phone numbers** — `MetaCloudService.listPhoneNumbers({ wabaId, accessToken })`
   - GET `https://graph.facebook.com/v24.0/{wabaId}/phone_numbers`
   - Returns array of phone number objects
4. **Upsert config** — Create or update `WhatsAppConfig` in database
5. **Subscribe webhooks** — `MetaCloudService.subscribeToWaba(wabaId, token)`
   - POST `https://graph.facebook.com/v24.0/{wabaId}/subscribed_apps`
   - Enables receiving webhook events for this WABA

#### Response (Success)

```json
{
  "success": true,
  "config": {
    "wabaId": "123456789",
    "phoneId": "987654321",
    "phoneNumber": "+5511999999999",
    "status": "active"
  }
}
```

#### Response (Error)

```json
{
  "error": "Failed to exchange code for token",
  "details": "..."
}
```

### 5.2 `POST /api/v1/whatsapp/check-connection`

**File:** `src/app/api/v1/whatsapp/check-connection/route.ts`

#### Request

```json
{
  "after": "2026-02-13T10:00:00.000Z"  // optional, for polling
}
```

#### Logic

1. Authenticate and get `organizationId`
2. Query `WhatsAppConfig` via `MetaCloudService.getConfig(orgId)`
3. If config exists with `wabaId` AND `phoneId`:
   - If `after` timestamp provided: only return `connected: true` if `updatedAt > after`
   - Otherwise: return `connected: true`
4. If no config or incomplete: return `connected: false`

### 5.3 `GET /api/v1/whatsapp/phone-numbers`

**File:** `src/app/api/v1/whatsapp/phone-numbers/route.ts`

1. Authenticate and get `organizationId`
2. Fetch all `WhatsAppConfig` records for the organization
3. Extract unique WABA IDs
4. For each WABA, call `MetaCloudService.listPhoneNumbers()`
5. Deduplicate and return all phone numbers

### 5.4 Webhook Endpoint

**File:** `src/app/api/v1/whatsapp/webhook/route.ts`

| Method | Purpose |
|--------|---------|
| `GET` | Webhook verification (Meta sends `hub.mode`, `hub.verify_token`, `hub.challenge`) |
| `POST` | Receive and process webhook events |

#### Webhook Event Types Handled

| Event Type | Action |
|------------|--------|
| `messages` | Process incoming messages via `WhatsAppChatService` |
| `message echoes` | Track outbound message delivery |
| `statuses` | Update message delivery status (sent, delivered, read, failed) |
| `account_update` | Handle account-level changes |

---

## 6. Meta API Integration

### 6.1 `MetaCloudService`

**File:** `src/services/whatsapp/meta-cloud.service.ts`

This is the centralized service for all Meta Graph API calls. Key methods used in onboarding:

#### `exchangeCodeForToken(code: string)`

```
POST https://graph.facebook.com/v24.0/oauth/access_token
Content-Type: application/x-www-form-urlencoded

client_id={META_APP_ID}
&client_secret={META_APP_SECRET}
&code={code}
&redirect_uri={REDIRECT_URI}
```

**Returns:** `{ access_token: string, token_type: string, expires_in?: number }`

> **⚠️ Security:** This exchange MUST happen server-side. The `META_APP_SECRET` must never be exposed to the client.

#### `listPhoneNumbers({ wabaId, accessToken })`

```
GET https://graph.facebook.com/v24.0/{wabaId}/phone_numbers
Authorization: Bearer {accessToken}
```

**Returns:** Array of phone number objects with `id`, `display_phone_number`, `verified_name`, `quality_rating`, etc.

#### `subscribeToWaba(wabaId, accessToken)`

```
POST https://graph.facebook.com/v24.0/{wabaId}/subscribed_apps
Authorization: Bearer {accessToken}
```

This subscribes our app to receive webhook notifications for the WABA. Required for receiving messages.

### 6.2 Token Types

| Token | Usage | Lifetime |
|-------|-------|----------|
| Authorization Code | Exchanged once for access token | Short-lived (~10 min) |
| User Access Token | Returned from code exchange | ~60 days |
| System User Token | Can be generated for long-lived access | Does not expire |

> **📌 Current Implementation:** We use the user access token from the code exchange. For production, consider converting to a System User Token via the Business Manager for permanent access.

### 6.3 Required Permissions (Scopes)

| Permission | Purpose |
|-----------|---------|
| `whatsapp_business_management` | Manage WABA settings, phone numbers, templates |
| `whatsapp_business_messaging` | Send and receive messages |

These permissions must be:
1. Requested in the OAuth URL `scope` parameter
2. Approved in Meta App Review (for production)
3. Granted by the user during the Embedded Signup flow

---

## 7. Database Schema

### `WhatsAppConfig` Model

```prisma
model WhatsAppConfig {
  id               String   @id @default(cuid())
  organizationId   String
  wabaId           String?
  phoneId          String?
  phoneNumber      String?
  displayName      String?
  accessToken      String?
  tokenExpiresAt   DateTime?
  authorizationCode String?
  status           String   @default("pending")
  webhookSecret    String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  organization     Organization @relation(fields: [organizationId], references: [id])

  @@unique([organizationId, wabaId])
  @@map("whatsapp_configs")
}
```

### Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Config created but not yet connected |
| `active` | Successfully connected and operational |
| `disconnected` | Previously connected, now disconnected |
| `error` | Connection failed or in error state |

### `WhatsAppWebhookLog` Model

```prisma
model WhatsAppWebhookLog {
  id             String   @id @default(cuid())
  organizationId String?
  instanceId     String?
  eventType      String?
  payload        Json
  processedAt    DateTime @default(now())
  
  @@map("whatsapp_webhook_logs")
}
```

---

## 8. Environment Variables

### Server-Side Only (`.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `META_APP_SECRET` | Meta App Secret for OAuth | `abc123def456...` |
| `META_API_VERSION` | Graph API version | `v24.0` |
| `META_WEBHOOK_VERIFY_TOKEN` | Token for webhook verification | `my_secret_verify_token` |
| `META_WABA_ID` | Default/fallback WABA ID | `123456789` |
| `META_PHONE_ID` | Default/fallback Phone ID | `987654321` |
| `META_ACCESS_TOKEN` | Default/fallback access token | `EAAx...` |
| `META_APP_ID` | Meta App ID (also available as public) | `1234567890` |

### Client-Side (Exposed to browser)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_META_APP_ID` | Meta App ID for OAuth URL | `1234567890` |
| `NEXT_PUBLIC_META_CONFIG_ID` | Embedded Signup config ID | `9876543210` |

> **⚠️ Security:** Only `NEXT_PUBLIC_*` variables are safe to expose to the browser. `META_APP_SECRET` must NEVER be in a `NEXT_PUBLIC_` variable.

---

## 9. Security Considerations

### 9.1 OAuth Security

| Measure | Status | Notes |
|---------|--------|-------|
| Server-side token exchange | ✅ Implemented | Code exchanged in `/claim-waba` API route |
| App Secret never exposed | ✅ Implemented | Only used in server-side code |
| Origin validation on postMessage | ✅ Implemented | Checks for `facebook.com` origin |
| Same-origin check for callback data | ✅ Implemented | `window.location.origin` check |
| CSRF protection via `state` param | ⚠️ Partial | Currently passing WABA ID as state; should include a random nonce |
| Redirect URI validation | ✅ Meta-enforced | Meta validates against configured redirect URIs |

### 9.2 Webhook Security

| Measure | Status | Notes |
|---------|--------|-------|
| Verify token validation | ✅ Implemented | `META_WEBHOOK_VERIFY_TOKEN` checked on GET |
| Payload signature verification | ❌ Not implemented | Should verify `X-Hub-Signature-256` header |
| HTTPS only | ✅ Enforced | Meta requires HTTPS for webhooks |

### 9.3 Token Storage

| Measure | Status | Notes |
|---------|--------|-------|
| Encrypted at rest | ⚠️ Depends on DB | Access tokens stored in plain text in DB |
| Token expiration tracking | ⚠️ Partial | `tokenExpiresAt` field exists but not actively used |
| Token refresh mechanism | ❌ Not implemented | No automatic token refresh |

### 9.4 Recommendations

1. **CSRF Nonce:** Add a cryptographically random nonce to the `state` parameter and validate it on callback.
2. **Webhook Signature Verification:** Implement `X-Hub-Signature-256` validation using `META_APP_SECRET` as the HMAC key.
3. **Token Encryption:** Encrypt `accessToken` before storing in the database.
4. **Token Refresh:** Implement proactive token refresh before expiration (tokens typically last 60 days).
5. **Rate Limiting:** Add rate limiting to the `/claim-waba` and `/check-connection` endpoints.

---

## 10. Error Handling

### 10.1 Frontend Error Scenarios

| Scenario | Detection | Handling |
|----------|-----------|----------|
| Popup blocked | `window.open()` returns null | Show user message to allow popups |
| User cancels in Meta UI | `WA_EMBEDDED_SIGNUP` with `CANCEL` event | Reset to `idle` state |
| Meta SDK error | `WA_EMBEDDED_SIGNUP` with `ERROR` event | Set `error` state with message |
| OAuth error callback | `?error=` query param | Display error, allow retry |
| Claim WABA API call fails | HTTP error response | Set `error` state with details |
| Polling timeout | 2 minutes without success | Auto-reset to `idle` |
| Network error | Fetch throws | Set `error` state |

### 10.2 Backend Error Scenarios

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| Unauthenticated | 401 | `{ error: 'Unauthorized' }` |
| Missing code or wabaId | 400 | `{ error: 'Missing required fields' }` |
| Token exchange fails | 500 | `{ error: 'Token exchange failed', details: ... }` |
| Meta API rate limited | 500 | `{ error: 'Rate limited by Meta' }` |
| Phone number fetch fails | 500 | `{ error: 'Failed to list phone numbers' }` |
| DB upsert fails | 500 | `{ error: 'Database error' }` |
| Webhook subscription fails | Logged only | Non-blocking; config is saved regardless |

### 10.3 Meta API Error Codes

Common error codes returned by Meta Graph API:

| Code | Subcode | Meaning | Our Handling |
|------|---------|---------|--------------|
| 100 | — | Invalid parameter | Log and return 400 |
| 190 | — | Invalid/expired access token | Re-authenticate |
| 4 | — | API rate limit reached | Retry with backoff |
| 10 | — | Permission denied | Check app permissions |
| 200 | — | Requires extended permissions | Re-authorize with correct scopes |

---

## 11. Compliance Checklist

### Meta Documentation Compliance

| Requirement | Status | Implementation Detail |
|-------------|--------|----------------------|
| Use `config_id` for Embedded Signup | ✅ | `NEXT_PUBLIC_META_CONFIG_ID` in OAuth URL |
| Server-side code-to-token exchange | ✅ | `/claim-waba` uses `exchangeCodeForToken()` |
| Request correct permissions | ✅ | `whatsapp_business_management,whatsapp_business_messaging` |
| Handle `WA_EMBEDDED_SIGNUP` postMessage | ✅ | Listener in `useWhatsAppOnboarding` |
| Handle `FINISH`, `CANCEL`, `ERROR` events | ✅ | Switch statement in postMessage handler |
| Origin validation on postMessage | ✅ | `event.origin.includes('facebook.com')` |
| Use Graph API v24.0 | ✅ | `META_API_VERSION=v24.0` |
| Subscribe to webhooks after connection | ✅ | `subscribeToWaba()` in claim-waba |
| Webhook verification endpoint | ✅ | GET handler in `/webhook` route |
| Process webhook events and return 200 | ✅ | POST handler returns `{ received: true }` |
| Privacy Policy URL | ✅ | Configured in Meta App settings |
| Data Deletion Endpoint | ⚠️ Check | Required for App Review |

### App Review Requirements

For production use, ensure:

- [ ] **Privacy Policy** — Publicly accessible URL configured in Meta App
- [ ] **Data Deletion** — Endpoint or instructions URL configured
- [ ] **Business Verification** — Company verified in Meta Business Manager
- [ ] **App Review Approved** — Permissions approved for production use
- [ ] **Video Demonstration** — Screencast showing app functionality submitted

---

## 12. Known Limitations & Risks

### 12.1 Current Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| No webhook signature verification | Security risk — webhook payloads could be spoofed | Implement HMAC-SHA256 verification |
| No token refresh | Tokens expire after ~60 days; messaging stops | Implement proactive refresh or convert to System User Token |
| Single phone per WABA assumption | May break if WABA has multiple phones | First phone is used; consider letting user choose |
| No disconnect/cleanup flow | Users can't cleanly disconnect a WABA | Implement WABA unsubscription and config cleanup |
| Polling fallback is time-limited | If claim takes > 2 min, user sees timeout | Increase timeout or improve UX feedback |

### 12.2 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Meta blocks excessive test connections | Medium | Blocked account | Limit testing frequency, use test WABAs |
| Token stored unencrypted | Low (requires DB access) | Token theft | Encrypt tokens at rest |
| Rate limiting on Meta API | Low in normal use | Temporary service disruption | Implement retry-with-backoff |
| Config ID becomes invalid | Very Low | Signup flow breaks | Monitor and update config ID |
| Meta deprecates v24.0 | Eventual (12-24 months) | API calls fail | Monitor deprecation notices, plan upgrades |

---

## 13. Future Improvements

### Priority 1 — Security

- [ ] **Webhook Signature Verification** — Validate `X-Hub-Signature-256` on all incoming webhooks
- [ ] **CSRF Nonce in State Param** — Generate and validate a random nonce in the OAuth `state` parameter
- [ ] **Token Encryption** — Encrypt access tokens before database storage

### Priority 2 — Reliability

- [ ] **Token Refresh** — Auto-refresh tokens before expiration (or convert to System User Token)
- [ ] **Retry Logic** — Add exponential backoff for Meta API calls
- [ ] **Health Check** — Periodic verification that connected WABAs are still active
- [ ] **Graceful Disconnect** — UI flow to unsubscribe webhooks and clean up config

### Priority 3 — Features

- [ ] **Multi-Phone Support** — Allow users to select which phone number to use if WABA has multiple
- [ ] **Connection Status Dashboard** — Real-time status of all connected WABAs
- [ ] **Webhook Event Inspector** — UI to view recent webhook events for debugging
- [ ] **Re-onboarding Flow** — Ability to reconnect/switch WABAs without deleting existing config

### Priority 4 — Developer Experience

- [ ] **Integration Tests** — Automated tests for the onboarding flow
- [ ] **Mock Meta API** — Test environment with mocked Meta responses
- [ ] **Monitoring & Alerts** — Alerts for failed connections, expired tokens, webhook errors

---

## Appendix A: Meta Embedded Signup Config

The `config_id` used in the OAuth URL is created in **Meta Business Manager** under:

> **Business Settings → WhatsApp Accounts → Embedded Signup**

Configuration includes:
- **Solution name** — Displayed to the user during signup
- **Category** — Business category
- **Phone number** — Whether user provides existing or new number
- **Permissions** — Which permissions to request
- **Redirect URI** — Must match the `redirect_uri` in the OAuth URL

## Appendix B: Testing Guide

### Test with Meta Test WABA

1. Use a Meta Test WABA (available in Meta Developer Dashboard)
2. Set environment variables to point to test credentials
3. Complete the Embedded Signup flow
4. Verify:
   - Token was exchanged successfully
   - Phone numbers were fetched
   - Config was saved in DB
   - Webhooks were subscribed
   - Test message can be sent

### Manual Testing Checklist

- [ ] Click "Connect" — popup opens to Meta
- [ ] Complete signup in Meta popup — popup closes
- [ ] Connection status shows "Connected"
- [ ] Phone number appears in settings
- [ ] Cancel during Meta signup — status resets to idle
- [ ] Close popup without completing — polling timeout occurs gracefully
- [ ] Block popup — appropriate error message shown
- [ ] Network error during claim — error state with retry option
- [ ] Refresh page after connection — connected state persists

---

*This document should be updated whenever the onboarding flow is modified or Meta releases new API versions.*
