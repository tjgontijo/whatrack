# Real-Time Debugging Guide

## Overview

This guide helps diagnose and fix real-time messaging issues in the WhatsApp inbox using Centrifugo WebSocket connections.

## Current Status

✅ **Fixed Issues:**
1. HTTP API authentication header (`Authorization: apikey` format)
2. Centrifugo channel namespaces configuration (org namespace)
3. Traefik HTTP/1.1 support for WebSocket upgrade
4. Duplicate token configuration in Docker stack
5. Invalid `CLIENT_USER_ADDRESS_FALLBACK` configuration

## Testing Steps

### 1. Verify Centrifugo Server is Running

```bash
# Check if Centrifugo service is active
docker service ls | grep centrifugo

# Check logs for errors
docker service logs whatrack_centrifugo_whatrack --tail 100

# Expected output should show:
# "started serving on 0.0.0.0:8000"
```

### 2. Test HTTP API (Backend Publishing)

Open DevTools Console and run:

```javascript
// This should succeed with 200 OK
fetch('https://centrifugo.whatrack.com/api/info', {
  method: 'POST',
  headers: {
    'Authorization': 'apikey 7f5a2d9c4e8b1a6f3d0c9e7b2a4f6c1d',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({}),
}).then(r => {
  console.log('Status:', r.status);
  return r.json();
}).then(d => console.log('Response:', d));
```

Expected response should include server info like version.

### 3. Test WebSocket Connection (Frontend)

Go to: `https://whatrack.com/centrifugo-test.html`

1. Click "Conectar" button
2. Watch the log for the following sequence:
   - ✅ Token obtained
   - ✅ Centrifuge library loaded
   - ✅ WebSocket connecting...
   - ✅ WebSocket connected!
   - ✅ Client ID: [some-id]

If you see "transport closed" error, the issue is with WebSocket connectivity.

### 4. Check Browser Network Tab

When trying to connect:

1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Look for `wss://centrifugo.whatrack.com/connection/websocket?...`
4. Check the response headers:
   - Status: **101 Switching Protocols** (not 404 or 502)
   - Header: `upgrade: websocket`
   - Header: `connection: upgrade`

If status is not 101, Traefik/Centrifugo has an issue.

### 5. Verify Token Payload

The WebSocket test page shows the token payload. It should contain:

```json
{
  "sub": "user-id-uuid",
  "exp": 1771335079,
  "iat": 1771331479,
  "info": {
    "organizationId": "org-id-uuid"
  }
}
```

Both `sub` and `info.organizationId` must be valid UUIDs.

## Common Issues and Solutions

### Issue: "transport closed" Error

**Symptoms:**
- WebSocket connects but closes immediately with "transport closed" error

**Possible Causes:**
1. Token is invalid or expired
2. Token secret key mismatch between frontend and Centrifugo
3. User is not authenticated (invalid `sub` claim)
4. Organization context is missing

**Solutions:**
```bash
# 1. Verify token secret matches
grep "CENTRIFUGO_TOKEN_HMAC_SECRET_KEY" infra/centrifugo-stack.yml
echo "Should be: 1a9e5c7b3d4f8a2c6e0b7d9f4a1c3e5b"

# 2. Check you're logged in (authenticated)
# Browser console:
console.log(document.cookie); // Should have auth cookies

# 3. Restart Centrifugo after config changes
docker service update --force whatrack_centrifugo_whatrack
```

### Issue: "Unknown Channel" Error (Code 102)

**Symptoms:**
- Connection succeeds but subscription fails with "unknown channel"

**Possible Causes:**
- Channel namespace not configured in Centrifugo
- Using wrong channel format

**Solutions:**
```bash
# Verify namespace configuration
grep "CENTRIFUGO_CHANNEL_NAMESPACES" infra/centrifugo-stack.yml

# Expected channels format:
# org:ORGANIZATIONID:messages
# org:ORGANIZATIONID:tickets
```

### Issue: "Unauthorized" (401) from HTTP API

**Symptoms:**
- Publishing from backend fails with 401

**Possible Causes:**
- API key is wrong
- Header format is incorrect

**Solutions:**
```bash
# Verify API key in server.ts
grep "CENTRIFUGO_API_KEY" src/lib/centrifugo/server.ts

# Verify header format (should be "Authorization: apikey")
grep -A 3 "Authorization" src/lib/centrifugo/server.ts
```

### Issue: Messages Not Appearing in UI

**Symptoms:**
- WebSocket connected
- Message published via HTTP API
- No update in browser

**Possible Causes:**
1. React Query cache invalidation not working
2. Channel subscription handler not registered
3. Message data format mismatch

**Solutions:**
```javascript
// 1. Check if subscription handlers are registered
// Open DevTools Console on inbox page:
console.log('[Centrifugo] checking subscriptions...');

// 2. Check React Query cache
// Install React Query DevTools: https://github.com/TanStack/query/tree/main/packages/react-query-devtools
// Open DevTools → Tanstack Query to inspect cache state

// 3. Publish a test message via HTTP API
// From Node.js terminal:
npx tsx -e "
const crypto = require('crypto');
const apiKey = '7f5a2d9c4e8b1a6f3d0c9e7b2a4f6c1d';
const payload = {
  channel: 'org:YOUR_ORG_ID:messages',
  data: { conversationId: 'test', message: 'Test message' }
};
const requestBody = JSON.stringify(payload);
const sig = crypto
  .createHmac('sha256', apiKey)
  .update(requestBody)
  .digest('hex');
console.log('Signature:', sig);
"
```

## Diagnostic Logs

### Check Centrifugo Logs

```bash
# Real-time logs
docker service logs -f whatrack_centrifugo_whatrack

# Look for:
# - "client connected" / "client disconnected"
# - "subscription to channel" / "subscription error"
# - "error" entries with details
```

### Check Backend Logs

```bash
# Check if messages are being published
docker service logs whatrack_app | grep -i centrifugo

# Expected entries:
# [Centrifugo] Publishing message to org:xxx:messages
# [Centrifugo] Publish successful
```

## Configuration Verification Checklist

Use this checklist to verify all configuration is correct:

```bash
# 1. Docker Stack
echo "=== Docker Stack ==="
docker service ls | grep centrifugo
docker service inspect whatrack_centrifugo_whatrack | grep -A 5 "Env"

# 2. Redis Connection
echo "=== Redis ==="
redis-cli -h redis_whatrack -p 6379 -a 4f9c2a8d7b1e6c3f PING

# 3. Centrifugo HTTP API
echo "=== HTTP API ==="
curl -X POST https://centrifugo.whatrack.com/api/info \
  -H "Authorization: apikey 7f5a2d9c4e8b1a6f3d0c9e7b2a4f6c1d" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -s | jq .

# 4. Token Secret Consistency
echo "=== Token Secrets ==="
echo "Docker Secret: $(grep CENTRIFUGO_CLIENT_TOKEN_HMAC_SECRET_KEY infra/centrifugo-stack.yml)"
echo "Backend Secret: $(grep CENTRIFUGO_TOKEN_HMAC_SECRET_KEY .env | head -1)"
```

## Next Steps

1. **Deploy Configuration Changes:**
   ```bash
   docker stack deploy -c infra/centrifugo-stack.yml whatrack
   ```

2. **Wait for Service Update:** (may take 30 seconds)
   ```bash
   docker service ls # Wait for Centrifugo to be "running"
   ```

3. **Test WebSocket Connection:**
   - Go to `https://whatrack.com/centrifugo-test.html`
   - Click "Conectar"
   - Verify successful connection

4. **Test Full Real-Time Flow:**
   - Open WhatsApp inbox page
   - Send a test WhatsApp message
   - Message should appear in real-time (no page refresh needed)

## Support

For more detailed Centrifugo documentation:
- [Centrifugo v6 Docs](https://centrifugal.dev/)
- [Channel Namespaces](https://centrifugal.dev/docs/server/configuration#channel_namespace_config)
- [Authentication](https://centrifugal.dev/docs/server/authentication)
