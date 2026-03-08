# Billing Deployment Guide

## Objetivo

Subir billing da V1 com o contrato real do produto:

- checkout self-serve via AbacatePay
- ativação de assinatura por webhook
- cancelamento controlado no app por `status` e `canceledAtPeriodEnd`
- retry operacional via `n8n`

## Verdade Operacional da V1

- O checkout recorrente usa `MULTIPLE_PAYMENTS`.
- O contrato atual da AbacatePay usado pelo projeto não expõe endpoint oficial de cancelamento.
- Por isso, o cancelamento da V1 é refletido no Whatrack, não no provider.
- O webhook processa apenas `billing.paid`, `pix.paid` e `pix.expired`.

## Pré-requisitos

### Ambiente

Definir no ambiente de release:

```bash
ABACATEPAY_SECRET_KEY=abc_...
ABACATEPAY_WEBHOOK_SECRET=...
ABACATEPAY_WEBHOOK_URL=https://whatrack.com/api/v1/billing/webhook
CRON_SECRET=...
```

### Banco

Antes do launch:

1. aplicar migrations pendentes
2. executar os seeds de lookup tables
3. confirmar que `billing_subscription_status` está populada

## Webhook AbacatePay

Configurar no painel da AbacatePay:

- URL: `https://whatrack.com/api/v1/billing/webhook`
- secret: mesmo valor de `ABACATEPAY_WEBHOOK_SECRET`
- eventos:
  - `billing.paid`
  - `pix.paid`
  - `pix.expired`

Não usar:

- `subscription.created`
- `subscription.updated`
- `subscription.canceled`

Esses eventos não fazem parte do contrato atualmente processado pelo app.

## Scheduler Oficial

O scheduler oficial da V1 é externo via `n8n`.

Rotina obrigatória:

- `POST https://whatrack.com/api/v1/cron/system/webhook-retry`
- header: `Authorization: Bearer $CRON_SECRET`
- frequência recomendada: a cada 5 minutos

Exemplo:

```bash
curl -X POST https://whatrack.com/api/v1/cron/system/webhook-retry \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Smoke de Release

Executar na ordem:

1. abrir `/dashboard/billing`
2. iniciar checkout em `Starter` ou `Pro`
3. concluir pagamento
4. confirmar entrega do webhook
5. validar assinatura ativa no banco e no dashboard
6. executar cancelamento no app
7. validar estado final no dashboard

## Interpretação do Cancelamento

Na V1:

- `atPeriodEnd=true`: agenda encerramento do acesso ao fim do ciclo atual
- `atPeriodEnd=false`: encerra o acesso no Whatrack imediatamente

Isso precisa ser explicado ao suporte exatamente assim. Não prometer cancelamento no provider enquanto esse endpoint não existir no contrato da AbacatePay.

## Diagnóstico Rápido

### Checkout falhando com 500

Checar:

- `ABACATEPAY_SECRET_KEY` correta para produção
- identidade de cobrança completa do usuário e da organização
- logs do servidor para erro do provider

### Webhook não ativa assinatura

Checar:

- URL do webhook
- secret
- eventos corretos
- assinatura HMAC
- tabela `billing_webhook_logs`

### Retry não roda

Checar:

- workflow ativo no `n8n`
- `CRON_SECRET`
- resposta da rota `/api/v1/cron/system/webhook-retry`
