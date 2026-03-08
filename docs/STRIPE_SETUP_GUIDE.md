# Stripe Setup Guide

This document walks through setting up Stripe products and prices for WhaTrack.

## Overview

The Stripe integration requires three products (Starter, Pro, Agency) with corresponding prices. These are referenced via environment variables.

## Step 1: Create Products and Prices (Automated via Script)

WhaTrack fornece um script que cria os produtos automaticamente via Stripe API:

```bash
npx tsx scripts/setup-stripe-products.ts
```

**O que o script faz:**
- ✅ Cria 3 produtos (Starter, Pro, Agency)
- ✅ Cria preço mensal recorrente para cada um
- ✅ Salva os Price IDs em `.env.local` automaticamente

**Output esperado:**
```
🚀 WhaTrack Stripe Products Setup
📦 Creating product: Starter...
   ✅ Product created: prod_1T5nigQrzlIAxgo4
   💰 Creating monthly price...
   ✅ Price created: price_1T5nigQrzlIAxgo4

📦 Creating product: Pro...
   ✅ Product created: prod_2T5nigQrzlIAxgo5
   💰 Creating monthly price...
   ✅ Price created: price_2T5nigQrzlIAxgo5

📦 Creating product: Agency...
   ✅ Product created: prod_3T5nigQrzlIAxgo6
   💰 Creating monthly price...
   ✅ Price created: price_3T5nigQrzlIAxgo6

✅ .env.local updated successfully
```

**Pronto!** Os preços foram criados e adicionados ao `.env.local`.

### Alternativa: Criar Manualmente

Se preferir, acesse [Stripe Dashboard → Products](https://dashboard.stripe.com/products):

#### Product 1: Starter
- **Name**: Starter
- **Description**: 200 events/month - Perfect for getting started

#### Product 2: Pro
- **Name**: Pro
- **Description**: 500 events/month - Scale your usage

#### Product 3: Agency
- **Name**: Agency
- **Description**: 5000 events/month - Enterprise-grade

## Step 2: Understand WhaTrack Pricing Structure

WhaTrack usa um modelo **híbrido de precificação**:

### Base do Plano (Assinatura Mensal)
- **Starter**: R$ 97/mês → 200 eventos/mês
- **Pro**: R$ 197/mês → 500 eventos/mês
- **Agency**: Sob consulta → 10.000 eventos/mês

### Cobrança de Excedente (Usage-Based Billing)
Eventos acima do limite são cobrados por unidade:
- **Starter**: R$ 0,25 por evento extra
- **Pro**: R$ 0,18 por evento extra
- **Agency**: R$ 0,12 por evento extra

**Exemplo prático:**
- Plano Starter com 250 eventos no mês
  - Assinatura: R$ 97
  - Excedente: 50 eventos × R$ 0,25 = R$ 12,50
  - **Total cobrado**: R$ 109,50

## Step 3: Create Recurring Prices

For each product, create a monthly recurring price:

### Starter Price (Assinatura Base)
1. Open the Starter product
2. Click "Add a price"
3. Configure:
   - **Billing period**: Monthly
   - **Price**: R$ 97.00 (ajuste conforme sua estratégia)
   - **Currency**: BRL
   - **Recurring**: Enabled, Monthly
4. Save and copy the Price ID (format: `price_xxx...`)
5. Add to `.env`:
   ```
   STRIPE_PRICE_STARTER=price_xxx
   ```

### Pro Price (Assinatura Base)
1. Open the Pro product
2. Click "Add a price"
3. Configure:
   - **Billing period**: Monthly
   - **Price**: R$ 197.00 (ajuste conforme sua estratégia)
   - **Currency**: BRL
   - **Recurring**: Enabled, Monthly
4. Save and copy the Price ID
5. Add to `.env`:
   ```
   STRIPE_PRICE_PRO=price_xxx
   ```

### Agency Price (Assinatura Base)
1. Open the Agency product
2. Click "Add a price"
3. Configure:
   - **Billing period**: Monthly
   - **Price**: R$ 497.00 (ou a negociado)
   - **Currency**: BRL
   - **Recurring**: Enabled, Monthly
4. Save and copy the Price ID
5. Add to `.env`:
   ```
   STRIPE_PRICE_AGENCY=price_xxx
   ```

## Step 4: Configure Usage-Based Pricing (Excedentes)

A cobrança de eventos extras é feita **via API** no final do período, não via Stripe Usage Billing. O fluxo é:

```
Fim do ciclo de 30 dias
    ↓
Sistema calcula: eventos_usados - limite_do_plano
    ↓
Se há excedente (> 0):
    - Cria item de fatura via Stripe API
    - Cobra: excedentes × preço_por_evento
    ↓
Stripe emite fatura com:
    - Assinatura recorrente: R$ 97
    - Item adicional (excedentes): R$ 12,50
    ↓
Cobrança total: R$ 109,50
```

**Implementação atual:**
- `src/lib/billing/plans.ts` define `overagePricePerEvent` para cada plano
- `src/services/billing/` calcula excedentes ao fim do ciclo
- Stripe API é chamada para criar invoice items adicionais

### Alternativa: Stripe Usage Billing (Futuro)

Se no futuro quisermos usar a feature de Usage Billing nativa da Stripe:

1. Criar preço com modo "Usage billing"
2. Para cada evento, chamar `usage_record.create()` na Stripe API
3. Stripe calcula e cobra automaticamente

**Vantagens:**
- Reconciliação automática com Stripe
- Dashboard do cliente atualizado em tempo real

**Desvantagens:**
- Requer chamada à Stripe API a **cada evento** (latência)
- Mais complexo de implementar

**Recomendação:** Manter modelo atual (cálculo local) enquanto volume for baixo.

## Step 6: Set Up Webhooks

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

## Step 7: Verify Configuration

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
