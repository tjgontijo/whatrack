# AbacatePay Webhook Configuration

## Overview

O AbacatePay precisa ser configurado para enviar eventos de webhook quando há alterações em subscriptions e pagamentos. Este documento descreve como configurar isso.

## Webhook Endpoint

**URL:** `https://seu-dominio.com/api/v1/billing/webhook`

**Método:** POST

**Autenticação:** HMAC-SHA256 signature validation via header `x-signature`

### Para Desenvolvimento (localhost)

Para testar webhooks localmente, use um serviço de tunneling:

```bash
# Opção 1: ngrok
ngrok http 3000
# Exemplo: https://abc123.ngrok.io

# Opção 2: localtunnel
npm install -g localtunnel
lt --port 3000 --subdomain whatrack-dev
# Exemplo: https://whatrack-dev.loca.lt
```

Então configure o webhook URL em `.env`:
```env
ABACATEPAY_WEBHOOK_URL=https://abc123.ngrok.io/api/v1/billing/webhook
```

## Configuração no Dashboard AbacatePay

### 1. Acessar Settings

1. Log in no [AbacatePay Dashboard](https://dashboard.abacatepay.com)
2. Vá para **Settings** → **Webhooks**

### 2. Adicionar Novo Webhook

Clique em **"Add Webhook"** e configure:

- **URL**: `https://seu-dominio.com/api/v1/billing/webhook`
- **Events**: Selecione os eventos:
  - ✅ `billing.paid` - Quando um pagamento é recebido
  - ✅ `subscription.created` - Quando uma subscription é criada
  - ✅ `subscription.cancelled` - Quando uma subscription é cancelada
  - ✅ `subscription.updated` - Quando uma subscription é atualizada (opcional)
  - ✅ `payment.failed` - Quando um pagamento falha

### 3. Obter Secret Key

Após criar o webhook, AbacatePay fornecerá um **Webhook Secret**. Configure em `.env`:

```env
ABACATEPAY_WEBHOOK_SECRET=whsec_live_xxxxxxxxxxxxx
```

## Validação de Assinatura

O webhook handler valida a assinatura HMAC-SHA256:

```typescript
// Header esperado
x-signature: <hmac-sha256-hash>

// O hash é calculado como:
hash = HMAC-SHA256(raw_body, ABACATEPAY_WEBHOOK_SECRET)
```

## Estrutura do Payload

### Evento: `billing.paid`

```json
{
  "id": "evt_123456",
  "type": "billing.paid",
  "timestamp": "2026-02-28T10:30:00Z",
  "data": {
    "billing": {
      "id": "bill_123456",
      "externalId": "org-uuid",
      "amount": 9700,
      "status": "PAID",
      "currency": "BRL"
    }
  }
}
```

### Evento: `subscription.created`

```json
{
  "id": "evt_123456",
  "type": "subscription.created",
  "timestamp": "2026-02-28T10:30:00Z",
  "data": {
    "subscription": {
      "id": "sub_123456",
      "externalId": "org-uuid",
      "status": "ACTIVE",
      "amount": 9700,
      "frequency": {
        "cycle": "MONTHLY",
        "dayOfProcessing": 1
      }
    }
  }
}
```

### Evento: `subscription.cancelled`

```json
{
  "id": "evt_123456",
  "type": "subscription.cancelled",
  "timestamp": "2026-02-28T10:30:00Z",
  "data": {
    "subscription": {
      "id": "sub_123456",
      "externalId": "org-uuid",
      "status": "CANCELLED"
    }
  }
}
```

### Evento: `payment.failed`

```json
{
  "id": "evt_123456",
  "type": "payment.failed",
  "timestamp": "2026-02-28T10:30:00Z",
  "data": {
    "billing": {
      "id": "bill_123456",
      "externalId": "org-uuid",
      "status": "FAILED",
      "failureReason": "card_declined"
    }
  }
}
```

## Processamento de Webhooks

O webhook handler implementado em `src/services/billing/handlers/payment-webhook.handler.ts`:

✅ **Valida assinatura HMAC-SHA256**
✅ **Deduplicação via eventId** - Previne duplicatas
✅ **Validação de timestamp** - Rejeita eventos > 5 min antigos
✅ **Retry logic** - Registra tentativas falhadas
✅ **Idempotente** - Seguro reprocessar

## Endpoint Details

**URL**: `POST /api/v1/billing/webhook`

**Headers esperados:**
```
x-signature: <hmac-sha256-hash>
Content-Type: application/json
```

**Respostas:**

- `200 OK` - Webhook processado com sucesso
  ```json
  {
    "ok": true,
    "message": "Successfully processed billing.paid webhook",
    "eventId": "evt_123456"
  }
  ```

- `401 Unauthorized` - Assinatura inválida
  ```json
  {
    "error": "Invalid signature"
  }
  ```

- `400 Bad Request` - Payload inválido
  ```json
  {
    "error": "Invalid webhook payload"
  }
  ```

- `429 Too Many Requests` - Rate limit excedido
  ```json
  {
    "error": "Too many requests",
    "retryAfter": 60
  }
  ```

## Testing com Postman

### 1. Gerar HMAC Signature

```javascript
// Instale crypto
const crypto = require('crypto');

const secret = "whsec_test_dummy_secret_key_32chars";
const payload = JSON.stringify({
  "id": "evt_test_123",
  "type": "billing.paid",
  "timestamp": new Date().toISOString(),
  "data": {
    "billing": {
      "id": "bill_123",
      "externalId": "org-test-id",
      "amount": 9700,
      "status": "PAID"
    }
  }
});

const signature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

console.log('Signature:', signature);
console.log('Payload:', payload);
```

### 2. Fazer Request no Postman

```
POST http://localhost:3000/api/v1/billing/webhook
Content-Type: application/json
x-signature: <signature-gerada>

{payload-json}
```

## Rate Limiting

O webhook tem rate limits:

- **IP**: 500 requisições/hora
- **Organization**: 2000 requisições/hora
- **Burst**: 50 requisições/minuto

Estes limites protegem contra abuso enquanto permitem alto volume de eventos.

## Troubleshooting

### Webhook não é recebido

1. Verifique se a URL está acessível (use ngrok para localhost)
2. Verifique se o firewall permite conexões de entrada
3. Verifique logs: `npm run dev` e procure por mensagens de webhook

### Assinatura inválida

1. Verifique se `ABACATEPAY_WEBHOOK_SECRET` está correto
2. Verifique se está usando o raw body (não parsed JSON)
3. Confirme no dashboard que o webhook foi criado corretamente

### Eventos não aparecem no BillingWebhookLog

1. Verifique se os eventos estão configurados no dashboard AbacatePay
2. Verifique se o webhook está "ativo" no dashboard
3. Teste com POST manual via Postman

## Production Deployment

Para produção:

1. **URL do webhook**: Use domínio produção
   ```env
   ABACATEPAY_WEBHOOK_URL=https://whatrack.com/api/v1/billing/webhook
   ```

2. **Secret**: Use secret real (não dummy)
   ```env
   ABACATEPAY_WEBHOOK_SECRET=whsec_live_xxxxxxxxxxxxx
   ```

3. **Monitorar**: Setup alertas para webhooks falhados
   - Verifique `BillingWebhookLog.processingError`
   - Configure retry automático via scheduler (Phase 5)

## Referências

- [AbacatePay API Docs](https://docs.abacatepay.com)
- [Webhook Security Best Practices](https://docs.abacatepay.com/webhooks)
- [Event Types Reference](https://docs.abacatepay.com/webhooks/events)
