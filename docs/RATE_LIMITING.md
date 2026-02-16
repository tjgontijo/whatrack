# Rate Limiting Guide

This guide explains the rate limiting implementation that protects the WhatsApp API endpoints from abuse and resource exhaustion.

## Overview

The rate limiting system uses **three complementary strategies**:

1. **IP-based**: Limits total requests from a single IP address
2. **Organization-based**: Limits total requests from a single organization
3. **Burst**: Prevents rapid-fire requests within a short window

All limits use **Redis** for distributed tracking across multiple instances.

---

## Rate Limit Configuration

### Endpoint Configurations

#### `/api/v1/whatsapp/webhook`
- **Purpose**: Receive webhook events from Meta
- **IP limit**: 1,000 requests/hour
- **Organization limit**: 5,000 requests/hour
- **Burst limit**: 50 requests/minute

Example: If webhook endpoint receives 60 requests in one second from the same IP:
- Burst check triggers after the 50th request
- Returns `429 Too Many Requests`
- Tells client to retry after 59 seconds

#### `/api/v1/whatsapp/onboarding`
- **Purpose**: Generate onboarding URLs
- **IP limit**: 100 requests/hour
- **Organization limit**: 500 requests/hour
- **Burst limit**: 10 requests/minute

Use case: Prevents brute-forcing organization IDs or exhausting onboarding tokens

#### `/api/v1/jobs/whatsapp-health-check`
- **Purpose**: Cron job for token validation
- **IP limit**: 60 requests/hour
- **Organization limit**: 100 requests/hour
- **Burst limit**: 2 requests/minute

Restricted because this is a system cron job (should only run once per 5 minutes)

#### `/api/v1/jobs/webhook-retry`
- **Purpose**: Cron job for DLQ retry
- **IP limit**: 60 requests/hour
- **Organization limit**: 100 requests/hour
- **Burst limit**: 2 requests/minute

Restricted because this is a system cron job (should only run once per 5 minutes)

#### Default (unmapped endpoints)
- **IP limit**: 200 requests/hour
- **Organization limit**: 1,000 requests/hour
- **Burst limit**: 20 requests/minute

---

## How It Works

### Request Flow

```
Client Request
    ↓
Check IP-based limit
    ├─ Exceeded? → Return 429
    └─ OK? Continue
    ↓
Check Organization limit (if orgId provided)
    ├─ Exceeded? → Return 429
    └─ OK? Continue
    ↓
Check Burst limit (always checked)
    ├─ Exceeded? → Return 429
    └─ OK? Continue
    ↓
Process request
```

### Example: Webhook Burst Attack

Attacker sends 100 requests in 1 second to `/api/v1/whatsapp/webhook`:

```
Request 1-50: Allowed (burst limit = 50/min)
Request 51: Rejected with:
  {
    "error": "Too many requests",
    "message": "Rate limit exceeded: burst strategy",
    "limit": 50,
    "current": 51,
    "resetAt": "2026-02-16T10:01:00Z",
    "retryAfter": 59
  }
  HTTP 429
  Retry-After: 59
```

---

## Organization-Based Tier Scaling

Organizations on different subscription tiers get different rate limits:

| Tier | Multiplier | Effective Limits |
|------|-----------|-----------------|
| Starter | 1x | 1,000 webhook/hr, 100 onboarding/hr |
| Professional | 5x | 5,000 webhook/hr, 500 onboarding/hr |
| Enterprise | 20x | 20,000 webhook/hr, 2,000 onboarding/hr |

Example:
```typescript
// Starter org
GET /api/v1/whatsapp/onboarding?orgId=starter-org
→ Limit: 100/hour

// Enterprise org
GET /api/v1/whatsapp/onboarding?orgId=enterprise-org
→ Limit: 100 * 20 = 2,000/hour
```

---

## API Response Headers

All responses include rate limit information in headers:

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 59
X-RateLimit-Limit: 50
X-RateLimit-Current: 51
X-RateLimit-Reset: 2026-02-16T10:01:00Z
```

### Header Explanation

- **`Retry-After`**: Seconds to wait before retrying
- **`X-RateLimit-Limit`**: Maximum requests allowed in current window
- **`X-RateLimit-Current`**: Current request count in window
- **`X-RateLimit-Reset`**: When the limit window resets (ISO 8601)

---

## Client Implementation

### JavaScript/Node.js

```typescript
async function callWebhookWithRetry(url: string, options: any, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      // Extract retry delay from header
      const retryAfter = response.headers.get('Retry-After');
      const delayMs = (parseInt(retryAfter || '60') + 1) * 1000;

      if (attempt < maxRetries - 1) {
        console.log(`Rate limited. Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }
}
```

### Python

```python
import time
import requests

def call_webhook_with_retry(url, data, max_retries=3):
    for attempt in range(max_retries):
        response = requests.post(url, json=data)

        if response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', '60'))
            delay = (retry_after + 1) * 1000
            print(f"Rate limited. Retrying in {delay}ms...")
            time.sleep(delay / 1000)
            continue

        response.raise_for_status()
        return response.json()
```

---

## Monitoring

### Check Current Limits

```bash
# Get current request count for IP
curl "http://localhost:3000/api/v1/debug/rate-limit?ip=192.168.1.1"

# Get current request count for organization
curl "http://localhost:3000/api/v1/debug/rate-limit?org=org-123"
```

### Redis Keys

Rate limits are stored in Redis with keys:

```
ratelimit:ip:192.168.1.1
ratelimit:org:org-123
ratelimit:burst:192.168.1.1:org-123
```

Check keys directly:

```bash
redis-cli
> KEYS "ratelimit:*"
> GET "ratelimit:ip:192.168.1.1"
> TTL "ratelimit:ip:192.168.1.1"
```

### Monitoring Alerts

Set up alerts when:

1. **High rejection rate**: If >5% of requests return 429
2. **Suspicious patterns**: Same IP exceeding limits multiple times
3. **Org abuse**: Organization repeatedly hitting limits
4. **Redis failures**: If rate limiting falls back to allow-all mode

Example monitoring query (if using Prometheus):

```promql
# 5-minute 429 rate
rate(http_requests_total{status="429"}[5m]) > 0.05
```

---

## Troubleshooting

### "Too many requests" but I only sent one request

**Possible causes:**

1. **Burst limit triggered**: You sent 51 requests to webhook endpoint within 60 seconds
   - Solution: Spread requests over time (max 50/minute)

2. **Organization limit**: Your org hit 5,000 requests/hour
   - Solution: Wait for window to reset or upgrade plan

3. **IP-based limit**: Your IP sent 1,000 requests/hour globally
   - Solution: Check if other processes are using same IP

**Debugging:**

```bash
# Check current counts
redis-cli MGET "ratelimit:ip:YOUR_IP" \
                "ratelimit:org:YOUR_ORG" \
                "ratelimit:burst:YOUR_IP:YOUR_ORG"

# Check TTLs
redis-cli TTL "ratelimit:ip:YOUR_IP"
```

### Rate limits not working

**Check Redis connection:**

```bash
# From app server
curl http://localhost:6379
# Should fail (Redis doesn't speak HTTP)

# From Node.js
import { getRedis } from '@/lib/redis';
const redis = getRedis();
const ping = await redis.ping();
console.log(ping); // Should print 'PONG'
```

If Redis unavailable:
- Rate limiting **falls back to allow-all mode**
- A warning is logged: `[RateLimit] Redis error`
- Requests proceed normally
- **This is intentional**: Better to allow requests than block them all

To force-disable rate limiting:

```typescript
// In your endpoint
export async function POST(request: NextRequest) {
  // Skip rate limit check
  // const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/whatsapp/webhook');
  // if (rateLimitResponse) return rateLimitResponse;

  // ... rest of endpoint
}
```

### Requests stuck waiting to retry

Check if Redis keys are set:

```bash
redis-cli

# List all rate limit keys
> KEYS "ratelimit:*"

# Check specific key
> GET "ratelimit:burst:192.168.1.1:org-123"
> TTL "ratelimit:burst:192.168.1.1:org-123"

# Manually reset limit
> DEL "ratelimit:burst:192.168.1.1:org-123"
```

---

## Performance Characteristics

### Redis Operations

- **First request**: `INCR` + `EXPIRE` = 2 Redis calls
- **Subsequent requests**: `INCR` + `TTL` = 2 Redis calls

Latency impact: **1-5ms per request** (typical)

### Memory Usage

```
Assumptions:
- 10,000 active IPs
- 500 organizations
- Average key size: ~50 bytes

Memory = (10,000 + 500) * 50 bytes ≈ 525 KB
```

Very efficient. Redis can handle millions of rate limit keys.

### Scaling

For high-traffic deployments:

1. **Use Redis Cluster** instead of single instance
2. **Enable key expiration** (automatically removes old keys)
3. **Monitor Redis memory** usage

---

## Advanced: Custom Rate Limits Per Endpoint

To add rate limiting to a new endpoint:

```typescript
// src/app/api/v1/custom/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware, RateLimitConfig } from '@/lib/middleware/rate-limit.middleware';

export async function POST(request: NextRequest) {
  // Custom config for this endpoint
  const config: RateLimitConfig = {
    enabled: true,
    ip: { limit: 50, windowSeconds: 3600 },
    org: { limit: 300, windowSeconds: 3600 },
    burst: { limit: 5, windowSeconds: 60 },
  };

  const rateLimitResponse = await rateLimitMiddleware(
    request,
    '/api/v1/custom',
    config
  );
  if (rateLimitResponse) return rateLimitResponse;

  // ... rest of endpoint
  return NextResponse.json({ success: true });
}
```

Or update global config:

```typescript
// In src/lib/middleware/rate-limit.middleware.ts
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/v1/custom': {
    enabled: true,
    ip: { limit: 50, windowSeconds: 3600 },
    org: { limit: 300, windowSeconds: 3600 },
    burst: { limit: 5, windowSeconds: 60 },
  },
  // ... other configs
};
```

---

## References

- [Rate Limiting Pattern](https://en.wikipedia.org/wiki/Token_bucket)
- [Redis Commands](https://redis.io/commands/)
- [HTTP 429 Status Code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)
- [Retry-After Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After)
