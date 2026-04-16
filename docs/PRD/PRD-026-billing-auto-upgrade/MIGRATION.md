# PRD-026: MIGRATION — Schema Changes, Migrations, Seeds

---

## 1. Mudanças no Schema

### 1.1 Nova Tabela: BillingPlanHistory

```prisma
model BillingPlanHistory {
  id                    String    @id @default(cuid())
  subscriptionId        String
  subscription          BillingSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  
  planId                String
  plan                  BillingPlan @relation(fields: [planId], references: [id])
  
  startedAt             DateTime  @default(now())
  endedAt               DateTime? // null = plano atual
  
  reason                String    // "trial_to_paid" | "manual" | "auto_upgrade" | "downgrade"
  projectCountAtChange  Int       // Projetos no momento da mudança
  
  createdAt             DateTime  @default(now())
  
  @@unique([subscriptionId, startedAt])
  @@index([subscriptionId])
  @@index([planId])
  @@index([subscriptionId, startedAt(sort: Desc)])
}
```

**Índices:**
```sql
CREATE INDEX idx_plan_history_subscription ON "BillingPlanHistory"("subscriptionId");
CREATE INDEX idx_plan_history_plan ON "BillingPlanHistory"("planId");
CREATE INDEX idx_plan_history_subscription_started ON "BillingPlanHistory"("subscriptionId", "startedAt" DESC);
```

### 1.2 Atualizar BillingSubscription

**Adicionar coluna:**

```prisma
// Antes:
model BillingSubscription {
  id              String   @id @default(cuid())
  organizationId  String   @unique @db.Uuid
  offerId         String?
  asaasId         String?  @unique
  // ... resto ...
}

// Depois:
model BillingSubscription {
  id              String   @id @default(cuid())
  organizationId  String   @unique @db.Uuid
  offerId         String?
  asaasId         String?  @unique
  currentPlanId   String?  // ✨ NOVO
  currentPlan     BillingPlan? @relation("current", fields: [currentPlanId], references: [id])
  planHistory     BillingPlanHistory[]  // ✨ NOVO
  // ... resto ...
}
```

**SQL:**
```sql
ALTER TABLE "BillingSubscription" 
  ADD COLUMN "currentPlanId" VARCHAR(255),
  ADD FOREIGN KEY ("currentPlanId") REFERENCES "BillingPlan"("id");

CREATE INDEX idx_subscription_current_plan ON "BillingSubscription"("currentPlanId");
```

### 1.3 Atualizar BillingPlan

**Adicionar relações:**

```prisma
model BillingPlan {
  id                String   @id @default(cuid())
  code              String   @unique
  name              String
  cycle             String
  accessDays        Int
  // ... resto ...
  
  // ✨ NOVO: Relações bidirecionais
  currentSubscriptions  BillingSubscription[] @relation("current")
  planHistory           BillingPlanHistory[]
  offers                BillingOffer[]
  invoices              BillingInvoice[]
}
```

---

## 1.4 Corrigir BillingInvoice.value (Float → Decimal)

**Arquivo:** `prisma/schema.prisma`

**Mudança:**

```prisma
// Antes:
model BillingInvoice {
  value    Float
  netValue Float?
}

// Depois:
model BillingInvoice {
  value    Decimal   @db.Decimal(10, 2)
  netValue Decimal?  @db.Decimal(10, 2)
}
```

**Motivo:** Float não é preciso para dinheiro. Prorating exige precisão.

---

## 2. Migration Prisma

### 2.1 Criar Migration

```bash
npx prisma migrate dev --name add_billing_plan_history
```

**Arquivo gerado:** `prisma/migrations/{timestamp}_add_billing_plan_history/migration.sql`

**Conteúdo esperado:**

```sql
-- CreateTable BillingPlanHistory
CREATE TABLE "BillingPlanHistory" (
  "id" VARCHAR(255) NOT NULL,
  "subscriptionId" VARCHAR(255) NOT NULL,
  "planId" VARCHAR(255) NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "reason" VARCHAR(255) NOT NULL,
  "projectCountAtChange" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingPlanHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BillingPlanHistory" 
  ADD CONSTRAINT "BillingPlanHistory_subscriptionId_fkey" 
  FOREIGN KEY ("subscriptionId") REFERENCES "BillingSubscription"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPlanHistory" 
  ADD CONSTRAINT "BillingPlanHistory_planId_fkey" 
  FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "BillingPlanHistory_subscriptionId_idx" ON "BillingPlanHistory"("subscriptionId");

-- CreateIndex
CREATE INDEX "BillingPlanHistory_planId_idx" ON "BillingPlanHistory"("planId");

-- AlterTable BillingSubscription
ALTER TABLE "BillingSubscription" 
  ADD COLUMN "currentPlanId" VARCHAR(255);

-- AddForeignKey
ALTER TABLE "BillingSubscription" 
  ADD CONSTRAINT "BillingSubscription_currentPlanId_fkey" 
  FOREIGN KEY ("currentPlanId") REFERENCES "BillingPlan"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "BillingSubscription_currentPlanId_idx" ON "BillingSubscription"("currentPlanId");
```

### 2.2 Executar Migration

```bash
# Ambiente local
npx prisma migrate dev

# Ambiente de staging/prod (com backup antes!)
npx prisma migrate deploy
```

---

## 3. Atualizar Seeds

### 3.1 Seed: Atualizar Business Plan

**Arquivo:** `prisma/seeds/seed_billing_plans.ts`

**Mudança:**

```typescript
const plans = [
  {
    code: 'starter_monthly',
    name: 'Starter',
    cycle: 'MONTHLY',
    accessDays: 30,
    includedProjects: 1,  // ✅ Mantém
    includedWhatsAppPerProject: 1,
    includedMetaAdAccountsPerProject: 1,
    includedConversionsPerProject: 999999,
    supportLevel: 'standard',
    displayOrder: 0,
    isHighlighted: false,
    contactSalesOnly: false,
    metadata: {
      slug: 'starter',
      monthlyPrice: '97.00',
      cta: 'Começar agora',
      subtitle: 'Para operações com 1 projeto ativo.',
      features: [
        '1 projeto',
        // ...
      ],
      additionals: ['Projeto adicional por R$ 97/mês'],
    },
  },
  // ...
  {
    code: 'business_monthly',
    name: 'Business',
    cycle: 'MONTHLY',
    accessDays: 30,
    includedProjects: 5,  // ✨ MUDANÇA: de 10 para 5
    includedWhatsAppPerProject: 1,
    includedMetaAdAccountsPerProject: 1,
    includedConversionsPerProject: 999999,
    supportLevel: 'priority',
    displayOrder: 2,
    isHighlighted: false,
    contactSalesOnly: false,
    metadata: {
      slug: 'business',
      monthlyPrice: '397.00',
      cta: 'Começar agora',
      subtitle: 'Para operações com até 5 projetos ativos.',  // ✨ Atualizado
      features: [
        '5 projetos',  // ✨ Atualizado de '10 projetos'
        '5 instâncias WhatsApp',  // ✨ Atualizado de '10 instâncias'
        '5 contas Meta Ads',  // ✨ Atualizado de '10 contas'
        'Disparador de campanhas no WhatsApp',
        'Dashboard completo de rastreamento',
        'CRM Kanban avançado',
        'Suporte prioritário',
      ],
      additionals: ['Projeto adicional por R$ 47/mês'],
    },
  },
]
```

### 3.2 Seed: Criar Histórico para Clientes Existentes

**Arquivo:** `prisma/seeds/seed_billing_plan_history.ts` (novo)

```typescript
import { Prisma, PrismaClient } from '@generated/prisma/client'

export async function seedBillingPlanHistory(prisma: PrismaClient) {
  console.log('📜 Seeding billing plan history...')

  // Para cada subscription ativa, criar entrada em histórico
  const subscriptions = await prisma.billingSubscription.findMany({
    include: {
      offer: {
        include: {
          plan: true,
        },
      },
      organization: {
        include: {
          projects: true,
        },
      },
    },
  })

  for (const subscription of subscriptions) {
    if (!subscription.offer) continue

    const projectCount = subscription.organization.projects.length
    const plan = subscription.offer.plan

    // Verificar se já existe entrada de histórico
    const existingHistory = await prisma.billingPlanHistory.findFirst({
      where: {
        subscriptionId: subscription.id,
      },
    })

    if (existingHistory) {
      console.log(`⏭️  Subscription ${subscription.id} já tem histórico, pulando...`)
      continue
    }

    // Criar entrada no histórico
    await prisma.billingPlanHistory.create({
      data: {
        subscriptionId: subscription.id,
        planId: plan.id,
        startedAt: subscription.purchaseDate,
        endedAt: null, // Plano atual
        reason: 'trial_to_paid',
        projectCountAtChange: projectCount,
      },
    })

    // Atualizar currentPlanId no subscription
    await prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: {
        currentPlanId: plan.id,
      },
    })

    console.log(`✅ Histórico criado para subscription ${subscription.id}`)
  }

  console.log('✅ Billing plan history seeded successfully!')
}
```

**Integrar em** `prisma/seed.ts`:

```typescript
import { seedBillingPlans } from './seeds/seed_billing_plans'
import { seedBillingOffers } from './seeds/seed_billing_offers'
import { seedBillingPlanHistory } from './seeds/seed_billing_plan_history'  // ✨ NOVO
import { seedLookupTables } from './seeds/seed_lookup_tables'

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  await seedBillingPlans(prisma)
  await seedBillingOffers(prisma)
  await seedBillingPlanHistory(prisma)  // ✨ NOVO
  await seedLookupTables(prisma)

  console.log('✅ Seed completado!')
}
```

### 3.3 Executar Seeds

```bash
# Ambiente local
npx prisma db seed

# Ou manual se necessário
npx prisma db seed -- --seed=seed_billing_plan_history
```

---

## 4. Rollback Plan

Se algo der errado:

### 4.1 Rollback de Migration

```bash
# Voltar para migration anterior
npx prisma migrate resolve --rolled-back add_billing_plan_history

# Ou manualmente deletar a migration e aplicar anterior
rm -rf prisma/migrations/{timestamp}_add_billing_plan_history
npx prisma migrate deploy
```

### 4.2 Rollback de Seeds

```bash
# Se rodou em prod por engano:
# 1. Backup do banco ANTES
# 2. SQL manual para deletar histórico:

DELETE FROM "BillingPlanHistory" WHERE "createdAt" > '2026-04-16T00:00:00Z';

-- Resetar currentPlanId
UPDATE "BillingSubscription" SET "currentPlanId" = NULL;

-- Restaurar Business para 10 projetos (se necessário)
UPDATE "BillingPlan" 
  SET "includedProjects" = 10 
  WHERE "code" = 'business_monthly';
```

---

## 5. Validação Pós-Migration

### 5.1 Checklist

- [ ] Migration rodou sem erro
- [ ] Tabela `BillingPlanHistory` criada
- [ ] Coluna `currentPlanId` adicionada
- [ ] Índices criados
- [ ] Seeds rodaram
- [ ] Clientes existentes têm entry em `BillingPlanHistory`
- [ ] `currentPlanId` está preenchido
- [ ] Business plan tem `includedProjects = 5`
- [ ] Nenhum orphan (subscription sem plan)

### 5.2 Queries de Validação

```sql
-- Contar registros
SELECT COUNT(*) FROM "BillingPlanHistory";  -- Deve ser ≥ subscriptions ativas

-- Validar que cada subscription tem plano
SELECT s.id, s.currentPlanId, p.code 
  FROM "BillingSubscription" s
  LEFT JOIN "BillingPlan" p ON s.currentPlanId = p.id
  WHERE s.isActive = true AND s.currentPlanId IS NULL;  -- Deve retornar vazio

-- Verificar Business plan
SELECT * FROM "BillingPlan" WHERE code = 'business_monthly';  -- includedProjects deve ser 5

-- Verificar histórico
SELECT * FROM "BillingPlanHistory" ORDER BY "startedAt" DESC LIMIT 10;
```

---

## 6. Timeline de Rollout

**Fase 1: Develop (local)**
- [ ] Criar migration
- [ ] Rodar localmente
- [ ] Seedar clientes teste
- [ ] Validar schema

**Fase 2: Staging**
- [ ] Deploy código (antes de aplicar migration)
- [ ] Backup do banco
- [ ] Aplicar migration
- [ ] Rodar seeds
- [ ] Testes E2E
- [ ] Validar queries

**Fase 3: Production**
- [ ] Backup full do banco (e testar restore)
- [ ] Deploy código
- [ ] Aplicar migration (em horário baixo)
- [ ] Rodar seeds
- [ ] Monitorar logs
- [ ] Validar com queries acima
- [ ] Comunicar time

**Fase 4: Pós-Deploy**
- [ ] Documentar changeset
- [ ] Atualizar runbooks
- [ ] Notificar team de qualquer alert

---

## 7. Notas Importantes

### 7.1 currentPlanId vs Derivado de Histórico

**Usamos currentPlanId como cache porque:**
- Query mais rápida (sem JOIN)
- Menos risco de inconsistência de dados
- Dashboard precisa ser rápido

**Invariante:** `BillingSubscription.currentPlanId` = `BillingPlanHistory.planId WHERE endedAt IS NULL`

Esta invariante é garantida pelo código da app (não pela DB).

### 7.2 Auditoria

`BillingPlanHistory` NUNCA é deletado. É append-only. Se precisar corrigir histórico:

```sql
-- Errado:
DELETE FROM "BillingPlanHistory" WHERE id = 'xyz';

-- Certo (se absolutamente necessário):
UPDATE "BillingPlanHistory" 
  SET "endedAt" = now(), "reason" = 'corrected'
  WHERE id = 'xyz'
  AND id NOT IN (SELECT id FROM "BillingPlanHistory" WHERE "endedAt" IS NULL);
```

### 7.3 Transações no Seed

O seed de histórico usa transações para garantir consistência. Se falhar no meio:

```sql
-- Verificar se completou
SELECT COUNT(*) FROM "BillingPlanHistory";
SELECT COUNT(*) FROM "BillingSubscription" WHERE "currentPlanId" IS NOT NULL;

-- Devem ser iguais (ou subscriptions ativas)
```

