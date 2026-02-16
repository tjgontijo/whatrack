# Cron Jobs Setup Guide

This guide explains how to set up and configure cron jobs for WhaTrack.

## Overview

WhaTrack uses a **serverless-friendly job system** that works on:
- ✅ Vercel (recommended)
- ✅ Docker / Self-hosted
- ✅ Any HTTP-accessible server

**Key Jobs:**
1. **WhatsApp Health Check** - Validates tokens daily at 2 AM
2. **Webhook Retry (DLQ)** - Retries failed webhooks every 5 minutes

---

## Phase 2.2: Token Health Check (2 AM Daily)

### What it does:
- Validates all active WhatsApp tokens against Meta API
- Creates health records for audit trail
- Updates connection status (healthy/warning/error)
- Prevents alerts from stale data

### Setup on Vercel

**1. Ensure `vercel.json` exists in root:**
```json
{
  "crons": [
    {
      "path": "/api/v1/jobs/whatsapp-health-check",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**2. Add environment variable:**
```bash
# Generate a random secret
CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Add to Vercel project settings
```

**3. Deploy to Vercel:**
```bash
vercel deploy --prod
```

**4. Verify in Vercel dashboard:**
- Go to Settings → Cron Jobs
- Should see "Health Check" scheduled for 2 AM daily

### Setup on Self-hosted / Docker

**Option A: Cron daemon (Linux/Mac)**
```bash
# Create cron job (runs every day at 2 AM)
crontab -e

# Add this line:
0 2 * * * curl -X POST https://your-domain.com/api/v1/jobs/whatsapp-health-check \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

**Option B: External cron service (EasyCron, etc.)**
1. Go to https://www.easycron.com
2. Create new cron job
3. URL: `https://your-domain.com/api/v1/jobs/whatsapp-health-check`
4. Method: `POST`
5. Custom Headers: `x-cron-secret: YOUR_CRON_SECRET`
6. Schedule: `0 2 * * *` (2 AM daily)

**Option C: Manual testing**
```bash
# Test the endpoint
curl -X POST http://localhost:3000/api/v1/jobs/whatsapp-health-check \
  -H "x-cron-secret: 3a8f2e1b9c4d7a6f5e2b8c1d9a7f4e6b"

# Response:
# {
#   "success": true,
#   "jobId": "whatsapp-health-check-1702737600000",
#   "message": "WhatsApp health check completed"
# }
```

### Check Job Status

**Get if health check is running:**
```bash
curl "http://localhost:3000/api/v1/jobs/whatsapp-health-check?secret=YOUR_CRON_SECRET"

# Response:
# {
#   "success": true,
#   "isRunning": false,
#   "jobType": "whatsapp-health-check"
# }
```

---

## Environment Variables

### Required
```env
# Redis connection (for distributed locking)
REDIS_URL="redis://..."

# Secret key to prevent unauthorized job triggers
CRON_SECRET="your-random-secret-here"
```

### Generate a secure CRON_SECRET
```bash
# macOS/Linux
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Security

### Token Protection
- ✅ All cron endpoints require `CRON_SECRET` header
- ✅ Distributed locks prevent concurrent executions
- ✅ Failed jobs create audit trail in database

### Best Practices
1. **Generate a strong secret:** Use cryptographically secure random generator
2. **Rotate secrets regularly:** Update CRON_SECRET every 3-6 months
3. **Monitor execution:** Check logs for failed jobs
4. **Set alerts:** Notify admin if health check fails

---

## Monitoring

### Database Tables
```sql
-- View health check history
SELECT * FROM whatsapp_health
ORDER BY lastCheck DESC
LIMIT 10;

-- View connection status
SELECT id, wabaId, healthStatus, lastHealthCheckAt
FROM whatsapp_connections
ORDER BY lastHealthCheckAt DESC;

-- View webhook logs for failures
SELECT id, eventType, processed, processingError
FROM whatsapp_webhook_logs
WHERE processed = false
LIMIT 10;
```

### Logs
```bash
# Check Vercel logs
vercel logs

# Or Docker/self-hosted logs
tail -f logs/application.log | grep "HealthCheckJob"
```

---

## Troubleshooting

### Job not running on Vercel

**Problem:** Cron job never executes
**Solution:**
1. Verify `vercel.json` is in root directory
2. Check Vercel project settings (Settings → Cron Jobs)
3. Ensure environment variables are set
4. Deploy with `vercel deploy --prod`

### Unauthorized error (401)
```
Error: Unauthorized
```

**Solution:**
- Verify `CRON_SECRET` matches in request header
- Check header name is exactly `x-cron-secret` (lowercase)
- Ensure environment variable is set in Vercel

### Lock timeout
```
Error: Job already running, skipping (429)
```

**Solution:**
- Health check is still running from previous execution
- Redis lock will auto-expire in 1 hour
- Or manually clear: `redis-cli DEL "job-lock:whatsapp-health-check"`

### No tokens being validated

**Problem:** Health check runs but no tokens validated
**Solution:**
1. Verify connections exist: `SELECT COUNT(*) FROM whatsapp_connections WHERE status = 'active'`
2. Check tokens are encrypted: `SELECT COUNT(*) FROM whatsapp_configs WHERE accessToken IS NOT NULL`
3. Review logs for decryption errors

---

## Next: Phase 2.3 - Dead Letter Queue (DLQ)

Coming soon: Automatic retry of failed webhooks with exponential backoff.

---

## References

- [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs)
- [EasyCron](https://www.easycron.com)
- [Redis Distributed Locks](https://redis.io/docs/manual/client-side-caching/)
