# Billing Release Checklist

## Escopo

Este checklist fecha a operação real do billing em produção.

Premissas atuais:

- Stripe é o único provider de billing
- checkout self-serve é cartão only
- trial padrão é de `7 dias grátis`
- overage é cobrado via `invoice item` no fechamento do ciclo
- scheduler oficial roda via `n8n`

## Go/No-Go

O billing só pode ser considerado pronto para release se todos os itens abaixo estiverem aprovados:

- envs obrigatórias definidas no ambiente correto
- catálogo sincronizado com Stripe
- webhook Stripe entregue e processado
- Customer Portal abrindo corretamente
- cron de closeout ativo no `n8n`
- smoke obrigatório concluído sem erro

Se qualquer item acima falhar, o status é `no-go`.

## 1. Ambiente

Definir no ambiente de release:

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CRON_SECRET=...
ACTIVE_PAYMENT_PROVIDER=stripe
```

Confirmar:

- nenhuma chave `sk_test_` está em produção
- o segredo do webhook pertence ao endpoint ativo
- `ACTIVE_PAYMENT_PROVIDER` está explicitamente em `stripe`

## 2. Banco e catálogo

Antes do release:

1. aplicar migrations pendentes
2. executar seeds obrigatórios
3. abrir `/dashboard/settings/billing`
4. confirmar que os planos self-serve estão ativos
5. sincronizar cada plano com a Stripe
6. validar `syncStatus = synced`

Plano mínimo esperado no launch:

- `Starter`
- `Pro`

Regras:

- trial de `7 dias`
- `Agency` continua como `contactSalesOnly`

## 3. Stripe Dashboard

### API Keys

Confirmar no Stripe Dashboard:

- chave secreta live copiada para `STRIPE_SECRET_KEY`
- chave pública live copiada para `STRIPE_PUBLISHABLE_KEY`

### Customer Portal

Configurar o portal para suportar o fluxo real do app:

- atualização de método de pagamento
- acesso a invoices e histórico
- troca entre planos self-serve
- cancelamento da assinatura
- `return URL`: `https://whatrack.com/dashboard/billing`

Observação:

- o app também expõe cancelamento direto em `/dashboard/billing`
- o portal continua sendo o caminho oficial para gestão ampla da assinatura

### Webhook

Configurar endpoint:

- URL: `https://whatrack.com/api/v1/billing/webhooks/stripe`
- signing secret: mesmo valor de `STRIPE_WEBHOOK_SECRET`

Eventos mínimos:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## 4. Scheduler Oficial

O scheduler oficial roda no `n8n`.

Workflows obrigatórios:

- `POST https://whatrack.com/api/v1/cron/system/webhook-retry`
- `POST https://whatrack.com/api/v1/cron/billing/close-cycles`

Headers:

- `Authorization: Bearer ${CRON_SECRET}`
- `Content-Type: application/json`

Payload:

```json
{}
```

Frequências recomendadas:

- `system/webhook-retry`: a cada `5 minutos`
- `billing/close-cycles`: a cada `15 minutos`

Respostas esperadas:

- `200`: execução aceita
- `429`: lock ativo, tratar como execução concorrente protegida
- `401`: `CRON_SECRET` incorreto

## 5. Observabilidade mínima

Conferir antes do go-live:

- logs de webhook Stripe recebidos
- logs de webhook Stripe processados
- falhas de processamento visíveis
- logs de closeout visíveis
- falhas de criação de `invoice item` visíveis

Locais mínimos de verificação:

- tabela `billing_webhook_logs`
- tabela `billing_cycle_closeouts`
- logs com labels:
  - `[Stripe]`
  - `[BillingCloseout]`
  - `[BillingCloseCyclesCron]`

## 6. Checklist final de aprovação

Antes de liberar billing em produção:

1. confirmar envs
2. confirmar catálogo sincronizado
3. confirmar webhook ativo com secret correto
4. confirmar Customer Portal configurado
5. confirmar workflows do `n8n`
6. executar [BILLING_SMOKE_CHECKLIST.md](/Users/thiago/www/whatrack/docs/BILLING_SMOKE_CHECKLIST.md)
7. registrar resultado como `go` ou `no-go`
