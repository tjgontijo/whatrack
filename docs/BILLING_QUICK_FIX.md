# Billing Quick Fix

## Quando usar

Use este guia quando o checkout ou o webhook de billing falharem perto do launch.

## 1. Checkout retorna 500

Checklist:

```bash
ABACATEPAY_SECRET_KEY=abc_...
ABACATEPAY_WEBHOOK_SECRET=...
```

Confirmar:

- a chave não é sandbox em produção
- o usuário tem `email`, `name` e `phone`
- a organização tem `cpf` ou `cnpj`

## 2. Webhook chega, mas a assinatura não ativa

Confirmar na AbacatePay:

- URL: `https://whatrack.com/api/v1/billing/webhook`
- secret correto
- eventos corretos:
  - `billing.paid`
  - `pix.paid`
  - `pix.expired`

Não usar eventos `subscription.*`.

## 3. Retry operacional não roda

Confirmar no `n8n`:

- workflow ativo
- chamada `POST https://whatrack.com/api/v1/cron/system/webhook-retry`
- header `Authorization: Bearer ${CRON_SECRET}`

Exemplo:

```bash
curl -X POST https://whatrack.com/api/v1/cron/system/webhook-retry \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 4. Cancelamento parece inconsistente

Lembrar a verdade operacional da V1:

- o app controla `status` e `canceledAtPeriodEnd`
- não existe endpoint oficial de cancelamento no provider adotado hoje
- o dashboard precisa refletir essa verdade, sem prometer cancelamento no provider

## 5. Smoke mínimo

Executar:

1. iniciar checkout
2. pagar
3. confirmar webhook processado
4. confirmar assinatura ativa no dashboard
5. cancelar
6. confirmar estado atualizado no dashboard
