# 🚀 Billing System - Quick Fix Guide

## Problem
Billing checkout returns **500 Error** on production (Vercel), but works locally.

## Root Cause
Production uses **sandbox/development** AbacatePay credentials (`abc_dev_...`), which are invalid in production.

## ⚡ Quick Fix (5 minutes)

### 1. Get Production API Key
```
Go to: https://dashboard.abacatepay.com
→ Settings → API Keys
→ Copy "Production Secret Key" (starts with abc_, not abc_dev_)
→ Copy "Webhook Secret"
```

### 2. Update Vercel (60 seconds)
```
Go to: https://vercel.com/dashboard
→ Select your project
→ Settings → Environment Variables
→ Edit ABACATEPAY_SECRET_KEY
→ Paste your production key
→ Edit ABACATEPAY_WEBHOOK_SECRET
→ Paste your webhook secret
→ Save
```

### 3. Redeploy
```bash
git push  # Vercel auto-deploys
# OR manually:
vercel --prod
```

### 4. Test
```
Go to: https://whatrack.com/
→ Click "Comprar" on any plan
→ Should redirect to AbacatePay checkout ✓
```

## ✅ Verify it Works

After redeploy:
1. ✓ Checkout page loads
2. ✓ AbacatePay modal/redirect appears
3. ✓ Can complete test payment
4. ✓ Redirected to success page
5. ✓ Subscription appears in `/dashboard/billing`

## 🔍 What Was Wrong

| Environment | Key Type | Status |
|---|---|---|
| Local Dev | `abc_dev_...` | ✅ Works (sandbox) |
| Production | `abc_dev_...` | ❌ Fails (sandbox key invalid in prod) |
| Production | `abc_prod_...` | ✅ Works (production key) |

## 📚 More Info
- See `BILLING_DEBUG_SUMMARY.md` for detailed troubleshooting
- See `docs/BILLING_DEPLOYMENT.md` for complete guide
- All API routes verified: ✓ checkout, ✓ subscription, ✓ usage, ✓ webhook

---

**That's it!** Once you have the production API key from AbacatePay, it's just copy-paste to Vercel. 🎉
