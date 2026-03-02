# Billing System Debug Summary - 2026-03-01

## 🔴 Issues Found

### 1. **Checkout 500 Error** (CRITICAL)
```
Error: Failed to create checkout session: AbacatePay checkout creation failed:
3 attempts were performed, all failed
```

**Root Cause**: Production environment using **sandbox credentials** (`abc_dev_...`)

**Why it fails**:
- AbacatePay SDK retries 3 times (maxRetry: 3)
- Each attempt fails because the dev key is invalid in production
- Server returns 500 error to client

### 2. **API Routes 404 Errors** (RESOLVED ✅)
```
GET /api/v1/billing/subscription 404
GET /api/v1/billing/usage 404
```

**Root Cause**: Stale `.next` build cache

**Solution Applied**:
```bash
rm -rf .next && npm run build
```

**Verification**:
```
✓ /api/v1/billing/checkout
✓ /api/v1/billing/subscription
✓ /api/v1/billing/usage
✓ /api/v1/billing/webhook
✓ /api/v1/billing/cancel
✓ /api/v1/billing/events
```

---

## 🔧 What You Need to Do

### Step 1: Get Production API Keys
1. Login to AbacatePay Dashboard: https://dashboard.abacatepay.com
2. Go to **Settings → API Keys**
3. Copy your **Production Secret Key** (format: `abc_prod_...`)
4. Copy your **Production Webhook Secret**

**Do NOT use development keys** (`abc_dev_...`) in production!

### Step 2: Update Vercel Environment Variables
Go to your Vercel project settings:

1. **Settings → Environment Variables**
2. Edit `ABACATEPAY_SECRET_KEY`:
   - Replace: `abc_dev_WRrZNEhf5Ke4WXZXC4TsfMGy`
   - With: Your real production key from AbacatePay dashboard

3. Edit `ABACATEPAY_WEBHOOK_SECRET`:
   - Replace with the production webhook secret

4. Keep `ABACATEPAY_WEBHOOK_URL`: `https://whatrack.com/api/v1/billing/webhook`

### Step 3: Configure Webhook in AbacatePay
1. AbacatePay Dashboard → **Settings → Webhooks**
2. Add webhook URL: `https://whatrack.com/api/v1/billing/webhook`
3. Select events: `subscription.created`, `subscription.updated`, `subscription.canceled`
4. Webhook secret should match `ABACATEPAY_WEBHOOK_SECRET`

### Step 4: Redeploy
```bash
# Automatic if using git push, or manually:
vercel --prod
```

### Step 5: Test the Flow
1. Go to homepage: `/` → Click "Comprar" on pricing plan
2. You should be redirected to **AbacatePay checkout**
3. Complete a test payment
4. You should be redirected to `/billing/success`
5. Check `/dashboard/billing` — subscription should be **ACTIVE**

---

## 📊 Environment Configuration Comparison

### Development (Local)
```env
ABACATEPAY_SECRET_KEY=abc_dev_WRrZNEhf5Ke4WXZXC4TsfMGy  ✓
NODE_ENV=development
```
✅ Works perfectly with sandbox

### Production (Vercel) - BEFORE
```env
ABACATEPAY_SECRET_KEY=abc_dev_WRrZNEhf5Ke4WXZXC4TsfMGy  ✗ WRONG!
NODE_ENV=production
```
❌ Dev key fails in production

### Production (Vercel) - AFTER
```env
ABACATEPAY_SECRET_KEY=abc_prod_YOUR_REAL_KEY           ✓
NODE_ENV=production
```
✅ Production key works in production

---

## 🚨 Troubleshooting

### Still getting checkout 500?
- [ ] Verify Vercel has new env vars
- [ ] Run `npm run build` locally to test
- [ ] Check Vercel logs in real-time: `vercel logs`
- [ ] Redeploy after changing env vars

### Getting webhook errors?
- [ ] Confirm webhook URL in AbacatePay dashboard
- [ ] Webhook secret must match `ABACATEPAY_WEBHOOK_SECRET`
- [ ] Check webhook logs in AbacatePay dashboard
- [ ] Test webhook manually from AbacatePay dashboard

### Subscription not being created after payment?
- [ ] Check that webhook fired (AbacatePay dashboard)
- [ ] Check database logs for errors
- [ ] Verify auth is working (organization context)

---

## 📁 Files Modified

**Documentation** (NEW):
- `docs/BILLING_DEPLOYMENT.md` - Complete deployment guide
- `scripts/test-billing-config.ts` - Diagnostic script
- `BILLING_DEBUG_SUMMARY.md` - This file

**API Routes** (VERIFIED):
- `src/app/api/v1/billing/checkout/route.ts` ✓
- `src/app/api/v1/billing/subscription/route.ts` ✓
- `src/app/api/v1/billing/usage/route.ts` ✓
- `src/app/api/v1/billing/webhook/route.ts` ✓
- `src/app/api/v1/billing/cancel/route.ts` ✓
- `src/app/api/v1/billing/events/route.ts` ✓

**Services** (VERIFIED):
- `src/services/billing/billing-checkout.service.ts` ✓
- `src/services/billing/billing-subscription.service.ts` ✓
- `src/services/billing/billing-metering.service.ts` ✓

---

## ✅ Validation Checklist

After following the steps above:

- [ ] Got real production API key from AbacatePay
- [ ] Updated Vercel environment variables
- [ ] Configured webhook in AbacatePay dashboard
- [ ] Redeployed to production
- [ ] Tested checkout flow end-to-end
- [ ] Verified subscription in database
- [ ] Received webhook successfully
- [ ] Checked responsive design on mobile

---

## 🎯 Next Steps

1. **Immediately**: Get production API keys and update Vercel
2. **Today**: Test checkout flow on staging/production
3. **This week**: Monitor webhook delivery and payments
4. **Ongoing**: Set up alerts for failed checkouts/webhooks

---

## 📞 Support Resources

- **AbacatePay Docs**: https://docs.abacatepay.com
- **AbacatePay Dashboard**: https://dashboard.abacatepay.com
- **Vercel Env Vars**: https://vercel.com/docs/projects/environment-variables
- **This Project**: See `docs/BILLING_DEPLOYMENT.md` for detailed guide

---

**Status**: Ready to fix once you have production API keys! 🚀
