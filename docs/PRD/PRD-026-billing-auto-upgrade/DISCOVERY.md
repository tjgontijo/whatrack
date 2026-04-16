# PRD-026: DISCOVERY — Achados do Sistema Atual

**Data:** 2026-04-16  
**Revisão do código:** commit 2be8b82

---

## 1. Estado Atual da Arquitetura de Billing

### 1.1 Como o Cliente Sabe Seu Plano Atual

**Fluxo atual:**
```
BillingSubscription.offerId (FK)
    ↓
BillingOffer (plano + método de pagamento)
    ↓
BillingOffer.planId (FK)
    ↓
BillingPlan (Starter, Pro, Business)
```

**Implicação:** Não há `currentPlanId` direto em BillingSubscription. Precisaremosadicionar para cache rápido.

### 1.2 Como Detecta Que Projeto Foi Criado

**Fluxo atual:**
```
POST /api/v1/projects (criar projeto)
    ↓
project.service.createProject()
    ↓
assertProjectCreationAllowed()  // Valida limite
    ↓
prisma.project.create()
    ↓
syncOrganizationSubscriptionItems()  // Recalcula entitlements
```

**O que faz `syncOrganizationSubscriptionItems`:**
- Busca subscription do cliente
- Busca plano da subscription
- Calcula `additionalProjects` (quantos projetos extras estão sendo usados)
- **Retorna apenas números, não faz upgrade**

**Implicação:** Já tem hook perfeito para detectar upgrade! Basta adicionar lógica depois do create.

### 1.3 Valores de Entitlements

**O sistema já calcula:**
```typescript
{
  includedProjects: number,
  activeProjects: number,
  additionalProjects: number,  // ← Projetos extras (não cobrados hoje)
  includedWhatsAppPerProject: number,
  additionalWhatsAppNumbers: number,
  includedMetaAdAccountsPerProject: number,
  additionalMetaAdAccounts: number,
  includedConversionsPerProject: number,
}
```

**Implicação:** Lógica de cálculo de limite já existe. Precisa apenas expandir para trigger de upgrade.

---

## 2. Problemas Identificados

### Problema 1: Sem Histórico de Mudanças de Plano do Cliente

**Existe:**
- `BillingPlanHistorySheet` (UI)
- `BillingAuditLog` para ações administrativas (ex: alterar preço do plano)

**NÃO existe:**
- Tabela `BillingPlanHistory` para mudanças de plano do cliente
- Campo que rastreia "cliente X saiu de Starter e entrou em Pro"

**Solução:** Criar tabela conforme PRD.

### Problema 2: Invoice.value é Float, Não Decimal

**Atual:**
```prisma
model BillingInvoice {
  value    Float  // ❌ Pode perder precisão
}
```

**Deveria ser:**
```prisma
value    Decimal  @db.Decimal(10, 2)
```

**Implicação:** Pode haver arredondamentos incorretos. Recomendo alterar antes de implementar prorating (para não propagar erro).

### Problema 3: PIX Está Distribuído no Schema

**Campos com PIX:**
- `BillingSubscription.pixAutomaticAuthId`
- `BillingInvoice.pixQrCode`, `pixQrCodePayload`, `pixQrCodeImage`, `pixExpirationDate`
- `BillingInvoice.pixEmailSentAt`, `pixWhatsappSentAt`, `pixResendCount`, `pixLastResendAt`
- `BILLING_PAYMENT_METHODS` enum inclui PIX_AUTOMATIC, PIX

**Decisão:**
- **NÃO remover colunas** (causaria migration complexa, quebra schema)
- **Apenas não usar** na nova lógica
- Futuros features de PIX podem reutilizar essas colunas
- Manter PIX_AUTOMATIC, PIX nos tipos, mas comentar que é "futuro"

### Problema 4: BillingSubscription Usa Lookup Tables

**Estrutura:**
```
BillingSubscription.status (String)
    ↓ FK para
BillingSubscriptionStatus.name (String unique)
    ↓
Campos: INACTIVE, PENDING, ACTIVE, OVERDUE, CANCELED, EXPIRED, FAILED
```

**Implicação:** Status é lookup table. Ao fazer upgrade, status deve permanecer o mesmo (ACTIVE), apenas muda offerId e plan.

### Problema 5: assertProjectCreationAllowed Tá Vazio Hoje

**Código atual:**
```typescript
export async function assertProjectCreationAllowed(organizationId: string) {
  // Apenas retorna, sem validação
}
```

**Será usado para:**
- Validar se trial (max 1 projeto)
- Validar se plano ativo
- Futuramente: bloquear se passar limite (mas PRD diz que não bloqueia)

---

## 3. O Que Muda

### 3.1 Adições ao Schema

**Novo:**
- `BillingPlanHistory` table
- `BillingSubscription.currentPlanId` (cache)
- `BillingSubscription.currentPlan` relation

**Alterações:**
- `BillingInvoice.value` Float → Decimal (IMPORTANTE)

### 3.2 Mudanças em Services

**`project.service.createProject`:**
```typescript
const created = await prisma.project.create(...)
await syncOrganizationSubscriptionItems(organizationId)
// ✨ NOVO:
await performAutoUpgradeIfNeeded(organizationId)
```

**Novo service:**
- `BillingAutoUpgradeService`
- `BillingPlanDetectionService`
- `BillingProratingService`
- `BillingPlanHistoryService`

### 3.3 Mudanças em UI

**Novo componente:**
- `BillingPlanInvoice` (exibe plano vigente em estilo card/invoice)

**Integração:**
- Adicionar em `BillingStatus` antes das faturas atuais

---

## 4. Risco: Nenhuma Migration do PIX

**Status hoje:** Sistema já suporta PIX (colunas, lógica no checkout, etc)

**Impacto da remoção:** 
- ❌ Remover colunas quebra dados históricos
- ❌ Remover PAYMENT_METHODS enum quebra tipos
- ✅ Apenas não usar é seguro

**Recomendação:** Documentar que PIX está "paused/future" no PRD, deixar código em paz.

---

## 5. Timing de Upgrade

### 5.1 Quando Exatamente?

**Opção A: Imediato (recomendado)**
```
Project criado → syncOrganizationSubscriptionItems → performAutoUpgrade
Timing: ~100ms
```

**Opção B: Background job**
```
Project criado → fila → job rodando depois
Timing: 5-60 segundos
```

**Decisão:** Opção A (imediato). É mais simples e o usuário não vai notar latência.

### 5.2 Transação

**Crítico:** Auto-upgrade DEVE ser atômico:
```typescript
await prisma.$transaction(async (tx) => {
  // Criar BillingPlanHistory
  // Encerrar plano anterior
  // Atualizar BillingSubscription.currentPlanId
  // Criar novo BillingInvoice
})
```

---

## 6. Entendimento de Trial

**Fluxo trial atual:**
1. Usuário cria conta → trial iniciado
2. `BillingSubscription` criada com `trialEndsAt = now() + 14 dias`
3. `isActive = false` durante trial
4. `status = INACTIVE` durante trial
5. Limite de 1 projeto é aplicado em `assertProjectCreationAllowed`

**Com novo sistema:**
6. Quando sai do trial, passa para plano pago
7. BillingPlanHistory criada com `reason: trial_to_paid`
8. Limite é liberado para o plano (Starter = 1, Pro = 3, etc)
9. Se tinha > 1 projeto no trial (improvável) → auto-upgrade

---

## 7. Perguntas Respondidas

| Pergunta | Resposta | Impacto |
|----------|----------|--------|
| Existe hook para detectar projeto criado? | Sim, `syncOrganizationSubscriptionItems` | Perfeito para trigger |
| Precisa remover colunas de PIX? | Não (apenas não usar) | Simples migração |
| Qual é o plano atual do cliente? | Via `subscription.offer.plan` | Adicionar cache com `currentPlanId` |
| O sistema bloqueia projetos extras? | Não hoje, tentava bloquear no trial | Não bloqueia (conforme PRD) |
| Invoice é numericamente preciso? | Não (Float) | Corrigir antes de prorating |

---

## 8. Checklist de Implementação

- [ ] Corrigir `BillingInvoice.value` Float → Decimal
- [ ] Adicionar `BillingPlanHistory` table
- [ ] Adicionar `BillingSubscription.currentPlanId` + relation
- [ ] Criar `BillingAutoUpgradeService`
- [ ] Criar `BillingPlanDetectionService`
- [ ] Criar `BillingProratingService`
- [ ] Criar `BillingPlanHistoryService`
- [ ] Adicionar hook em `project.service.createProject`
- [ ] Criar componente `BillingPlanInvoice`
- [ ] Integrar em `BillingStatus`
- [ ] Testes de auto-upgrade
- [ ] Testes de prorating
- [ ] Seed historical data para clientes atuais

---

## 9. Surpresas Evitadas

✅ **Descoberta:** `syncOrganizationSubscriptionItems` já conta projetos extras  
→ Reutilizar, não reinventar

✅ **Descoberta:** Não há tabela de histórico de plano do cliente  
→ Será nova adição (esperado no PRD)

✅ **Descoberta:** PIX está integrado mas pode ser ignorado  
→ Deixar como está, documentar como futuro

✅ **Descoberta:** BillingSubscription usa lookup tables  
→ Manter padrão (não quebra transações)

✅ **Descoberta:** Trial é controlado por `trialEndsAt`  
→ Funciona com auto-upgrade (compatível)

