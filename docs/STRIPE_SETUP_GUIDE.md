# Stripe Setup Guide

This document walks through setting up Stripe products and prices for WhaTrack.

## Overview

The Stripe integration requires three products (Starter, Pro, Agency) with corresponding prices. These are referenced via environment variables.

## Step 1: Create Products

Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products):

### Product 1: Starter
- **Name**: Starter
- **Description**: 200 events/month - Perfect for getting started
- **Type**: Service (default)
- **Save**

### Product 2: Pro
- **Name**: Pro
- **Description**: 500 events/month - Scale your usage
- **Type**: Service (default)
- **Save**

### Product 3: Agency
- **Name**: Agency
- **Description**: 5000 events/month - Enterprise-grade
- **Type**: Service (default)
- **Save**

## Step 2: Create Recurring Prices

For each product, create a monthly recurring price:

### Starter Price
1. Open the Starter product
2. Click "Add a price"
3. Configure:
   - **Billing period**: Monthly
   - **Price**: $29.00 (or your chosen price)
   - **Currency**: USD (or preferred)
   - **Recurring**: Enabled, Monthly
4. Save and copy the Price ID (format: `price_xxx...`)
5. Add to `.env`:
   ```
   STRIPE_PRICE_STARTER=price_xxx
   ```

### Pro Price
1. Open the Pro product
2. Click "Add a price"
3. Configure:
   - **Billing period**: Monthly
   - **Price**: $79.00 (or your chosen price)
   - **Currency**: USD (or preferred)
   - **Recurring**: Enabled, Monthly
4. Save and copy the Price ID
5. Add to `.env`:
   ```
   STRIPE_PRICE_PRO=price_xxx
   ```

### Agency Price
1. Open the Agency product
2. Click "Add a price"
3. Configure:
   - **Billing period**: Monthly
   - **Price**: $249.00 (or your chosen price)
   - **Currency**: USD (or preferred)
   - **Recurring**: Enabled, Monthly
4. Save and copy the Price ID
5. Add to `.env`:
   ```
   STRIPE_PRICE_AGENCY=price_xxx
   ```

## Step 3: Set Up Webhooks

Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks):

1. Click "Add endpoint"
2. **Endpoint URL**: `https://yourdomain.com/api/v1/billing/webhooks/stripe`
3. **Events to send**: Select:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Click "Add endpoint"
5. Copy the **Signing secret** (whsec_...)
6. Add to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

## Step 4: Verify Configuration

After updating `.env`:

```bash
npm run build  # Verify no errors with new prices
npm run dev    # Start dev server
```

Test the checkout flow:
1. Navigate to `/` (landing page)
2. Click "Comprar" for any plan
3. Complete checkout with test card: `4242 4242 4242 4242`
4. Verify webhook processing in [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)

## API Keys Location

- **Secret Key**: Used server-side (backend)
- **Publishable Key**: Can be used client-side (frontend)

Both are in [Stripe Settings → API Keys](https://dashboard.stripe.com/apikeys)

## Testing with Stripe Test Cards

| Card Number | CVC | Date | Result |
|---|---|---|---|
| 4242 4242 4242 4242 | Any | Any future date | Success |
| 4000 0000 0000 0002 | Any | Any future date | Decline |
| 4000 0000 0000 3220 | Any | Any future date | 3D Secure |

## Environment Variables Summary

```env
STRIPE_SECRET_KEY=sk_test_...              # From API Keys
STRIPE_PUBLISHABLE_KEY=pk_test_...         # From API Keys
STRIPE_WEBHOOK_SECRET=whsec_...            # From Webhook endpoint
STRIPE_PRICE_STARTER=price_...             # From Starter product
STRIPE_PRICE_PRO=price_...                 # From Pro product
STRIPE_PRICE_AGENCY=price_...              # From Agency product
ACTIVE_PAYMENT_PROVIDER=stripe             # Already set
```

## Production Setup

For production:
1. Switch to Live API keys (not test keys)
2. Use production webhook URL: `https://whatrack.com/api/v1/billing/webhooks/stripe`
3. Create live products and prices
4. Update environment variables in production deployment
5. Test with real payment (or small amount)

## Customer Portal

After a customer subscribes, they can access the Stripe Customer Portal via:
- Dashboard → Billing → "Gerenciar assinatura" button
- This redirects to Stripe's managed portal for:
  - Updating payment method
  - Changing billing email
  - Downloading invoices
  - Managing cancellation

## Troubleshooting

### Webhook not firing?
- Check endpoint URL is publicly accessible
- Verify signing secret matches `.env` `STRIPE_WEBHOOK_SECRET`
- Check logs in Stripe Dashboard → Webhooks → Endpoint → Events

### Checkout failing?
- Verify price IDs exist and are in `.env`
- Check API keys are not test/live mismatch
- Look at browser console for API errors

### Customer Portal not opening?
- Verify customer ID exists in Stripe
- Check Customer Portal settings in Stripe Dashboard

## References

- [Stripe API Docs](https://stripe.com/docs/api)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/customer-portal)
