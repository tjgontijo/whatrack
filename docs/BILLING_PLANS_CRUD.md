# CRUD de Planos com Sincronização Stripe

## Visão Geral

Sistema de gerenciamento de planos que sincroniza automaticamente com a Stripe:
- Criar, editar, deletar planos localmente
- Sincronizar com Stripe Products & Prices API
- Manter histórico de alterações
- Validação automática

## Arquitetura

```
┌─────────────────────────────────────┐
│      WhaTrack Database              │
├─────────────────────────────────────┤
│  BillingPlan                         │
│  ├─ id (UUID)                        │
│  ├─ stripeProductId (sync)           │
│  ├─ stripePriceId (sync)             │
│  ├─ name (Starter)                   │
│  ├─ description                      │
│  ├─ monthlyPrice (9700 centavos)     │
│  ├─ eventLimitPerMonth (200)         │
│  ├─ overagePricePerEvent (0.25)      │
│  ├─ isActive (true/false)            │
│  ├─ syncedAt                         │
│  └─ metadata (JSON)                  │
└─────────────────────────────────────┘
           ↓ sync
┌─────────────────────────────────────┐
│    Stripe Dashboard                  │
├─────────────────────────────────────┤
│  Product (prod_xxx)                 │
│  ├─ name                             │
│  ├─ description                      │
│  └─ metadata {plan_type}             │
│                                      │
│  Price (price_xxx)                  │
│  ├─ amount (9700)                    │
│  ├─ recurring: monthly               │
│  └─ metadata {overage: 0.25}         │
└─────────────────────────────────────┘
```

## Database Schema

### Tabela: BillingPlan

```sql
CREATE TABLE billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  name VARCHAR NOT NULL UNIQUE,        -- 'Starter', 'Pro', 'Agency'
  slug VARCHAR UNIQUE,                 -- 'starter', 'pro', 'agency'
  description TEXT,

  -- Preço
  monthlyPrice DECIMAL(10,2) NOT NULL, -- 97.00, 197.00, etc
  currency VARCHAR DEFAULT 'BRL',

  -- Limite de eventos
  eventLimitPerMonth INTEGER NOT NULL, -- 200, 500, 10000
  overagePricePerEvent DECIMAL(5,2),   -- 0.25, 0.18, 0.12

  -- Stripe sync
  stripeProductId VARCHAR UNIQUE,      -- prod_xxx...
  stripePriceId VARCHAR UNIQUE,        -- price_xxx...
  syncStatus VARCHAR,                  -- 'synced', 'pending', 'error'
  syncError TEXT,
  syncedAt TIMESTAMP,

  -- Features
  maxWhatsAppNumbers INTEGER,
  maxAdAccounts INTEGER,
  maxTeamMembers INTEGER,
  supportLevel VARCHAR,                -- 'email', 'priority', 'dedicated'

  -- Metadata
  isActive BOOLEAN DEFAULT true,
  displayOrder INTEGER,
  isHighlighted BOOLEAN DEFAULT false,
  contactSalesOnly BOOLEAN DEFAULT false,

  metadata JSONB,                      -- Dados adicionais

  -- Audit
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  createdBy UUID,
  deletedAt TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_billing_plans_slug ON billing_plans(slug);
CREATE INDEX idx_billing_plans_active ON billing_plans(isActive);
CREATE INDEX idx_billing_plans_stripe_product ON billing_plans(stripeProductId);
```

### Tabela: BillingPlanHistory

```sql
CREATE TABLE billing_plan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planId UUID NOT NULL REFERENCES billing_plans(id),

  action VARCHAR,  -- 'created', 'updated', 'synced', 'deleted'

  -- Valores antes
  oldValues JSONB,

  -- Valores depois
  newValues JSONB,

  -- Sincronização
  syncAction VARCHAR,  -- 'stripe_created', 'stripe_updated', 'stripe_deleted'
  syncResult JSONB,

  changedBy UUID,
  changedAt TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### 1. Listar Planos

```http
GET /api/v1/admin/billing-plans
GET /api/v1/admin/billing-plans?active=true&sort=displayOrder
GET /api/v1/admin/billing-plans/{id}

Response:
{
  "id": "uuid",
  "name": "Starter",
  "slug": "starter",
  "monthlyPrice": 97.00,
  "eventLimitPerMonth": 200,
  "overagePricePerEvent": 0.25,
  "stripeProductId": "prod_xxx",
  "stripePriceId": "price_xxx",
  "syncStatus": "synced",
  "syncedAt": "2026-03-08T10:30:00Z",
  "isActive": true,
  "displayOrder": 1,
  "isHighlighted": false,
  "createdAt": "2026-03-01T00:00:00Z"
}
```

### 2. Criar Plano

```http
POST /api/v1/admin/billing-plans

Request:
{
  "name": "Starter",
  "slug": "starter",
  "description": "200 events/month - Perfect for getting started",
  "monthlyPrice": 97.00,
  "eventLimitPerMonth": 200,
  "overagePricePerEvent": 0.25,
  "maxWhatsAppNumbers": 1,
  "maxAdAccounts": 1,
  "maxTeamMembers": 2,
  "supportLevel": "email",
  "isActive": true,
  "displayOrder": 1,
  "isHighlighted": false,
  "syncToStripe": true  // Criar na Stripe também
}

Response:
{
  "id": "uuid",
  "name": "Starter",
  "stripeProductId": "prod_xxx",  // Criado na Stripe
  "stripePriceId": "price_xxx",   // Criado na Stripe
  "syncStatus": "synced",
  "createdAt": "2026-03-08T10:35:00Z"
}
```

### 3. Editar Plano

```http
PATCH /api/v1/admin/billing-plans/{id}

Request:
{
  "monthlyPrice": 99.00,           // Editou preço
  "eventLimitPerMonth": 250,       // Editou limite
  "overagePricePerEvent": 0.23,    // Editou excedente
  "syncToStripe": true             // Sincronizar com Stripe
}

Response:
{
  "id": "uuid",
  "monthlyPrice": 99.00,
  "stripePriceId": "price_xxx",    // Nova price criada na Stripe
  "syncStatus": "synced",
  "syncedAt": "2026-03-08T10:40:00Z",
  "changelog": {
    "monthlyPrice": { old: 97.00, new: 99.00 },
    "eventLimitPerMonth": { old: 200, new: 250 }
  }
}
```

### 4. Deletar Plano

```http
DELETE /api/v1/admin/billing-plans/{id}

Request:
{
  "syncToStripe": true  // Desativar na Stripe também
}

Response:
{
  "id": "uuid",
  "message": "Plan archived successfully",
  "stripeProductArchived": true,
  "deletedAt": "2026-03-08T10:45:00Z"
}
```

### 5. Sincronizar com Stripe

```http
POST /api/v1/admin/billing-plans/{id}/sync

Response:
{
  "id": "uuid",
  "syncStatus": "synced",
  "syncedAt": "2026-03-08T10:50:00Z",
  "stripeProductId": "prod_xxx",
  "stripePriceId": "price_xxx",
  "syncLog": {
    "productUpdated": true,
    "priceCreated": true,
    "metadata": { synced_at: "2026-03-08T10:50:00Z" }
  }
}
```

### 6. Listar Histórico de Alterações

```http
GET /api/v1/admin/billing-plans/{id}/history

Response:
[
  {
    "id": "uuid",
    "action": "created",
    "changedBy": "user_id",
    "changedAt": "2026-03-01T00:00:00Z",
    "newValues": { "monthlyPrice": 97.00 }
  },
  {
    "id": "uuid",
    "action": "updated",
    "changedBy": "user_id",
    "changedAt": "2026-03-08T10:40:00Z",
    "oldValues": { "monthlyPrice": 97.00 },
    "newValues": { "monthlyPrice": 99.00 },
    "syncAction": "stripe_price_created"
  }
]
```

## Implementação

### 1. Service: BillingPlanService

**Arquivo**: `src/services/billing/billing-plan.service.ts`

```typescript
import Stripe from 'stripe'
import { prisma } from '@/lib/db/prisma'

export interface CreatePlanInput {
  name: string
  slug: string
  description: string
  monthlyPrice: number
  eventLimitPerMonth: number
  overagePricePerEvent: number
  syncToStripe?: boolean
  // ... outros campos
}

export class BillingPlanService {
  private stripe: Stripe

  constructor(stripeSecretKey: string) {
    this.stripe = new Stripe(stripeSecretKey)
  }

  /**
   * Criar plano localmente e sincronizar com Stripe
   */
  async createPlan(input: CreatePlanInput) {
    // 1. Validar dados
    if (input.monthlyPrice <= 0) {
      throw new Error('Monthly price must be greater than 0')
    }

    // 2. Criar produto na Stripe (se solicitado)
    let stripeProductId: string | null = null
    let stripePriceId: string | null = null

    if (input.syncToStripe !== false) {
      const product = await this.stripe.products.create({
        name: input.name,
        description: input.description,
        type: 'service',
        metadata: {
          plan_slug: input.slug,
          overage_price_per_event: input.overagePricePerEvent.toString(),
        },
      })

      stripeProductId = product.id

      // 3. Criar preço mensal na Stripe
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(input.monthlyPrice * 100), // Converter para centavos
        currency: 'brl',
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
        metadata: {
          event_limit_per_month: input.eventLimitPerMonth.toString(),
          overage_price_per_event: input.overagePricePerEvent.toString(),
        },
      })

      stripePriceId = price.id
    }

    // 4. Salvar plano no BD
    const plan = await prisma.billingPlan.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        monthlyPrice: input.monthlyPrice,
        eventLimitPerMonth: input.eventLimitPerMonth,
        overagePricePerEvent: input.overagePricePerEvent,
        stripeProductId,
        stripePriceId,
        syncStatus: stripeProductId ? 'synced' : 'pending',
        syncedAt: stripeProductId ? new Date() : null,
      },
    })

    // 5. Registrar no histórico
    await prisma.billingPlanHistory.create({
      data: {
        planId: plan.id,
        action: 'created',
        newValues: plan,
        syncAction: stripeProductId ? 'stripe_created' : undefined,
      },
    })

    return plan
  }

  /**
   * Editar plano e sincronizar alterações
   */
  async updatePlan(planId: string, input: Partial<CreatePlanInput>) {
    const plan = await prisma.billingPlan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      throw new Error('Plan not found')
    }

    // Se preço mudou, criar novo price na Stripe
    if (input.monthlyPrice && input.monthlyPrice !== plan.monthlyPrice) {
      const newPrice = await this.stripe.prices.create({
        product: plan.stripeProductId || undefined,
        unit_amount: Math.round(input.monthlyPrice * 100),
        currency: 'brl',
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
      })

      // A Stripe não descontinua automaticamente, fazer manualmente
      if (plan.stripePriceId) {
        // Depois desativar precio antigo (não pode deletar, apenas arquivar)
      }

      input.stripePriceId = newPrice.id
    }

    const updated = await prisma.billingPlan.update({
      where: { id: planId },
      data: input,
    })

    // Registrar histórico
    await prisma.billingPlanHistory.create({
      data: {
        planId,
        action: 'updated',
        oldValues: plan,
        newValues: updated,
      },
    })

    return updated
  }

  /**
   * Sincronizar plano com Stripe
   */
  async syncToStripe(planId: string) {
    const plan = await prisma.billingPlan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      throw new Error('Plan not found')
    }

    try {
      if (plan.stripeProductId) {
        // Atualizar produto
        await this.stripe.products.update(plan.stripeProductId, {
          description: plan.description,
          metadata: {
            event_limit: plan.eventLimitPerMonth.toString(),
            overage_price: plan.overagePricePerEvent.toString(),
          },
        })
      }

      const updated = await prisma.billingPlan.update({
        where: { id: planId },
        data: {
          syncStatus: 'synced',
          syncedAt: new Date(),
          syncError: null,
        },
      })

      await prisma.billingPlanHistory.create({
        data: {
          planId,
          action: 'synced',
          syncAction: 'stripe_updated',
        },
      })

      return updated
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      await prisma.billingPlan.update({
        where: { id: planId },
        data: {
          syncStatus: 'error',
          syncError: errorMessage,
        },
      })

      throw error
    }
  }

  /**
   * Deletar plano (arquivar)
   */
  async deletePlan(planId: string, syncToStripe = true) {
    const plan = await prisma.billingPlan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      throw new Error('Plan not found')
    }

    // Arquivar na Stripe
    if (syncToStripe && plan.stripeProductId) {
      await this.stripe.products.update(plan.stripeProductId, {
        active: false,
      })
    }

    // Marcar como deletado localmente (soft delete)
    const deleted = await prisma.billingPlan.update({
      where: { id: planId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    })

    await prisma.billingPlanHistory.create({
      data: {
        planId,
        action: 'deleted',
        syncAction: syncToStripe ? 'stripe_archived' : undefined,
      },
    })

    return deleted
  }

  /**
   * Listar histórico
   */
  async getHistory(planId: string) {
    return prisma.billingPlanHistory.findMany({
      where: { planId },
      orderBy: { changedAt: 'desc' },
    })
  }
}
```

### 2. Routes: Admin Billing Plans

**Arquivo**: `src/app/api/v1/admin/billing-plans/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateAdminAccess } from '@/server/auth/validate-organization-access'
import { BillingPlanService } from '@/services/billing/billing-plan.service'
import { apiError } from '@/lib/utils/api-response'
import { env } from '@/lib/env/env'
import { prisma } from '@/lib/db/prisma'

const planService = new BillingPlanService(env.STRIPE_SECRET_KEY)

export async function GET(req: NextRequest) {
  try {
    const access = await validateAdminAccess(req)
    if (!access.hasAccess) {
      return apiError('Unauthorized', 401)
    }

    const plans = await prisma.billingPlan.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    })

    return NextResponse.json(plans)
  } catch (error) {
    return apiError('Failed to fetch plans', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await validateAdminAccess(req)
    if (!access.hasAccess) {
      return apiError('Unauthorized', 401)
    }

    const body = await req.json()
    const plan = await planService.createPlan(body)

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create plan'
    return apiError(message, 400)
  }
}
```

### 3. Admin Dashboard Component

**Arquivo**: `src/components/admin/billing-plans-manager.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'

export function BillingPlansManager() {
  const [plans, setPlans] = useState([])
  const [isEditing, setIsEditing] = useState(false)

  async function handleCreatePlan(data: any) {
    const response = await fetch('/api/v1/admin/billing-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, syncToStripe: true })
    })

    if (response.ok) {
      const newPlan = await response.json()
      setPlans([...plans, newPlan])
    }
  }

  async function handleSyncPlan(planId: string) {
    const response = await fetch(`/api/v1/admin/billing-plans/${planId}/sync`, {
      method: 'POST'
    })

    if (response.ok) {
      // Refresh plans
      const plans = await fetch('/api/v1/admin/billing-plans').then(r => r.json())
      setPlans(plans)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Planos de Faturamento</h2>

      <Button onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? 'Cancelar' : 'Novo Plano'}
      </Button>

      {isEditing && (
        <PlanForm onSubmit={handleCreatePlan} />
      )}

      <DataTable
        columns={[
          { header: 'Nome', accessorKey: 'name' },
          { header: 'Preço', accessorKey: 'monthlyPrice' },
          { header: 'Limite', accessorKey: 'eventLimitPerMonth' },
          { header: 'Excedente', accessorKey: 'overagePricePerEvent' },
          { header: 'Status Stripe', accessorKey: 'syncStatus' },
          {
            header: 'Ações',
            cell: (plan) => (
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSyncPlan(plan.id)}
                >
                  {plan.syncStatus === 'synced' ? 'Sincronizado' : 'Sincronizar'}
                </Button>
              </div>
            ),
          },
        ]}
        data={plans}
      />
    </div>
  )
}
```

## Casos de Uso

### Caso 1: Criar Novo Plano

```bash
POST /api/v1/admin/billing-plans
{
  "name": "Enterprise",
  "slug": "enterprise",
  "monthlyPrice": 999.00,
  "eventLimitPerMonth": 50000,
  "overagePricePerEvent": 0.05,
  "syncToStripe": true
}

# Resultado:
# 1. Plano criado no BD
# 2. Produto criado na Stripe (prod_xxx)
# 3. Preço criado na Stripe (price_xxx)
# 4. Histórico registrado
```

### Caso 2: Alterar Preço de um Plano

```bash
PATCH /api/v1/admin/billing-plans/uuid
{
  "monthlyPrice": 109.00,
  "syncToStripe": true
}

# Resultado:
# 1. Plano atualizado no BD
# 2. Novo preço criado na Stripe (price_yyy)
# 3. Preço anterior descontinuado (arquivado)
# 4. Novas assinaturas usam price_yyy
# 5. Histórico registrado com antes/depois
```

## Vantagens

✅ **Controle Total**: Gerenciar tudo por UI ou API
✅ **Sincronização**: Mudanças locais → Stripe automaticamente
✅ **Auditoria**: Histórico completo de alterações
✅ **Sem Código**: Não precisa editar código para novos planos
✅ **Versioning**: Prices podem ser alteradas sem deletar antigas
✅ **Rollback**: Revert para preço anterior se necessário

## Próximos Passos

1. Implementar Service `BillingPlanService`
2. Criar routes `/api/v1/admin/billing-plans/*`
3. Criar componente UI para admin dashboard
4. Adicionar validações e testes
5. Integrar com sistema de permissões
