# AbacatePay Setup Checklist

## ✅ Fase de Desenvolvimento (localhost)

### 1. Configurar Webhook Local

Para testar webhooks em localhost, use um serviço de tunneling:

**Opção A: ngrok (Recomendado)**
```bash
# Download: https://ngrok.com/download
ngrok http 3000

# Output:
# Forwarding    https://abc123.ngrok.io -> http://localhost:3000
```

**Opção B: localtunnel**
```bash
npm install -g localtunnel
lt --port 3000 --subdomain whatrack-dev

# Output:
# your url is: https://whatrack-dev.loca.lt
```

### 2. Atualizar .env para Dev

```env
ABACATEPAY_WEBHOOK_URL=https://abc123.ngrok.io/api/v1/billing/webhook
```

### 3. Testar Webhook Localmente

Via Postman ou curl:

```bash
#!/bin/bash

SECRET="whsec_test_dummy_secret_key_32chars"
PAYLOAD='{"id":"evt_test_123","type":"billing.paid","timestamp":"2026-02-28T10:30:00Z","data":{"billing":{"id":"bill_123","externalId":"org-test-id","amount":9700,"status":"PAID"}}}'

SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d ' ' -f 2)

curl -X POST http://localhost:3000/api/v1/billing/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

---

## ✅ Fase de Produção (whatrack.com)

### 1. Obter Credenciais AbacatePay

- [ ] Criar conta em [AbacatePay](https://abacatepay.com)
- [ ] Acessar [Dashboard](https://dashboard.abacatepay.com)
- [ ] Gerar chaves de API:
  - [ ] `ABACATEPAY_SECRET_KEY` (sandbox + live)
  - [ ] `NEXT_PUBLIC_ABACATEPAY_PUBLIC_KEY` (sandbox + live)

### 2. Configurar Variáveis de Ambiente

#### Produção (live keys)
```env
# .env.production ou .env
ABACATEPAY_SECRET_KEY=abc_live_xxxxxxxxxxxxx
NEXT_PUBLIC_ABACATEPAY_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
ABACATEPAY_WEBHOOK_SECRET=whsec_live_xxxxxxxxxxxxx
ABACATEPAY_WEBHOOK_URL=https://whatrack.com/api/v1/billing/webhook
```

#### Staging (sandbox keys)
```env
ABACATEPAY_SECRET_KEY=abc_dev_xxxxxxxxxxxxx
NEXT_PUBLIC_ABACATEPAY_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
ABACATEPAY_WEBHOOK_SECRET=whsec_test_xxxxxxxxxxxxx
ABACATEPAY_WEBHOOK_URL=https://staging.whatrack.com/api/v1/billing/webhook
```

### 3. Configurar Webhook no Dashboard AbacatePay

1. **Acesso ao Dashboard**
   - Log in: https://dashboard.abacatepay.com
   - Navigate: Settings → Webhooks

2. **Criar Webhook**
   - Clique "Add Webhook"
   - **URL**: `https://whatrack.com/api/v1/billing/webhook`
   - **Eventos** (selecione todos):
     - [ ] ✅ billing.paid
     - [ ] ✅ subscription.created
     - [ ] ✅ subscription.cancelled
     - [ ] ✅ subscription.updated
     - [ ] ✅ payment.failed
   - [ ] ✅ Clique "Create"

3. **Copiar Webhook Secret**
   - AbacatePay gera automaticamente
   - Copie e adicione em `.env`:
     ```env
     ABACATEPAY_WEBHOOK_SECRET=whsec_live_xxxxxxxxxxxxx
     ```

### 4. Testar Webhook em Produção

#### Test Event via Dashboard
- No dashboard AbacatePay, há opção "Send Test Event"
- Escolha um tipo de evento (ex: `billing.paid`)
- Clique "Send"
- Verifique se chegou em `BillingWebhookLog`

#### Verificar no Banco de Dados
```sql
-- Conectar ao PostgreSQL
SELECT * FROM billing_webhook_logs
ORDER BY "createdAt" DESC
LIMIT 10;
```

### 5. Testar Fluxo Completo

#### Criar Subscription via API
```bash
curl -X POST https://whatrack.com/api/v1/billing/checkout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planType": "starter"}'
```

#### Registrar Evento
```bash
curl -X POST https://whatrack.com/api/v1/billing/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"eventType": "lead_qualified"}'
```

#### Verificar Uso
```bash
curl -X GET https://whatrack.com/api/v1/billing/usage \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 Checklist Final

- [ ] Credenciais AbacatePay obtidas
- [ ] `.env` configurado com valores reais
- [ ] Webhook criado no dashboard
- [ ] Webhook testado com test event
- [ ] Fluxo de checkout funciona end-to-end
- [ ] Eventos registrados corretamente
- [ ] Uso calculado corretamente
- [ ] Alertas configurados
- [ ] Documentação atualizada
- [ ] Team treinado no dashboard AbacatePay

---

## 📞 Suporte

- Docs: https://docs.abacatepay.com
- Status: https://status.abacatepay.com
- Email: support@abacatepay.com
