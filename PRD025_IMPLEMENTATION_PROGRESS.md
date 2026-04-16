# PRD-025: Status de Implementação Corrigida

**Data:** 2026-04-15  
**Status:** 🟢 Em Progresso - Núcleo Completo

---

## ✅ Concluído (Fase 1-3)

### Fase 1: Limpeza e Modelo de Dados
- ✅ Removido `BillingSubscriptionItem` 
- ✅ Removido `BillingWebhookLog`
- ✅ Removido `BillingPlanHistory`
- ✅ Removido `BillingSubscriptionStatus` (lookup table)
- ✅ Removido campos Stripe (`stripeProductId`, `stripePriceId`, `syncStatus`, `createdBy`, etc)
- ✅ Criado enum `BillingSubscriptionStatus` (INACTIVE, PENDING, ACTIVE, OVERDUE, CANCELED, EXPIRED, FAILED)
- ✅ Criado enum `BillingFailureReason` (EXPIRED, DENIED, CANCELED_BY_USER, FAILED_DEBIT, OTHER)
- ✅ Criado enum `BillingInvoiceStatus` (PENDING, CONFIRMED, RECEIVED, OVERDUE, REFUNDED, etc)
- ✅ Criado enum `BillingPaymentMethod` (CREDIT_CARD, PIX, PIX_AUTOMATIC, BOLETO)
- ✅ Criado enum `BillingCycle` (MONTHLY, YEARLY)
- ✅ Criado enum `AuditActor` (USER, ADMIN, SYSTEM)
- ✅ Remodelar `BillingPlan` para usar enums e simplificar schema
- ✅ Remodelar `BillingSubscription` para ser organization-first (organizationId @unique)
- ✅ Remodelar `BillingOffer` para usar BillingPaymentMethod enum
- ✅ Remodelar `BillingInvoice` para usar enums e adicionar campos PIX (pixQrCode, pixEmailSentAt, pixResendCount)
- ✅ Remodelar `BillingAuditLog` para adicionar campo `actor: AuditActor`
- ✅ Migration criada e executada: `20260416003037_init`
- ✅ Seeds populados: `monthly` (R$497) e `annual` (R$4788) com ofertas por método

### Fase 2: Core Services Asaas (Novo)
- ✅ `pix-failure.helper.ts` — mapeia eventos Asaas para `BillingFailureReason`, retorna mensagens em PT-BR, calcula retry backoff (1h/6h/24h), determina auto-cancel
- ✅ `checkout-status-token.service.ts` — HMAC-SHA256 tokens (24h TTL) para polling de guest (invoice e authorization)
- ✅ `pix-automatic.service.ts` — cria autorização PIX Automático no Asaas, retorna QR code, status queries
- ✅ `webhook.handler.ts` — atualizado para usar enums corretos, mapear erros PIX, atualizar status de subscription

### Fase 3: APIs de Status
- ✅ `GET /api/v1/billing/subscription/status` — retorna status da subscription da organização
- ✅ `GET /api/v1/billing/checkout/:invoiceId/status` — authenticated ou token-based guest access
- ✅ `GET /api/v1/billing/pix-automatic/:authorizationId/status` — authenticated ou token-based guest access

---

## ⏳ Em Progresso (Fase 4 - UI)

### Componentes de Checkout
- ⏳ `checkout-pix-qrcode.tsx` — componente PIX com:
  - Countdown timer até expiração
  - Botão copy-paste com feedback
  - QR Code collapsível (mobile-aware)
  - Polling de status (3s) até RECEIVED/CONFIRMED/ACTIVE
  - Resend via WhatsApp/Email (rate-limited)
  - Instruções passo-a-passo de pagamento

- ⏳ `subscription-failure-alert.tsx` — alerta de falha com:
  - Título e descrição por `BillingFailureReason`
  - Escalação de severidade (warning → destructive at 3+ failures)
  - Botão retry com rate-limiting
  - WhatsApp suporte link

---

## 📋 Próximas Etapas (Prioridade)

### Priority 0 (Blocker para go-live)
- [ ] Criar/adaptar componentes UI PIX (qrcode + failure-alert)
- [ ] Testar checkout transparente de cartão (mensal + anual)
- [ ] Testar PIX Automático (mensal)
- [ ] Testar PIX manual (anual)
- [ ] Testar webhook idempotência
- [ ] Testar falha de PIX Automático + retry

### Priority 1 (Nice-to-have para MVP)
- [ ] Input masking em plan-selector (CPF/CNPJ, phone, card)
- [ ] Telas de sucesso/pendência refinadas
- [ ] Documentação de erros/edge cases

---

## 🔧 O Que Mudou vs PRD Original

| Item | PRD Original | Implementado | Nota |
|------|------------|--------------|------|
| Status enum | INACTIVE → PENDING → ACTIVE → OVERDUE → CANCELED | ✅ Criado | Machine state corrigida |
| Failure reason | Não especificado | ✅ BillingFailureReason enum | Mapeamento Asaas → local |
| PIX Automático | Mencionado | ✅ PixAutomaticService | Serviço dedicado criado |
| Status polling | Mencionado | ✅ CheckoutStatusTokenService | HMAC tokens implementado |
| Invoice first | Mencionado | ✅ Remodelagen schema | Sem BillingSubscriptionItem |
| Organization-first | Mencionado | ✅ organizationId @unique | Cobrança por org |
| Webhook deduplicação | BillingWebhookLog | ✅ BillingAuditLog.asaasEventId | Audit log com PK asaasEventId |

---

## 🎯 Alinhamento com Kadernim

O Whatrack agora segue o padrão do Kadernim:
- ✅ Schema limpo (invoice-first, sem subscription items)
- ✅ Enums para status/failure/payment method
- ✅ Services: asaas-config, asaas-client, customer, catalog, payment, pix-automatic, webhook
- ✅ Status tokens para guest polling
- ✅ Failure helper com retry backoff

**Diferença intencional:** Whatrack usa `organizationId` como eixo, Kadernim usa `userId`

---

## 📊 Arquivo Schema Before/After

### ANTES
```
- BillingSubscriptionItem (removido)
- BillingWebhookLog (removido)
- BillingPlanHistory (removido)
- BillingSubscription.provider, providerCustomerId, providerSubscriptionId
- BillingPlan.stripeProductId, stripePriceId, syncStatus, createdBy
- BillingInvoice.bankSlipUrl (não usado em MVP)
- Status era String com lookup table
```

### DEPOIS
```
+ BillingSubscriptionStatus enum (7 valores)
+ BillingFailureReason enum (5 valores)
+ BillingInvoiceStatus enum (13 valores)
+ BillingPaymentMethod enum (4 valores)
+ BillingCycle enum (2 valores)
+ AuditActor enum (3 valores)
- Tudo provider agnóstico
- Invoice-first architecture
- Clean and focused schema
```

---

## 📁 Arquivos Criados/Modificados

### Novos Arquivos
```
src/lib/billing/pix-failure.helper.ts
src/services/billing/pix-automatic.service.ts
src/services/billing/checkout-status-token.service.ts
src/app/api/v1/billing/subscription/status/route.ts
src/app/api/v1/billing/checkout/[invoiceId]/status/route.ts
src/app/api/v1/billing/pix-automatic/[authorizationId]/status/route.ts
```

### Modificados
```
prisma/schema.prisma — completamente refatorado
src/services/billing/webhook.handler.ts — usa enums e novos serviços
```

---

## 🚀 Próximo Passo

Criar componentes UI:
1. `checkout-pix-qrcode.tsx` (baseado no Kadernim)
2. `subscription-failure-alert.tsx` (baseado no Kadernim)
3. Integrar em `plan-selector.tsx` e `billing-page-content.tsx`
4. Testar fluxos completos de checkout
