# Billing System Deployment Guide

## Issue: AbacatePay Checkout Failing on Production

### Root Cause
The production environment on Vercel is configured with **sandbox/development** AbacatePay credentials (`abc_dev_...`), which are invalid in the production environment.

### Errors
- **Server**: "AbacatePay checkout creation failed: 3 attempts were performed, all failed"
- **Client**: `POST /api/v1/billing/checkout 500 (Internal Server Error)`

### Solution

#### Step 1: Get Production AbacatePay Credentials

1. Log in to your **AbacatePay Dashboard** (https://dashboard.abacatepay.com)
2. Navigate to **Settings → API Keys**
3. Copy your **Production Secret Key** (starts with `abc_` not `abc_dev_`)
4. Copy your **Production Webhook Secret**

#### Step 2: Update Vercel Environment Variables

For **Production** environment:
```bash
# Get your real credentials from AbacatePay dashboard
ABACATEPAY_SECRET_KEY=abc_prod_YOUR_REAL_SECRET_KEY
ABACATEPAY_WEBHOOK_SECRET=YOUR_REAL_WEBHOOK_SECRET
ABACATEPAY_WEBHOOK_URL=https://whatrack.com/api/v1/billing/webhook
```

#### Step 3: Testing Strategy

**Local Development** (sandbox):
```bash
# Use development credentials from .env
ABACATEPAY_SECRET_KEY=abc_dev_WRrZNEhf5Ke4WXZXC4TsfMGy
ABACATEPAY_WEBHOOK_SECRET=e7ea8ebfb16adafd6a82e7a9eb3c848d
```

**Production (Vercel)**:
```bash
# Use real production credentials
ABACATEPAY_SECRET_KEY=abc_... (from dashboard)
ABACATEPAY_WEBHOOK_SECRET=... (from dashboard)
```

#### Step 4: Verify Webhook Configuration

1. In AbacatePay Dashboard, go to **Settings → Webhooks**
2. Set webhook URL to: `https://whatrack.com/api/v1/billing/webhook`
3. Ensure the webhook secret matches your `ABACATEPAY_WEBHOOK_SECRET`
4. Subscribe to: `subscription.created`, `subscription.updated`, `subscription.canceled`

#### Step 5: Test the Flow

1. Navigate to `/dashboard/billing`
2. Click "Comprar" on a plan
3. You should be redirected to AbacatePay checkout
4. Complete payment in sandbox mode
5. You should receive a webhook confirmation
6. Subscription should be active in the database

### Troubleshooting

#### Still getting 500 errors?
- **Clear build cache**: Delete `.next` folder and rebuild
- **Verify API routes**: Check that all routes are showing up in `npm run build`
- **Check logs**: Monitor Vercel logs in real-time with `vercel logs`

#### Webhook not firing?
- Verify webhook URL in AbacatePay dashboard
- Check webhook secret matches in environment variables
- Monitor webhook logs in AbacatePay dashboard
- Test webhook manually from AbacatePay dashboard

#### Getting 404 on billing routes?
- This was caused by stale build cache
- Solution: `rm -rf .next && npm run build`
- Redeploy to Vercel after cleanup

### Files Modified
- `.env` - AbacatePay credentials (Vercel only, not in git)
- `src/app/api/v1/billing/*` - API routes (all present and working)
- `src/services/billing/` - Business logic (all present and working)

### Recent Build Fix
```bash
# The clean build resolved missing routes issue
rm -rf .next
npm run build
# All 6 billing routes now appear in build output:
# ├ ƒ /api/v1/billing/cancel
# ├ ƒ /api/v1/billing/checkout
# ├ ƒ /api/v1/billing/events
# ├ ƒ /api/v1/billing/subscription
# ├ ƒ /api/v1/billing/usage
# └ ƒ /api/v1/billing/webhook
```

### Next Steps
1. Contact AbacatePay support to get production API keys
2. Update Vercel environment variables
3. Redeploy application
4. Test checkout flow end-to-end
5. Monitor webhook delivery in production
