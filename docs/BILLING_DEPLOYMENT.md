# Billing Deployment Guide

## Objetivo

Subir billing com Stripe como única verdade operacional do produto:

- checkout self-serve em cartão
- ativação e sincronização de assinatura via webhook Stripe
- cancelamento e troca de plano via Customer Portal
- overage fechado por cron oficial no `n8n`

## Pré-requisitos

### Ambiente

Definir no ambiente de release:

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CRON_SECRET=...
ACTIVE_PAYMENT_PROVIDER=stripe
```

### Banco

Antes do release:

1. aplicar migrations pendentes
2. executar seeds obrigatórios
3. confirmar que o catálogo de planos está populado e sincronizado

## Webhook Stripe

Configurar no painel da Stripe:

- URL: `https://whatrack.com/api/v1/billing/webhooks/stripe`
- signing secret: mesmo valor de `STRIPE_WEBHOOK_SECRET`
- eventos mínimos:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

## Scheduler Oficial

O scheduler oficial roda via `n8n`.

Rotinas obrigatórias:

- `POST https://whatrack.com/api/v1/cron/system/webhook-retry`
- `POST https://whatrack.com/api/v1/cron/billing/close-cycles`

Headers:

- `Authorization: Bearer $CRON_SECRET`

## Smoke de Release

Executar na ordem:

1. abrir `/dashboard/billing`
2. iniciar checkout em `Starter` ou `Pro`
3. concluir checkout com cartão
4. confirmar entrega do webhook Stripe
5. validar assinatura ativa ou `trialing`
6. abrir Customer Portal
7. validar cancelamento ou troca de plano

## Diagnóstico Rápido

### Checkout falhando com 500

Checar:

- `STRIPE_SECRET_KEY`
- plano selecionado sincronizado com a Stripe
- identidade de cobrança do usuário

### Webhook não sincroniza assinatura

Checar:

- URL do webhook
- signing secret
- eventos corretos
- tabela `billing_webhook_logs`

### Overage não fecha ciclo

Checar:

- workflow ativo no `n8n`
- `CRON_SECRET`
- resposta da rota `/api/v1/cron/billing/close-cycles`
