# Stripe Setup Guide

This document walks through setting up Stripe billing for WhaTrack.

## Overview

WhaTrack now manages billing plans in the app and syncs Stripe Products/Prices from the admin catalog at `/dashboard/settings/billing`.

## Step 1: Create and Sync Plans from WhaTrack

1. Abra `/dashboard/settings/billing`
2. Crie ou edite os planos no catálogo interno
3. Sincronize cada plano com a Stripe pelo botão de sync

O catálogo interno é a fonte de verdade para:
- preço mensal
- trial de 7 dias
- limites de eventos
- preço de excedente
- quotas operacionais

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

## Step 3: Sync the Stripe Prices

Depois de salvar o plano no WhaTrack:

1. Clique em `Sincronizar com Stripe`
2. Verifique se o plano recebe:
   - `stripeProductId`
   - `stripePriceId`
   - `syncStatus = synced`
3. Valide no Stripe Dashboard que o Product/Price foi criado ou atualizado

## Step 4: Configure Usage-Based Pricing (Excedentes)

A cobrança de eventos extras é feita **via invoice item** no fechamento do ciclo, não via Stripe Usage Billing. O fluxo é:

```
Cron oficial de closeout roda em `POST /api/v1/cron/billing/close-cycles`
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
- `src/services/billing/billing-metering.service.ts` registra eventos com deduplicação por `externalId`
- `src/services/billing/billing-overage-closeout.service.ts` calcula excedente, cria `invoice item` e registra ledger
- `src/app/api/v1/cron/billing/close-cycles/route.ts` expõe o cron oficial para o `n8n`
- ciclos em trial não geram cobrança de excedente

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

## Step 5: Configure Customer Portal

Go to [Stripe Dashboard → Customer Portal](https://dashboard.stripe.com/settings/billing/portal):

1. Habilite o portal
2. Configure `Return URL` para `https://whatrack.com/dashboard/billing`
3. Ative pelo menos:
   - atualização de método de pagamento
   - acesso a invoices
   - troca entre planos self-serve
   - cancelamento da assinatura

O app também expõe cancelamento direto em `/dashboard/billing`, mas o portal continua sendo o caminho oficial de gestão ampla da assinatura.

## Step 6: Set Up Webhooks

Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks):

1. Click "Add endpoint"
2. **Endpoint URL**: `https://whatrack.com/api/v1/billing/webhooks/stripe`
3. **Events to send**: Select:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
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
5. Execute `POST /api/v1/cron/billing/close-cycles` para validar o closeout quando houver ciclo vencido

Antes do go-live, execute também:

- [BILLING_RELEASE_CHECKLIST.md](/Users/thiago/www/whatrack/docs/BILLING_RELEASE_CHECKLIST.md)
- [BILLING_SMOKE_CHECKLIST.md](/Users/thiago/www/whatrack/docs/BILLING_SMOKE_CHECKLIST.md)

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
ACTIVE_PAYMENT_PROVIDER=stripe             # Provider oficial
CRON_SECRET=...                            # Shared secret for n8n cron endpoints
```

## Production Setup

For production:
1. Switch to Live API keys (not test keys)
2. Use production webhook URL: `https://whatrack.com/api/v1/billing/webhooks/stripe`
3. Create live products and prices
4. Update environment variables in production deployment
5. Test with real payment (or small amount)

## Troubleshooting

### Webhook not firing?
- Check endpoint URL is publicly accessible
- Verify signing secret matches `.env` `STRIPE_WEBHOOK_SECRET`
- Check logs in Stripe Dashboard → Webhooks → Endpoint → Events

### Checkout failing?
- Verify the selected plan is synced in `/dashboard/settings/billing`
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
