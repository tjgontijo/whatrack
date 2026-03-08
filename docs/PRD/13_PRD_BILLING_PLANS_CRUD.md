# PRD: Billing Plans CRUD com Gerenciamento de Quotas

## Objetivo

Criar um **sistema administrativo completo** para gerenciar planos de billing, onde é possível:
- Definir preços, limites de eventos, valores de excedente
- Controlar quotas (WhatsApp, contas de anúncio, membros)
- Sincronizar automaticamente com Stripe
- Manter histórico de alterações para auditoria
- Sem necessidade de código

## Decisão de Produto

- Interface administrativa para gerenciar planos (UI + API)
- Sincronização bidirecional com Stripe
- Auditoria completa de alterações
- Versionamento de preços (suportar múltiplas versões simultâneas)
- Soft delete (arquivamento, não deleção real)

## Problema

Atualmente, adicionar novo plano ou alterar preço exige:
1. Editar `src/lib/billing/plans.ts`
2. Criar manualmente produto na Stripe
3. Copiar ID na mão
4. Fazer deploy

**Solução**: Interface de admin que faz tudo automaticamente.

## Estado Atual

- Planos hardcoded em `src/lib/billing/plans.ts`
- Preços na Stripe criados manualmente
- Sem histórico de alterações
- Sem versionamento de preços
- Sem sincronização automática

## Resultado Esperado

Ao final desta iniciativa:

```
┌─────────────────────────────────────┐
│  Admin Dashboard                    │
├─────────────────────────────────────┤
│  Planos de Faturamento              │
│                                      │
│  [Novo Plano]                       │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ Starter    R$ 97,00  Ativo   │   │
│  │ • 200 eventos/mês            │   │
│  │ • R$ 0,25 excedente          │   │
│  │ • 1 WhatsApp, 1 anúncio      │   │
│  │ • Sincronizado com Stripe    │   │
│  │                              │   │
│  │ [Editar] [Histórico] [Sync]  │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ Pro        R$ 197,00 Ativo   │   │
│  │ • 500 eventos/mês            │   │
│  │ • R$ 0,18 excedente          │   │
│  │ • 2 WhatsApp, 2 anúncios     │   │
│  │ • Sincronizado com Stripe    │   │
│  │                              │   │
│  │ [Editar] [Histórico] [Sync]  │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ Agency     Sob consulta      │   │
│  │ • 10.000 eventos/mês         │   │
│  │ • R$ 0,12 excedente          │   │
│  │ • 10 WhatsApp, 10 anúncios   │   │
│  │ • Contat vendas              │   │
│  │                              │   │
│  │ [Editar] [Histórico] [Sync]  │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Escopo

### Entra nesta iniciativa:

1. **Database Schema**
   - Tabela `BillingPlan` com campos completos
   - Tabela `BillingPlanHistory` para auditoria

2. **API CRUD**
   - `GET /api/v1/admin/billing-plans` → Listar
   - `GET /api/v1/admin/billing-plans/{id}` → Detalhar
   - `POST /api/v1/admin/billing-plans` → Criar
   - `PATCH /api/v1/admin/billing-plans/{id}` → Editar
   - `DELETE /api/v1/admin/billing-plans/{id}` → Arquivar
   - `POST /api/v1/admin/billing-plans/{id}/sync` → Sincronizar Stripe
   - `GET /api/v1/admin/billing-plans/{id}/history` → Histórico

3. **Service Layer**
   - `BillingPlanService` com lógica de sincronização Stripe
   - Validações de preço, limites, quotas
   - Sincronização automática

4. **Admin Dashboard**
   - Tabela de planos com filtros
   - Modal para criar/editar plano
   - Formulário com validações
   - Status de sincronização com Stripe
   - Link para histórico de alterações

5. **Webhook Integration**
   - Validar preço antes de sincronizar com Stripe
   - Tratamento de erros de sincronização
   - Retry automático com backoff

### Fica fora desta fase:

- UI de quotas para usuários normais
- Metering de eventos em tempo real
- Cálculo automático de excedentes (já existe)
- Multi-moeda (BRL apenas)
- A/B testing de preços

## Especificação Técnica

### 1. Schema Prisma

```prisma
model BillingPlan {
  id                    String   @id @default(cuid())

  // Identificação
  name                  String   @unique      // "Starter"
  slug                  String   @unique      // "starter"
  description           String?

  // Preço
  monthlyPrice          Decimal  @db.Decimal(10, 2)  // 97.00
  currency              String   @default("BRL")

  // Limites de Eventos
  eventLimitPerMonth    Int      // 200
  overagePricePerEvent  Decimal  @db.Decimal(5, 2)   // 0.25

  // Quotas
  maxWhatsAppNumbers    Int
  maxAdAccounts         Int
  maxTeamMembers        Int
  supportLevel          String   // "email" | "priority" | "dedicated"

  // Stripe Sync
  stripeProductId       String?  @unique
  stripePriceId         String?  @unique
  syncStatus            String   @default("pending")  // "synced" | "pending" | "error"
  syncError             String?
  syncedAt              DateTime?

  // Display
  isActive              Boolean  @default(true)
  displayOrder          Int      @default(0)
  isHighlighted         Boolean  @default(false)
  contactSalesOnly      Boolean  @default(false)

  // Metadata
  metadata              Json?

  // Audit
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  createdBy             String?
  deletedAt             DateTime?

  // Relations
  history               BillingPlanHistory[]
  subscriptions         BillingSubscription[]

  @@index([slug])
  @@index([isActive])
  @@index([stripeProductId])
}

model BillingPlanHistory {
  id                    String   @id @default(cuid())

  planId                String
  plan                  BillingPlan @relation(fields: [planId], references: [id])

  // Ação
  action                String   // "created" | "updated" | "synced" | "deleted"

  // Valores
  oldValues             Json?
  newValues             Json?

  // Stripe Sync
  syncAction            String?
  syncResult            Json?
  syncError             String?

  // Audit
  changedBy             String?
  changedAt             DateTime @default(now())

  @@index([planId, changedAt])
}
```

### 2. Service: BillingPlanService

Responsabilidades:
- Validar dados antes de criar/editar
- Sincronizar com Stripe API
- Criar novo preço se preço mudou
- Registrar no histórico
- Tratamento de erros com retry

### 3. Routes

```
POST   /api/v1/admin/billing-plans
GET    /api/v1/admin/billing-plans
GET    /api/v1/admin/billing-plans/{id}
PATCH  /api/v1/admin/billing-plans/{id}
DELETE /api/v1/admin/billing-plans/{id}
POST   /api/v1/admin/billing-plans/{id}/sync
GET    /api/v1/admin/billing-plans/{id}/history
```

### 4. Admin Dashboard

**Página**: `/dashboard/admin/billing-plans`

Componentes:
- `BillingPlansTable` - Listagem com filtros
- `BillingPlanForm` - Criar/editar form
- `BillingPlanHistoryModal` - Visualizar histórico
- `SyncStatus` - Indicador de status Stripe

## Mudanças Técnicas Necessárias

### 1. Atualizar Prisma Schema
- Adicionar `BillingPlan` e `BillingPlanHistory`
- Adicionar relação com `BillingSubscription`
- Rodar `npx prisma db push`

### 2. Implementar BillingPlanService
- `createPlan(input)`
- `updatePlan(id, input)`
- `deletePlan(id)`
- `syncToStripe(id)`
- `getHistory(id)`

### 3. Criar Routes Admin
- `/api/v1/admin/billing-plans`
- Proteger com permissão `admin`

### 4. Implementar Dashboard
- Página: `/dashboard/admin/billing-plans`
- Componentes React com validações

### 5. Migrar Planos
- Importar planos de `plans.ts` para BD
- Sincronizar com Stripe existentes
- Manter retrocompatibilidade com `getBillingPlan()`

## Fluxo de Uso

### Criar Novo Plano

```
Admin abre: /dashboard/admin/billing-plans
      ↓
Clica: [Novo Plano]
      ↓
Formulário aparece com campos:
  - Nome: "Starter"
  - Preço: R$ 97,00
  - Limite eventos: 200
  - Excedente: R$ 0,25
  - WhatsApp: 1
  - Anúncios: 1
  - Membros: 2
  - Suporte: email
      ↓
Clica: [Criar e Sincronizar com Stripe]
      ↓
Sistema:
  1. Valida dados
  2. Cria na Stripe (product + price)
  3. Salva no BD com IDs
  4. Registra no histórico
      ↓
Sucesso! Plano disponível para novas assinaturas
```

### Editar Preço de Plano Existente

```
Admin vê: Starter R$ 97,00
      ↓
Clica: [Editar]
      ↓
Muda: Preço de R$ 97 para R$ 109
      ↓
Clica: [Salvar]
      ↓
Sistema:
  1. Cria novo preço na Stripe
  2. Desativa preço antigo (archive)
  3. Atualiza stripePriceId no BD
  4. Registra alteração no histórico
      ↓
Novas assinaturas usam R$ 109
Assinaturas antigas continuam R$ 97
```

### Visualizar Histórico

```
Admin clica: [Histórico]
      ↓
Modal mostra:
  - Criação: 01/03/2026 por admin@whatrack.com
  - Edição: 08/03/2026 Preço 97 → 109
  - Sincronizado com Stripe: price_xxx
  - Erro sync: [none]
```

## Critérios de Aceite

- [x] Planos podem ser criados via admin dashboard
- [x] Preços sincronizam automaticamente com Stripe
- [x] Histórico completo de alterações
- [x] Editar plano cria novo preço na Stripe (versioning)
- [x] Soft delete (arquivamento)
- [x] Validação de preços e limites
- [x] Dashboard mostra status de sincronização
- [x] API completa com validações
- [x] Tests para BillingPlanService

## Riscos

- Sincronização falha com Stripe (resolver com retry)
- Usuário edita múltiplos campos ao mesmo tempo (usar form com validação)
- Preço antigo não descontinuado corretamente (criar novo sempre)
- Histórico incompleto (registrar toda ação)

## Ordem de Execução Recomendada

1. Atualizar Prisma schema
2. Implementar BillingPlanService
3. Criar routes CRUD
4. Criar admin dashboard
5. Migrar planos existentes do plans.ts
6. Testes e1e
7. Deploy

## Smoke Test Obrigatório

1. Abrir `/dashboard/admin/billing-plans`
2. Ver planos existentes (Starter, Pro, Agency)
3. Editar preço de um plano
4. Verificar nova price foi criada na Stripe Dashboard
5. Criar novo plano "Premium"
6. Verificar produto e preço na Stripe
7. Visualizar histórico de alterações
8. Criar nova assinatura com novo plano

## Definição de Done

- Dashboard funcional em `/dashboard/admin/billing-plans`
- API CRUD completa com validações
- Sincronização automática com Stripe sem erros
- Histórico de alterações mantido
- Testes unitários e e2e passando
- Documentação atualizada
