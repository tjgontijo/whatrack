# Depuração: PRD-025 Billing Simplification — Status e Problemas Encontrados

**Data:** 2026-04-15  
**Status:** ⚠️ IMPLEMENTAÇÃO PARCIAL COM INCONSISTÊNCIAS CRÍTICAS

---

## Resumo Executivo

O PRD-025 foi **parcialmente implementado**, mas com **desvios significativos** do planejamento. A implementação atual está em **estado intermediário** com problemas que precisam ser resolvidos antes de um go-live confiável.

### Score de Conclusão por Fase

| Fase | Status | Score |
|------|--------|-------|
| Fase 1: Limpeza e Modelo | ⚠️ Parcial | 70% |
| Fase 2: Core Asaas | ✅ Completo | 90% |
| Fase 3: APIs do MVP | ⚠️ Parcial | 75% |
| Fase 4: UI do Checkout | ❌ Mínimo | 30% |
| Fase 5: Go-Live | ❌ Não iniciado | 0% |

---

## Problemas Encontrados

### 🔴 Problema 1: Stripe Ainda Presente no Runtime (CRÍTICO)

**Localização:** Múltiplas áreas do codebase

**Detalhes:**
- ✅ Rota `DELETE /api/v1/billing/webhooks/stripe` foi removida
- ✅ Rota `POST /api/v1/billing/portal` foi removida (antiga)
- ✅ Serviço `billing-plan-stripe-sync.service.ts` foi removido
- ✅ Webhook handler Stripe foi removido

**MAS:**
- ❌ `BillingSubscriptionItem` ainda existe no schema
- ❌ `BillingWebhookLog` ainda existe (deveria ser substituído por `BillingAuditLog` como idempotência)
- ❌ `BillingPlanHistory` ainda existe (marcado para remoção no PRD)
- ❌ Campos Stripe ainda presentes em `BillingPlan`:
  - `stripeProductId`
  - `stripePriceId`
  - `syncStatus`
  - `syncError`
  - `syncedAt`
  - `createdBy` (auditoria legada)
- ❌ Campos Stripe em `BillingSubscription`:
  - `provider` (deveria ser provider-agnostic)
  - `providerCustomerId`
  - `providerSubscriptionId`

**Impacto:** O schema ainda é agnóstico de provider, não Asaas-first. Isso cria ambiguidade e possibilita regredir para Stripe sem refactoring.

---

### 🔴 Problema 2: Modelo de Dados Não Alinhado com PRD (CRÍTICO)

**Localização:** `prisma/schema.prisma`

**Schema Atual vs. PRD:**

```
CAMPO / RELACIONAMENTO         | PRD-025 ESPERADO          | IMPLEMENTADO
-------------------------------|---------------------------|------------------------
BillingSubscription.organizationId | @unique (1:1)           | @unique ✅
BillingOffer.planId            | String (not null)         | String (not null) ✅
BillingInvoice.asaasId         | @unique (dedup)           | @unique ✅
BillingSubscription.asaasId    | String @unique            | String @unique ✅
BillingAuditLog                | Idempotência por evento   | Criado ✅
---
BillingSubscriptionItem        | ❌ DEVE SER REMOVIDO      | ❌ AINDA EXISTE
BillingWebhookLog              | ❌ DEVE SER REMOVIDO      | ❌ AINDA EXISTE
BillingPlanHistory             | ❌ FORA DO MVP            | ❌ AINDA EXISTE
```

**Problema Específico:**
- O schema atual permite `BillingSubscriptionItem` com lógica de "quantidade" e "unitPrice"
- PRD-025 assume modelo **invoice-first** onde cada cobrança é uma `BillingInvoice` simples
- Isso cria confusão entre:
  - Modelo antigo: subscription → items → preços variáveis
  - Modelo novo: subscription → invoices → um preço simples por oferta

**Impacto:** Código pode estar usando `BillingSubscriptionItem` em vez de apenas `BillingInvoice`, criando inconsistência.

---

### 🔴 Problema 3: Status de Assinatura Mapeado Incorretamente

**Localização:** `schema.prisma` (linha 1335) e `webhook.handler.ts`

**Problema:**
```prisma
status String @default("active")  // ❌ ERRADO
statusRef BillingSubscriptionStatus @relation(...)
```

**PRD-025 Esperado:**
```
INACTIVE -> PENDING -> ACTIVE -> OVERDUE -> CANCELED
```

**Implementado:**
- Usa `status: String` com valores como `'active' | 'paused' | 'canceled' | 'past_due'`
- Carrega `statusRef` como lookup via `BillingSubscriptionStatus`
- ❌ Não segue a máquina de estados do PRD

**Webhook Handler (linhas 48-69):**
```typescript
status: 'active'        // Correto para ACTIVE
status: 'past_due'      // Correto para OVERDUE
```

Mas schema usa `@default("active")` que não é "INACTIVE".

**Impacto:** Máquina de estados inconsistente com PRD. Assinaturas começam como "active" quando deveriam começar como "INACTIVE" ou "PENDING".

---

### 🟡 Problema 4: Autenticação de Webhook Implementada, Mas Sem Validação de Payload

**Localização:** `webhook.handler.ts` (linhas 14-19)

**O que está feito:**
```typescript
const authToken = request.headers.get('asaas-access-token')
if (!webhookToken || authToken !== webhookToken) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**O que está faltando:**
- ❌ Não há validação de assinatura HMAC ou SHA256 do payload
- ❌ Só valida o token no header, não a integridade da mensagem
- ⚠️ PRD diz "valida `asaas-access-token`" — implementado literalmente, mas pode ser insuficiente

**Recomendação:** Verificar com Asaas se o método atual é adequado ou se precisa validação de assinatura adicional.

---

### 🟡 Problema 5: Serviços Asaas Implementados, Mas Incompletos

**Localização:** `src/services/billing/`

**Checklist de Implementação:**

| Serviço | Status | Notas |
|---------|--------|-------|
| `asaas-config.service.ts` | ✅ Parcial | Lê env, mas sem validação de sandbox/prod |
| `asaas-client.ts` | ✅ Básico | Wrapper HTTP, sem tratamento de erros robusto |
| `customer.service.ts` | ✅ Existe | Resolve customer Asaas |
| `catalog.service.ts` | ✅ Existe | Carrega planos e ofertas |
| `payment.service.ts` | ✅ Parcial | 450+ linhas, mas pode ter gaps |
| `pix-automatic.service.ts` | ❌ NÃO EXISTE | ❌ Faltando! |
| `audit.service.ts` | ✅ Existe | Deduplicação de eventos |
| `webhook.handler.ts` | ✅ Parcial | Processa eventos, mas sem tratamento de erro robusto |

**Faltando:**
- Serviço separado para PIX Automático (estado de autorização)
- Testes unitários para os serviços Asaas
- Tratamento de timeout e retry
- Logging estruturado de eventos sensíveis

---

### 🟡 Problema 6: UI do Checkout Mínima ou Ausente

**Localização:** `src/components/dashboard/billing/`

**Status:**
```
✅ billing-page-content.tsx — Redesenhada
✅ billing-status.tsx — Existe
✅ plan-selector.tsx — Existe
❌ Formulário de checkout transparente — Mínimo ou faltando
❌ Coleta de dados de cartão — Faltando
❌ Tela de QR Code PIX — Faltando
❌ Polling de status PIX Automático — Faltando
❌ Tela de sucesso/pendência — Mínimo
```

**PRD Esperado:**
- Seletor de ciclo (`monthly` vs `annual`)
- Seletor de método (cartão selecionado por padrão)
- Formulário de dados de cobrança (nome, email, telefone, CPF/CNPJ)
- Campos de cartão (quando aplicável)
- Resumo de valor
- QR Code para PIX anual
- Status de autorização para PIX Automático

**Implementado:**
- ⚠️ Componentes existem, mas grau de completude é incerto
- ⚠️ Sem revisão visual confirmando alinhamento com PRD

---

### 🟡 Problema 7: Schemas de Validação Incompletos

**Localização:** `src/schemas/billing/billing-schemas.ts`

**Questões:**
- `checkoutRequestSchema` — valida quais campos exatamente?
- `checkoutResponseSchema` — retorna status token para polling?
- Há validação de `cpfCnpj` de verdade?
- Dados de cartão são sanitizados antes de chegar ao schema?

**Necessário:** Revisar schemas para confirmar segurança e completude.

---

### 🟡 Problema 8: Testes Incompletos ou Ausentes

**Localização:** `src/**/__tests__/`

**Status:**
```
✅ billing-plan-catalog.service.test.ts — Existe
✅ account-billing-card.test.tsx — Existe
✅ billing-page-content.test.tsx — Existe
❌ Testes para asaas-client.ts — Mínimo
❌ Testes para payment.service.ts — Faltando
❌ Testes para webhook.handler.ts — Faltando
❌ Testes para checkout transparente — Faltando
❌ Testes de PIX Automático — Faltando
❌ Testes de idempotência de webhook — Faltando
```

**Faltando:** Testes críticos para:
1. Duplicação de eventos webhook
2. Falha de PIX Automático
3. Cartão mensal com recorrência
4. Cartão anual como cobrança única
5. PIX anual com QR Code
6. Vencimento de cobrança

---

### 🟡 Problema 9: Documentação do Kadernim Não Trazida

**Referência:** PRD diz "reaproveitando o modelo do `kadernim`"

**Problema:**
- ✅ Arquitetura conceitual foi copiada
- ❌ Decisões específicas do Kadernim (tipos, schemas, fluxos) não foram documentadas aqui
- ❌ Se o Kadernim teve revisões/fixes pós-go-live, elas não foram capturadas

**Recomendação:** Trazer documentação de decisões do Kadernim que possam informar correções no Whatrack.

---

### 🟡 Problema 10: Migrations de Banco Pendentes

**Status:** ⚠️ CRÍTICO

```
✅ Criada: 20260416002901_init/
❌ Não executada: Migrations anteriores devem ser limpas
❌ Sem plano claro de qual estado inicial é esperado
```

**Questão:** Migrations antigas (20260324, 20260325, etc.) foram deletadas nos working changes, mas não há migration que as substitui completamente. Vai haver conflito ao rodar `prisma migrate`.

---

## Alinhamento com PRD-025: Checklist

### Fase 1: Limpeza e Modelo

- [x] Remover `providerRegistry` ✅
- [x] Remover rota Stripe webhook ✅
- [x] Remover rota portal Stripe ✅
- [x] Remover sync administrativo ✅
- [ ] ❌ Remover `BillingSubscriptionItem` — AINDA EXISTE
- [ ] ❌ Remover `BillingWebhookLog` — AINDA EXISTE (deveria ser audit)
- [ ] ❌ Remover `BillingPlanHistory` — AINDA EXISTE
- [x] Remodelar `BillingPlan` para `monthly | annual` ✅
- [x] Criar `BillingOffer` ✅
- [x] Remodelar `BillingSubscription` ✅ (mas com campos legados)
- [x] Criar `BillingInvoice` ✅
- [x] Criar `BillingAuditLog` ✅
- [x] Seeds `monthly` e `annual` ✅
- [x] Seeds de ofertas ✅

**Score Fase 1:** 70% — Schema remodelado, mas campos Stripe ainda presentes.

---

### Fase 2: Core Asaas

- [x] `asaas-config.service` ✅
- [x] `asaas-client.ts` ✅
- [x] `customer.service.ts` ✅
- [x] `catalog.service.ts` ✅
- [x] `payment.service.ts` ✅
- [ ] ❌ `pix-automatic.service.ts` — NÃO EXISTE
- [x] `checkout.service.ts` ✅ (como wrapper)
- [x] `webhook.handler.ts` ✅
- [x] `audit.service.ts` ✅
- [x] Validação de env (Asaas, API key, webhook token) ✅
- [ ] ⚠️ Tratamento de erro robusto — Parcial

**Score Fase 2:** 90% — Serviços existem, falta PIX Automático separado e robustez.

---

### Fase 3: APIs do MVP

- [x] `POST /api/v1/billing/checkout` ✅
- [x] `POST /api/v1/billing/webhook` ✅ (novo)
- [ ] ⚠️ `GET /api/v1/billing/subscription` — Existe, mas não revisado
- [ ] ⚠️ `GET /api/v1/billing/checkout/:invoiceId/status` — Não confirmado
- [ ] ⚠️ `GET /api/v1/billing/pix-automatic/:authorizationId/status` — Não confirmado
- [ ] ⚠️ `statusToken` para polling — Implementado? Não confirmado

**Score Fase 3:** 75% — Rotas básicas existem, mas status/polling podem estar incompletos.

---

### Fase 4: UI do Checkout

- [ ] ⚠️ Tela principal (plan selector) — Existe, não revisado
- [ ] ⚠️ Checkout transparente — Existe? Não confirmado
- [ ] ⚠️ Formulário de cartão — Não confirmado
- [ ] ⚠️ Tela de PIX Automático — Não confirmado
- [ ] ⚠️ Tela de QR Code PIX — Não confirmado
- [ ] ⚠️ Pós-checkout — Existe, não revisado

**Score Fase 4:** 30% — Componentes existem, mas precisam revisão visual completa.

---

### Fase 5: Go-Live

- [ ] ❌ Testes não executados
- [ ] ❌ Smoke tests não documentados
- [ ] ❌ Primeiro pagamento real não feito
- [ ] ❌ Monitoramento não configurado

**Score Fase 5:** 0% — Não iniciado.

---

## Recomendações Imediatas

### 1. **Limpar o Schema Completamente** (P0)

Remover:
```prisma
❌ BillingSubscriptionItem
❌ BillingWebhookLog
❌ BillingPlanHistory
❌ Campos Stripe de BillingPlan
❌ Campos de provider agnóstico de BillingSubscription
```

Substituir por:
```prisma
✅ Usar BillingAuditLog para idempotência
✅ Usar BillingInvoice como unidade de cobrança
✅ Manter organizationId como eixo de cobrança
```

**Escopo:** 1 migration, 1 dia de trabalho.

---

### 2. **Confirmar Comportamento da Máquina de Estados** (P0)

**Questão:** O estado inicial da subscription é `"active"` ou `"INACTIVE"`?

**PRD diz:** `INACTIVE -> PENDING -> ACTIVE -> OVERDUE -> CANCELED`

**Código diz:**
```typescript
@default("active")  // ❌ Não é "INACTIVE"
status: 'pending'   // Ao criar checkout
status: 'active'    // Ao confirmar webhook
```

**Ação:** Unificar enum e defini-lo no `BillingSubscriptionStatus`.

---

### 3. **Criar `pix-automatic.service.ts` Separado** (P1)

O `payment.service.ts` está crescendo demais. PIX Automático tem lógica específica:
- Criar autorização recorrente
- Acompanhar estado da autorização
- Processar webhooks de autorização
- Reautorizar em caso de falha

**Separar:** Toda lógica de PIX Automático para um serviço dedicado.

---

### 4. **Revisar e Completar Testes** (P1)

Prioridade:
1. Webhook idempotência (copiar payload 2x, confirmar que só processa 1x)
2. Cartão mensal (checkout → recorrência)
3. Cartão anual (checkout → cobrança única)
4. PIX Automático (autorização → confirmação)
5. PIX anual (QR Code → pagamento)

---

### 5. **Confirmar Segurança de Checkout Transparente** (P0)

Antes de go-live:
- [ ] Revisar `payment.service.ts` linha 70-90 (normalizeCard)
- [ ] Confirmar que dados de cartão nunca são logados
- [ ] Confirmar que o Asaas recebe dados brutos (não tokenizados)
- [ ] Confirmar `remoteIp` é repassado quando exigido
- [ ] Solicitar revisão Asaas do fluxo antes de produção

---

### 6. **Completar UI do Checkout** (P1)

Necessário:
- [ ] Formulário visível com todos os campos (cobrança + cartão)
- [ ] Seletor de método com cartão como padrão
- [ ] Tela de QR Code PIX anual
- [ ] Polling de status com visual de carregamento
- [ ] Tela de sucesso com status da assinatura

---

### 7. **Criar Runbook de Go-Live** (P1)

Baseado em "Fase 5" do PRD, documentar:
```
1. Teste cartão mensal em sandbox
2. Teste cartão anual em sandbox
3. Teste PIX Automático em sandbox
4. Teste PIX anual em sandbox
5. Teste duplicidade de webhook
6. Teste falha de autorização PIX Automático
7. Teste cobrança vencida
8. Smoke test em staging
9. Primeiro pagamento real controlado
10. Monitorar logs por 24h
```

---

## Checklist para Aprovação de PR

Antes de marcar PRD-025 como completo, este PR deve incluir:

- [ ] Schema limpo (sem campos legados)
- [ ] Migration novo
- [ ] Testes de webhook idempotência
- [ ] Testes de cartão (mensal + anual)
- [ ] Testes de PIX Automático
- [ ] Testes de PIX anual
- [ ] UI do checkout visualmente completa
- [ ] Documentação de erros e edge cases
- [ ] Runbook de go-live assinado

---

## Conclusão

**PRD-025 foi planejado bem, mas implementado com desvios.** A base conceitual (Asaas, invoice-first, webhook) está correta, mas há **trabalho de limpeza e completude necessário** antes de um go-live confiável.

**Status Recomendado:** 🟡 **Em Progresso — Aguardando Limpeza de Schema e Completude de Testes**

**Próximo Passo:** Aprovar limpar schema, remover campos legados e executar Fase 5 (go-live).

