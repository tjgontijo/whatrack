# Billing Quick Fix

## Quando usar

Use este guia quando checkout, webhook Stripe ou closeout de overage falharem perto do release.

## 1. Checkout retorna 500

Checklist:

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Confirmar:

- a chave é do ambiente correto
- o plano está sincronizado com a Stripe
- o usuário tem `email`, `name` e `phone`

## 2. Webhook chega, mas a assinatura não ativa

Confirmar na Stripe:

- URL: `https://whatrack.com/api/v1/billing/webhooks/stripe`
- signing secret correto
- eventos corretos:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

## 3. Retry operacional não roda

Confirmar no `n8n`:

- workflow ativo
- chamada `POST https://whatrack.com/api/v1/cron/system/webhook-retry`
- header `Authorization: Bearer ${CRON_SECRET}`

## 4. Overage não é cobrado

Confirmar:

- workflow `POST /api/v1/cron/billing/close-cycles` ativo no `n8n`
- assinatura fora de trial
- `billing_cycle_closeouts` sem erro

## 5. Smoke mínimo

Executar:

1. iniciar checkout
2. pagar
3. confirmar webhook processado
4. confirmar assinatura ativa ou `trialing`
5. abrir Customer Portal
6. confirmar estado atualizado no dashboard

Referências operacionais:

- [BILLING_RELEASE_CHECKLIST.md](/Users/thiago/www/whatrack/docs/BILLING_RELEASE_CHECKLIST.md)
- [BILLING_SMOKE_CHECKLIST.md](/Users/thiago/www/whatrack/docs/BILLING_SMOKE_CHECKLIST.md)
