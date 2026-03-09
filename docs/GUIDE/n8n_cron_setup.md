# N8N Cron Setup

## Objetivo

Configurar o `n8n` como scheduler oficial da V1.

## Jobs Oficiais

### 1. AI Classifier

- método: `POST`
- URL: `https://whatrack.com/api/v1/cron/ai/classifier`
- frequência: a cada `1 minuto`

```bash
curl -X POST 'https://whatrack.com/api/v1/cron/ai/classifier' \
  -H 'Authorization: Bearer ${CRON_SECRET}' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### 2. Webhook Retry

- método: `POST`
- URL: `https://whatrack.com/api/v1/cron/system/webhook-retry`
- frequência: a cada `5 minutos`

```bash
curl -X POST 'https://whatrack.com/api/v1/cron/system/webhook-retry' \
  -H 'Authorization: Bearer ${CRON_SECRET}' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### 3. Billing Close Cycles

- método: `POST`
- URL: `https://whatrack.com/api/v1/cron/billing/close-cycles`
- frequência: a cada `15 minutos`

```bash
curl -X POST 'https://whatrack.com/api/v1/cron/billing/close-cycles' \
  -H 'Authorization: Bearer ${CRON_SECRET}' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### 4. WhatsApp Health Check

- método: `POST`
- URL: `https://whatrack.com/api/v1/cron/whatsapp/health-check`
- frequência: `1 vez por dia`

```bash
curl -X POST 'https://whatrack.com/api/v1/cron/whatsapp/health-check' \
  -H 'Authorization: Bearer ${CRON_SECRET}' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## Configuração do Node HTTP Request

- `Method`: `POST`
- `URL`: endpoint do job
- `Authentication`: `None`
- `Headers`:
  - `Authorization: Bearer <CRON_SECRET>`
  - `Content-Type: application/json`
- `Body`: `{}`
- `Timeout`: explícito no node

## Regras

- usar timezone explícito no workflow
- não usar token em query string
- tratar qualquer `401` como erro de secret
- tratar `429` como lock ativo, não como falha de infraestrutura
