# Centrifugo Real-time Messaging - Troubleshooting Guide

## Overview

Centrifugo is the real-time messaging service for the WhaTrack inbox. It uses WebSocket to push live updates to clients without polling.

**WebSocket URL:** `wss://centrifugo.whatrack.com/connection/websocket`

## Architecture

```
Browser (Client)
    ↓ (WebSocket)
Centrifugo Server (wss://centrifugo.whatrack.com)
    ↓ (Redis pub/sub)
Redis (redis:6379 in Docker Swarm)
    ↑ (HTTP API)
Next.js App (Backend)
```

## Quick Diagnostics

### 1. Check if Centrifugo Server is Running

```bash
# Test HTTP API endpoint
curl -H "Host: centrifugo.whatrack.com" http://localhost:8000/api/ping

# Expected response: {"result":{}}
```

### 2. Check Token Generation

```bash
# Get a connection token
curl -H "Cookie: your_auth_cookie" http://localhost:3000/api/v1/centrifugo/token

# Should return: {"token":"eyJhbGciOiJIUzI1NiIs..."}
```

### 3. Check WebSocket Connection in Browser

Open browser DevTools (F12) and paste in Console:

```javascript
// Test WebSocket connection
const ws = new WebSocket('wss://centrifugo.whatrack.com/connection/websocket');
ws.onopen = () => console.log('✓ WebSocket connected');
ws.onerror = (e) => console.error('✗ WebSocket error:', e);
ws.onclose = () => console.log('WebSocket closed');
ws.onmessage = (e) => console.log('Message:', e.data);

// Try to connect with token
setTimeout(() => {
  ws.send(JSON.stringify({
    type: 1,
    subscribe: {
      channel: "test"
    }
  }));
}, 1000);
```

## Common Issues & Solutions

### Issue 1: "Failed to fetch Centrifugo token"

**Symptoms:**
- Console error: `[Centrifugo] Token fetch failed: 401`
- No WebSocket connection

**Causes:**
1. User not authenticated
2. No organization access
3. `CENTRIFUGO_TOKEN_HMAC_SECRET_KEY` not configured on backend

**Solutions:**
```bash
# Check if user is logged in
# Check if organization is accessible
# Verify .env has CENTRIFUGO_TOKEN_HMAC_SECRET_KEY
grep CENTRIFUGO_TOKEN_HMAC_SECRET_KEY /path/to/.env
```

### Issue 2: "WebSocket connection failed"

**Symptoms:**
- Token fetches successfully
- Browser console shows WebSocket connection error
- Network tab shows WebSocket request fails with 403/502/503

**Causes:**
1. Centrifugo server not running
2. CORS issues (unlikely with WSS)
3. SSL/TLS certificate problem
4. Traefik not routing to Centrifugo correctly
5. Redis connection issue in Centrifugo

**Solutions:**
```bash
# 1. Check if Centrifugo container is running
docker service ls | grep centrifugo
docker service logs whatrack_centrifugo --tail 100

# 2. Check Centrifugo admin panel
curl https://centrifugo.whatrack.com/admin

# 3. Check Redis connection from Centrifugo logs
# Look for: "redis connected" or "redis error"

# 4. Verify Traefik routing
docker service logs whatrack_traefik --tail 50 | grep centrifugo

# 5. Test direct connection (if Docker host accessible)
telnet localhost 8000
```

### Issue 3: "Connected but no real-time updates"

**Symptoms:**
- WebSocket connects successfully
- No subscription errors
- But messages don't arrive in real-time

**Causes:**
1. Messages not being published to correct channel
2. Redis pub/sub not working
3. Channel subscription not working

**Solutions:**
```bash
# 1. Check if messages are being published
# Monitor Centrifugo logs for "publish" events
docker service logs whatrack_centrifugo --tail 100 | grep -i publish

# 2. Test Redis connection from Centrifugo
# Check Centrifugo logs for Redis errors
docker service logs whatrack_centrifugo --tail 100 | grep -i redis

# 3. Manually publish to test channel
curl -X POST https://centrifugo.whatrack.com/api/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: apikey YOUR_CENTRIFUGO_API_KEY" \
  -d '{
    "channel": "test",
    "data": {"message": "hello"}
  }'

# 4. Check subscription in browser
# Should see [Centrifugo] Subscribed to org:ORG_ID:messages
# Check browser console for subscription events
```

### Issue 4: "CORS or Certificate Error"

**Symptoms:**
- Browser console shows CORS errors
- WebSocket shows "Mixed content" or certificate warnings

**Solutions:**
```bash
# 1. Verify HTTPS is working
curl -v https://centrifugo.whatrack.com/admin

# 2. Check certificate validity
openssl s_client -connect centrifugo.whatrack.com:443

# 3. Verify Traefik TLS configuration
docker service ls | grep traefik
docker service inspect whatrack_traefik | grep -i tls
```

## Debugging Steps (In Order)

1. **Check Authentication**
   ```bash
   curl -H "Cookie: your_auth_cookie" \
     http://localhost:3000/api/v1/centrifugo/token
   ```
   Should return a valid JWT token

2. **Check Server Connectivity**
   ```bash
   curl -H "Host: centrifugo.whatrack.com" \
     http://localhost:8000/api/ping
   ```
   Should return `{"result":{}}`

3. **Check WebSocket in Browser**
   - Open DevTools Console
   - Check for `[Centrifugo]` messages
   - Look for "Connected" or error messages

4. **Check Centrifugo Logs**
   ```bash
   docker service logs whatrack_centrifugo --tail 200 --follow
   ```
   Look for:
   - "redis" connection status
   - WebSocket connection attempts
   - Subscribe events

5. **Check Redis Connection**
   ```bash
   docker exec whatrack_redis redis-cli -a PASSWORD ping
   # Should return: PONG
   ```

## Configuration Checklist

Backend (`.env`):
- [ ] `CENTRIFUGO_URL=https://centrifugo.whatrack.com`
- [ ] `CENTRIFUGO_API_KEY=<secret>`
- [ ] `CENTRIFUGO_TOKEN_HMAC_SECRET_KEY=<secret>`
- [ ] `CENTRIFUGO_ADMIN_PASSWORD=<secret>`
- [ ] `CENTRIFUGO_ADMIN_SECRET=<secret>`

Frontend (`.env`):
- [ ] `NEXT_PUBLIC_CENTRIFUGO_URL=wss://centrifugo.whatrack.com/connection/websocket`

Docker Stack:
- [ ] Redis container running on `redis:6379`
- [ ] Centrifugo container running on `0.0.0.0:8000`
- [ ] Traefik routing `centrifugo.whatrack.com` to Centrifugo:8000
- [ ] TLS certificates valid and configured

## Useful Commands

```bash
# Monitor Centrifugo in real-time
docker service logs whatrack_centrifugo -f

# Check Centrifugo stats via HTTP API
curl -H "Authorization: apikey <API_KEY>" \
  https://centrifugo.whatrack.com/api/stats

# Check available channels (requires admin token)
curl -H "Authorization: apikey <API_KEY>" \
  https://centrifugo.whatrack.com/api/channels

# Publish test message
curl -X POST https://centrifugo.whatrack.com/api/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: apikey <API_KEY>" \
  -d '{"channel":"test","data":{"hello":"world"}}'
```

## Log Examples

### Successful Connection
```
[Centrifugo] Token fetched successfully
[Centrifugo] Connected
[Centrifugo] Subscribed to org:123:messages
[Centrifugo] Subscribed to org:123:tickets
```

### Redis Connection Error
```
error creating engine: dial tcp redis:6379: connect: connection refused
```

### Missing Configuration
```
[Centrifugo] CENTRIFUGO_TOKEN_HMAC_SECRET_KEY not configured
```

### WebSocket Connection Failed
```
[Centrifugo] Connection error: WebSocket closed with code 1002
```

## Testing Channels

The application subscribes to these channels (replace `ORG_ID` with your organization ID):

1. **Message Channel:** `org:ORG_ID:messages`
   - Triggered when new messages arrive
   - Updates: chat-messages, whatsapp-chats queries

2. **Ticket Channel:** `org:ORG_ID:tickets`
   - Triggered when ticket status changes
   - Updates: conversation-ticket, whatsapp-chats queries

## Next Steps

If the troubleshooting steps don't resolve the issue:

1. Check `/Users/thiago/www/whatrack/REDIS_SETUP.md` for Redis configuration
2. Check `/Users/thiago/www/whatrack/docs/INBOX-REALTIME-PRD.md` for architecture details
3. Check Centrifugo official docs: https://centrifugo.dev
4. Review Centrifugo logs for specific error messages
