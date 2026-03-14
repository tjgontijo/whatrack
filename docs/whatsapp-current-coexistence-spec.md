# WhatsApp Coexistence Connection - Current Spec

## Purpose

This document captures the current WhatsApp official API coexistence connection flow exactly as implemented in the current codebase.

Goal of this spec:

- describe what is working today
- describe the current popup/onboarding/coexistence flow end to end
- describe how the connection is persisted
- describe why the instance is not appearing even though coexistence itself succeeds

## Current status

What is working today:

- the Meta popup opens
- the Embedded Signup / coexistence flow completes
- the callback receives a valid `code`
- the app exchanges the code for a valid access token
- the app lists the shared WABA successfully
- the app finds phone numbers during the callback
- the app creates/updates `WhatsAppConnection`
- the app persists `WhatsAppConfig`
- the app subscribes the app to the WABA webhook

What is not working today:

- after the callback, the UI calls `/api/v1/whatsapp/phone-numbers`
- that route re-reads the persisted token from the database
- the token is later sent to Meta in an invalid format
- Meta returns `Invalid OAuth access token - Cannot parse access token`
- the route swallows the per-WABA failure and still returns `200`
- the UI receives an empty list and the instance does not appear

## High-level architecture

Main layers involved:

- UI page: [`src/app/dashboard/settings/whatsapp/page.tsx`](/Users/thiago/www/whatrack/src/app/dashboard/settings/whatsapp/page.tsx)
- CTA component: [`src/components/whatsapp/embedded-signup-button.tsx`](/Users/thiago/www/whatrack/src/components/whatsapp/embedded-signup-button.tsx)
- client hook: [`src/hooks/whatsapp/use-whatsapp-onboarding.ts`](/Users/thiago/www/whatrack/src/hooks/whatsapp/use-whatsapp-onboarding.ts)
- onboarding URL route: [`src/app/api/v1/whatsapp/onboarding/route.ts`](/Users/thiago/www/whatrack/src/app/api/v1/whatsapp/onboarding/route.ts)
- callback route: [`src/app/api/v1/whatsapp/onboarding/callback/route.ts`](/Users/thiago/www/whatrack/src/app/api/v1/whatsapp/onboarding/callback/route.ts)
- Meta API client: [`src/services/whatsapp/meta-cloud.service.ts`](/Users/thiago/www/whatrack/src/services/whatsapp/meta-cloud.service.ts)
- list instances route: [`src/app/api/v1/whatsapp/phone-numbers/route.ts`](/Users/thiago/www/whatrack/src/app/api/v1/whatsapp/phone-numbers/route.ts)
- old token resolver: [`src/lib/whatsapp/token-crypto.ts`](/Users/thiago/www/whatrack/src/lib/whatsapp/token-crypto.ts)
- current encryption service: [`src/lib/encryption.ts`](/Users/thiago/www/whatrack/src/lib/encryption.ts)
- persisted models: [`prisma/schema.prisma`](/Users/thiago/www/whatrack/prisma/schema.prisma)

## UI entry point

The settings page loads the current phone numbers through `whatsappApi.listPhoneNumbers()` and uses `useWhatsAppOnboarding()` to start the Meta flow.

Key behaviors:

- if there are no phone numbers, the page renders `EmbeddedSignupButton`
- clicking the button calls `startOnboarding()`
- after the popup closes, the hook assumes success and calls `onSuccess` to refetch the page data

Relevant files:

- [`src/app/dashboard/settings/whatsapp/page.tsx`](/Users/thiago/www/whatrack/src/app/dashboard/settings/whatsapp/page.tsx)
- [`src/components/whatsapp/embedded-signup-button.tsx`](/Users/thiago/www/whatrack/src/components/whatsapp/embedded-signup-button.tsx)
- [`src/lib/whatsapp/client.ts`](/Users/thiago/www/whatrack/src/lib/whatsapp/client.ts)

## Popup/onboarding flow

### 1. Client starts onboarding

The hook calls:

- `GET /api/v1/whatsapp/onboarding`

It then appends an `extras` payload client-side before opening the popup.

Current extras payload:

```json
{
  "featureType": "whatsapp_business_app_onboarding",
  "sessionInfoVersion": "3",
  "version": "v3",
  "sessionInfo": {
    "trackingCode": "<generated tracking code>"
  }
}
```

Implementation:

- [`src/hooks/whatsapp/use-whatsapp-onboarding.ts`](/Users/thiago/www/whatrack/src/hooks/whatsapp/use-whatsapp-onboarding.ts)

### 2. Server generates the base OAuth URL

The onboarding route:

- validates permission `manage:whatsapp`
- creates a `WhatsAppOnboarding` row
- generates a `trackingCode`
- returns a Meta OAuth URL based on `https://www.facebook.com/dialog/oauth`

Parameters currently set in the route:

- `client_id = NEXT_PUBLIC_META_APP_ID`
- `redirect_uri = ${APP_URL}/api/v1/whatsapp/onboarding/callback`
- `state = trackingCode`
- `scope = whatsapp_business_management,business_management`
- `response_type = code`
- `config_id = NEXT_PUBLIC_META_CONFIG_ID`

Implementation:

- [`src/app/api/v1/whatsapp/onboarding/route.ts`](/Users/thiago/www/whatrack/src/app/api/v1/whatsapp/onboarding/route.ts)

## Callback flow

The callback route is the heart of the successful coexistence flow.

### Step-by-step behavior

1. Read `code`, `state`, `error`, `error_description` from the callback URL.
2. Validate the `state` against `whatsAppOnboarding.trackingCode`.
3. Reject expired tracking codes.
4. Exchange the `code` for an access token through Meta OAuth.
5. Call `MetaCloudService.listWabas(accessToken)`.
6. Extract WABA IDs from `debug_token.granular_scopes`.
7. For each WABA:
   - upsert `WhatsAppConnection`
   - fetch phone numbers through `MetaCloudService.listPhoneNumbers({ wabaId, accessToken })`
   - upsert one `WhatsAppConfig` per phone
   - persist the token in the config
   - subscribe the app to WABA webhooks
   - write an audit log
8. Mark the onboarding row as completed.
9. Redirect back to `/dashboard/settings/whatsapp?status=success&phones=<n>`.

Implementation:

- [`src/app/api/v1/whatsapp/onboarding/callback/route.ts`](/Users/thiago/www/whatrack/src/app/api/v1/whatsapp/onboarding/callback/route.ts)

## Meta API calls involved

### OAuth token exchange

`MetaCloudService.exchangeCodeForToken(code, redirectUri?)`

- endpoint: `POST https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`
- required env:
  - `NEXT_PUBLIC_META_APP_ID`
  - `META_APP_SECRET`
  - `APP_URL`

### Shared WABA discovery

`MetaCloudService.listWabas(accessToken)`

Main strategy:

- call `debug_token`
- read `granular_scopes`
- extract `target_ids` from `whatsapp_business_management`

Fallback strategy:

- call `/me/businesses?fields=id,name,client_whatsapp_business_accounts{...}`

### Phone numbers

`MetaCloudService.listPhoneNumbers({ wabaId, accessToken })`

- endpoint:
  `GET https://graph.facebook.com/${META_API_VERSION}/${wabaId}/phone_numbers?fields=display_phone_number,verified_name,status,quality_rating,throughput`

### Webhook subscription

`MetaCloudService.subscribeToWaba(wabaId, accessToken)`

- endpoint:
  `POST https://graph.facebook.com/${META_API_VERSION}/${wabaId}/subscribed_apps`

Implementation:

- [`src/services/whatsapp/meta-cloud.service.ts`](/Users/thiago/www/whatrack/src/services/whatsapp/meta-cloud.service.ts)

## Persisted data model

### WhatsAppOnboarding

Used to track the onboarding session and validate `state`.

Important fields:

- `organizationId`
- `trackingCode`
- `status`
- `expiresAt`
- `wabaId`
- `ownerBusinessId`
- `errorMessage`
- `errorCode`

### WhatsAppConnection

Represents the WABA-level connection.

Important fields:

- `organizationId`
- `wabaId`
- `ownerBusinessId`
- `status`
- `connectedAt`
- `healthStatus`

### WhatsAppConfig

Represents the phone-level configuration shown later in the UI.

Important fields:

- `organizationId`
- `connectionId`
- `wabaId`
- `phoneId`
- `displayPhone`
- `verifiedName`
- `accessToken`
- `accessTokenEncrypted`
- `status`
- `connectedAt`

Model definitions:

- [`prisma/schema.prisma`](/Users/thiago/www/whatrack/prisma/schema.prisma)

## Why coexistence is considered working

Operational evidence from production logs already observed:

- callback receives a valid `code`
- token exchange succeeds
- `debug_token` succeeds
- `granular_scopes` returns the shared WABA ID
- callback logs show that the WABA has `1 phone number`
- webhook subscription is attempted after that

That means:

- popup works
- authorization works
- coexistence grant works
- WABA sharing works
- Meta returns valid assets during callback

Therefore the current failure is not in the coexistence handshake itself.

## Why the instance still does not appear

The problem happens after the callback, during instance listing.

### Current listing route

`GET /api/v1/whatsapp/phone-numbers`

Current behavior:

1. validate org access
2. read all `WhatsAppConfig` rows for the org
3. for each WABA, find a config and re-read `config.accessToken`
4. call `resolveAccessToken(config.accessToken)`
5. pass the resolved value into `MetaCloudService.listPhoneNumbers`

Implementation:

- [`src/app/api/v1/whatsapp/phone-numbers/route.ts`](/Users/thiago/www/whatrack/src/app/api/v1/whatsapp/phone-numbers/route.ts)

### Current encryption mismatch

The callback persists the token with:

- `encryption.encrypt(accessToken)`

That encryption service supports versioned ciphertext:

- `v1:<iv>:<authTag>:<ciphertext>`
- keys from `ENCRYPTION_KEYS`
- current version from `ENCRYPTION_CURRENT_VERSION`

Implementation:

- [`src/lib/encryption.ts`](/Users/thiago/www/whatrack/src/lib/encryption.ts)

However the WhatsApp token helper used by listing is older and expects:

- `<iv>:<authTag>:<ciphertext>`
- key from `TOKEN_ENCRYPTION_KEY`
- no version prefix support

Implementation:

- [`src/lib/whatsapp/token-crypto.ts`](/Users/thiago/www/whatrack/src/lib/whatsapp/token-crypto.ts)

### Practical failure mode

When a persisted token looks like:

- `v1:...`

the old `resolveAccessToken()` helper does not properly decode it.

Then `/api/v1/whatsapp/phone-numbers` sends that invalid value to Meta.

Meta replies:

- `Invalid OAuth access token - Cannot parse access token`

The route logs the failure per WABA but does not fail the whole request with a non-200 response.

Result:

- callback succeeded
- instance exists in the database
- list route returns no usable phone numbers
- the UI shows no instance

## Environment variables currently involved

For onboarding/coexistence:

- `NEXT_PUBLIC_META_APP_ID`
- `NEXT_PUBLIC_META_CONFIG_ID`
- `APP_URL`
- `META_APP_SECRET`
- `META_API_VERSION`

For token persistence:

- `ENCRYPTION_KEYS`
- `ENCRYPTION_CURRENT_VERSION`
- optionally `TOKEN_ENCRYPTION_KEY` as legacy fallback

## Current conclusion

Current system behavior, as implemented today:

- coexistence connection works
- popup and callback work
- WABA discovery works
- phone discovery during callback works
- persistence is attempted and connection rows are created
- post-callback instance listing fails because the saved token is later read with an incompatible decryption path

So the current state is:

- connection path: healthy
- persistence/read path: inconsistent
- instance visibility in UI: broken as a consequence of the token read mismatch

## Recommended next engineering move

If the next step is implementation, the safest fix is:

- unify WhatsApp token reads with the same version-aware encryption/decryption layer used by the callback storage path
- stop using the old WhatsApp-specific token resolver for values that may now be stored as `v1:...`
- audit every route that reads `config.accessToken`, not just `/api/v1/whatsapp/phone-numbers`
