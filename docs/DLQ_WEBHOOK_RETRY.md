# Dead Letter Queue (DLQ) - Webhook Retry Guide

This guide explains the webhook retry mechanism for WhatsApp Cloud API webhooks.

## Overview

The **Dead Letter Queue (DLQ)** pattern ensures reliable webhook processing:

1. **Immediate Logging** - Every webhook is logged BEFORE processing
2. **Smart Retry** - Failed webhooks are retried automatically
3. **Exponential Backoff** - Retry delays increase with each attempt
4. **Max Retries** - Stop after 3 attempts to prevent infinite loops
5. **Audit Trail** - All failures are logged for monitoring

---

## Flow Diagram

```
Meta Webhook
    ↓
POST /api/v1/whatsapp/webhook
    ↓
1. Log webhook (processed=false)
    ↓
2. Verify signature
    ↓
3. Process with WebhookProcessor
    ↓
4. If SUCCESS → Mark processed=true ✓
    ↓
5. If FAILURE → Store error, wait for retry
    ↓
Retry Job (every 5 min)
    ↓
Find failed webhooks (retryCount < 3)
    ↓
Retry processing
    ↓
If SUCCESS → Mark processed=true ✓
If FAILURE → Increment retryCount, update error
```

---

## Retry Schedule

| Attempt | Backoff Delay | Total Time |
|---------|---------------|------------|
| 1st | 5 minutes | 5 min |
| 2nd | 5 minutes | 10 min |
| 3rd | 5 minutes | 15 min |
| Fail | — | Logged, no more retries |

Example timeline:
```
10:00 AM - Webhook received, processing fails
10:05 AM - Retry #1
10:10 AM - Retry #2
10:15 AM - Retry #3
10:20 AM - Webhook failed permanently, alert admin
```

---

## Database Schema

### whatsapp_webhook_logs

```sql
-- Fields for DLQ tracking:
processed         BOOLEAN        -- Whether webhook was processed successfully
signatureValid    BOOLEAN        -- HMAC signature verification result
processingError   TEXT           -- Error message from last processing attempt
processedAt       TIMESTAMP      -- When webhook was successfully processed
retryCount        INTEGER        -- Number of retry attempts (0-3)
lastRetryAt       TIMESTAMP      -- When last retry was attempted
```

### Workflow

```
Initial state: processed=false, retryCount=0
              ↓
Immediate processing attempt
              ├─ Success → processed=true, processedAt=NOW ✓
              └─ Failure → retryCount=1, lastRetryAt=NOW, processingError=msg
                          ↓
                    Job retry in 5 min
                          ↓
                    Retry #2 attempt
                          ├─ Success → processed=true ✓
                          └─ Failure → retryCount=2, lastRetryAt=NOW
                                      ↓
                                Retry #3 attempt
                                      ├─ Success → processed=true ✓
                                      └─ Failure → retryCount=3, lastRetryAt=NOW
                                                  → ALERT: Max retries exceeded
```

---

## Setup

### Vercel (Automatic)

`vercel.json` already includes:
```json
{
  "crons": [
    {
      "path": "/api/v1/jobs/webhook-retry",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Just deploy:
```bash
vercel deploy --prod
```

### Self-hosted (Linux/Mac)

```bash
# Add to crontab (every 5 minutes)
crontab -e

# Add this line:
*/5 * * * * curl -X POST https://your-domain.com/api/v1/jobs/webhook-retry \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

### Docker Compose

```yaml
services:
  cron:
    image: mcuadros/ofelia:latest
    environment:
      - OFELIA_JOB_EXEC_retry="curl -X POST http://app:3000/api/v1/jobs/webhook-retry -H 'x-cron-secret: SECRET'"
      - OFELIA_JOB_EXEC_retry_SCHEDULE="*/5 * * * *"
```

---

## Monitoring

### Check Pending Webhooks

```bash
# Get count of pending webhooks
curl "https://your-domain.com/api/v1/jobs/webhook-retry?secret=YOUR_CRON_SECRET"

# Response:
# {
#   "success": true,
#   "isRunning": false,
#   "jobType": "webhook-retry",
#   "pendingWebhooks": 5
# }
```

### Database Queries

```sql
-- Find all failed webhooks
SELECT id, eventType, retryCount, processingError, lastRetryAt
FROM whatsapp_webhook_logs
WHERE processed = false
ORDER BY lastRetryAt DESC;

-- Find webhooks that exceeded max retries
SELECT id, eventType, retryCount, processingError
FROM whatsapp_webhook_logs
WHERE processed = false AND retryCount >= 3
ORDER BY createdAt DESC;

-- View retry history for specific webhook
SELECT * FROM whatsapp_webhook_logs
WHERE id = 'webhook-id-here'
ORDER BY createdAt DESC;

-- Count webhooks by status
SELECT
  processed,
  retryCount,
  COUNT(*) as count
FROM whatsapp_webhook_logs
WHERE createdAt > NOW() - INTERVAL '1 day'
GROUP BY processed, retryCount
ORDER BY count DESC;
```

---

## Signature Validation

Only webhooks with **valid signatures** are retried:
- `signatureValid = true` → Retry allowed
- `signatureValid = false` → Webhook is skipped (possible attack)

This prevents retrying corrupted or malicious payloads.

---

## Error Scenarios

### Case 1: Temporary Network Error
```
Attempt 1: Connection timeout → processingError="ECONNREFUSED"
Attempt 2 (5 min later): Succeeds ✓
Result: Webhook processed successfully
```

### Case 2: Invalid Token
```
Attempt 1: 401 Unauthorized → processingError="Invalid access token"
Attempt 2 (5 min later): Still 401 → retryCount=2
Attempt 3 (5 min later): Still 401 → retryCount=3
Result: ALERT - Token expired, needs manual intervention
```

### Case 3: Database Constraint
```
Attempt 1: Duplicate entry → processingError="Unique constraint violation"
Attempt 2: Succeeds (race condition resolved) ✓
Result: Webhook processed successfully
```

---

## Troubleshooting

### Webhooks stuck at retryCount=2

**Problem:** Webhook retried twice but still failing

**Solutions:**
1. Check `processingError` field for exact error
2. Verify Meta API token is valid
3. Check database for constraint violations
4. Review logs for timeout/rate limit errors

### Job not running on Vercel

**Problem:** Webhook retry job never executes

**Solution:**
1. Verify `vercel.json` is in root directory
2. Check Vercel project settings (Settings → Cron Jobs)
3. Ensure environment variable `CRON_SECRET` is set
4. Deploy with `vercel deploy --prod`

### Too many pending webhooks

**Problem:** Backlog growing (pending count increasing)

**Solutions:**
1. Check if retry job is running: `GET /api/v1/jobs/webhook-retry?secret=...`
2. Check if signatures are invalid: `SELECT COUNT(*) WHERE signatureValid = false`
3. Increase retry frequency (currently 5 min)
4. Check Meta webhook payload format hasn't changed
5. Review logs for processing errors

---

## Performance Tuning

### Increase Retry Frequency

For critical applications, retry more often:
```json
{
  "crons": [
    {
      "path": "/api/v1/jobs/webhook-retry",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

### Process More Webhooks Per Job

In `webhook-retry.job.ts`, change `take:`:
```typescript
const failedWebhooks = await prisma.whatsAppWebhookLog.findMany({
  // ... where clause ...
  take: 100, // Process max 100 instead of 50
});
```

### Adjust Backoff Strategy

For time-sensitive webhooks, reduce backoff:
```typescript
// In checkExponentialBackoff function:
const backoffMs = (retryCount + 1) * 3 * 60 * 1000; // 3 min instead of 5 min
```

---

## Metrics & Alerts

### Key Metrics to Monitor

```sql
-- Webhook success rate
SELECT
  COUNT(CASE WHEN processed = true THEN 1 END) * 100.0 / COUNT(*) as success_rate
FROM whatsapp_webhook_logs
WHERE createdAt > NOW() - INTERVAL '1 hour';

-- Average retries
SELECT AVG(retryCount) as avg_retries
FROM whatsapp_webhook_logs
WHERE createdAt > NOW() - INTERVAL '1 hour';

-- Failed webhooks per event type
SELECT eventType, COUNT(*) as count
FROM whatsapp_webhook_logs
WHERE processed = false AND retryCount >= 3
GROUP BY eventType
ORDER BY count DESC;
```

### Alert Conditions

Send alerts when:
1. `pendingWebhooks > 100` - Backlog building up
2. `max_retries_exceeded_in_5min > 10` - Too many permanent failures
3. `invalid_signatures_in_5min > 5` - Possible attack or configuration issue
4. `retry_job_failed` - Retry job itself failed to execute

---

## References

- [Dead Letter Queue Pattern](https://en.wikipedia.org/wiki/Dead_letter_queue)
- [Exponential Backoff Strategy](https://en.wikipedia.org/wiki/Exponential_backoff)
- [Meta Webhook Reliability](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/understand-webhooks)
