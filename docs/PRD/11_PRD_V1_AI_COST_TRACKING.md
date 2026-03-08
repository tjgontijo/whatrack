# PRD 11: AI Cost Tracking & Dashboard (Phase 2)

**Status**: Planejamento
**Data**: 8 de Março de 2026
**Bloqueante**: Não (Phase 2, depois de PRD 10)
**Dependência**: PRD 10 (Meta Ads Analyst) — fornece dados para tracking

---

## 1. Objetivo

Rastrear custos de **todas as chamadas de IA** no sistema (Meta Ads audits, ticket classifiers, etc) via tabela unificada `AiInsightCost`, com dashboard admin para observabilidade.

**Impacto**:
- Visibilidade de custos para admin
- Base para futura monetização de outras features
- Auditoria de uso por feature/agent/modelo

---

## 2. Escopo

### Funcionalidades
- ✅ Nova tabela: `AiInsightCost` (tokens, custo, latência, status)
- ✅ Service: `ai-cost-tracking.service.ts` (cálculos de custo)
- ✅ Integração em `dispatchAiEvent()` (tickets)
- ✅ Integração em `dispatchAiEventForAudit()` (audits)
- ✅ Dashboard: `GET /api/v1/ai/usage?period=7d|30d|90d`
- ✅ Logs: `GET /api/v1/ai/usage/logs?page=1&limit=10`
- ✅ UI: `/dashboard/ai/usage` (inspirado em Kadernim)
- ✅ Cron: Charge overage 1x/mês (n8n)

### Fora do Escopo
- ❌ Real-time alerting (pode ser Phase 3)
- ❌ Breakdowns por user (apenas por org/feature/agent)

---

## 3. Arquitetura

### 3.1 Tabela: `AiInsightCost`

**Schema Prisma**:
```prisma
model AiInsightCost {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId  String   @db.Uuid
  aiInsightId     String   @db.Uuid

  // Contexto
  feature         String   // "meta-ads-audit", "ticket-analysis"
  operation       String   // "account-analysis", "conversation-idle"
  agentName       String   // "Meta Ads Analyst", "Sale Detector"
  eventType       String   // "META_ADS_AUDIT_REQUESTED", "CONVERSATION_IDLE_3M"

  // Tokens & Custo
  inputTokens     Int
  outputTokens    Int
  totalTokens     Int
  modelUsed       String   // "openai/gpt-4o-mini", "groq/mixtral-8x7b"
  inputCost       Decimal  // token cost breakdown
  outputCost      Decimal
  totalCost       Decimal  // USD total

  // Performance
  latencyMs       Int?     // milliseconds
  status          String   // "success", "error", "timeout"
  errorMessage    String?

  // Auditoria
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([organizationId, createdAt])
  @@index([feature, createdAt])
  @@index([status, createdAt])
  @@map("ai_insight_costs")
}
```

**Migration**:
```bash
npx prisma migrate dev --name add_ai_insight_cost
```

### 3.2 Service: `ai-cost-tracking.service.ts`

**Arquivo**: `src/services/ai/ai-cost-tracking.service.ts` (novo)

```typescript
export interface AiCostParams {
  organizationId: string
  aiInsightId: string
  feature: string         // "meta-ads-audit"
  operation: string       // "account-analysis"
  agentName: string
  eventType: string
  modelUsed: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  status: 'success' | 'error' | 'timeout'
  errorMessage?: string
}

export async function recordAiCost(params: AiCostParams) {
  const tokenCosts = getTokenCosts(params.modelUsed)
  const inputCost = (params.inputTokens * tokenCosts.inputPrice) / 1_000_000
  const outputCost = (params.outputTokens * tokenCosts.outputPrice) / 1_000_000

  return prisma.aiInsightCost.create({
    data: {
      organizationId: params.organizationId,
      aiInsightId: params.aiInsightId,
      feature: params.feature,
      operation: params.operation,
      agentName: params.agentName,
      eventType: params.eventType,
      modelUsed: params.modelUsed,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens: params.inputTokens + params.outputTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      latencyMs: params.latencyMs,
      status: params.status,
      errorMessage: params.errorMessage
    }
  })
}

function getTokenCosts(model: string) {
  const costs: Record<string, { inputPrice: number; outputPrice: number }> = {
    'openai/gpt-4o-mini': { inputPrice: 0.15, outputPrice: 0.60 },  // $ per 1M
    'openai/gpt-4o': { inputPrice: 2.50, outputPrice: 10.00 },
    'groq/mixtral-8x7b': { inputPrice: 0.27, outputPrice: 0.27 },
  }
  return costs[model] || costs['openai/gpt-4o-mini']
}
```

### 3.3 Integração: `dispatchAiEvent()` + `dispatchAiEventForAudit()`

**Mudança em `ai-execution.service.ts`**:
- Adicionar `recordAiCost()` após sucesso (feature: "ticket-analysis")
- Adicionar `recordAiCost()` no catch para erros (status: "error")

**Mudança em `ai-execution-audit.service.ts`**:
- Adicionar `recordAiCost()` após sucesso (feature: eventTypeToFeature(eventType))
- Adicionar `recordAiCost()` no catch para erros

---

## 4. Endpoints Analytics

### 4.1 GET `/api/v1/ai/usage?period=7d|30d|90d`

**Arquivo**: `src/app/api/v1/ai/usage/route.ts` (novo)

**Response**:
```json
{
  "totals": {
    "totalCalls": 1250,
    "successCalls": 1200,
    "errorCalls": 50,
    "totalTokens": 450000,
    "totalCost": 125.43,
    "inputTokens": 350000,
    "outputTokens": 100000
  },
  "byFeature": {
    "meta-ads-audit": {
      "totalCalls": 45,
      "totalTokens": 150000,
      "totalCost": 42.50,
      "inputTokens": 120000,
      "outputTokens": 30000
    },
    "ticket-analysis": {
      "totalCalls": 1200,
      ...
    }
  },
  "byModel": {
    "openai/gpt-4o-mini": {
      "totalCalls": 1240,
      "totalTokens": 440000,
      "totalCost": 124.20,
      ...
    },
    "groq/mixtral-8x7b": {
      ...
    }
  },
  "daily": [
    {
      "date": "2026-03-08",
      "calls": 50,
      "tokens": 20000,
      "cost": 5.20,
      "inputTokens": 15000,
      "outputTokens": 5000
    },
    ...
  ]
}
```

**Lógica**:
- Calcular datas (7d/30d/90d)
- Aggregate `AiInsightCost` por período
- Retornar totais, breakdown por feature, breakdown por modelo, histórico diário

### 4.2 GET `/api/v1/ai/usage/logs?page=1&limit=10&feature=&status=`

**Arquivo**: `src/app/api/v1/ai/usage/logs/route.ts` (novo)

**Response**:
```json
{
  "logs": [
    {
      "id": "uuid",
      "feature": "meta-ads-audit",
      "operation": "account-analysis",
      "agentName": "Meta Ads Analyst",
      "status": "success",
      "totalTokens": 5200,
      "totalCost": 1.42,
      "inputTokens": 4000,
      "outputTokens": 1200,
      "latencyMs": 3420,
      "createdAt": "2026-03-08T14:30:00Z"
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1250,
    "totalPages": 125
  }
}
```

**Lógica**:
- Filtro por feature, status
- Paginação (limit max 100)
- Ordenação por createdAt DESC

---

## 5. Dashboard: `/dashboard/ai/usage`

**Arquivo**: `src/app/dashboard/ai/usage/page.tsx` (novo)

**Componentes** (inspirado em Kadernim):
- **Stats Grid**: 4 cards (Total Calls, Tokens, Cost, Models)
- **Daily Cost Chart**: Line chart (7d/30d/90d)
- **Feature Breakdown**: Bar chart horizontal (custo por feature)
- **Feature Details Table**: Grid com estatísticas por feature
- **Recent Logs**: Tabela paginada com últimos 10 logs
- **Period Selector**: Tabs (7d, 30d, 90d)
- **Refresh Button**: Manual refresh

**Features**:
- ✅ Resposta rápida (dados agregados via SQL, não full table scan)
- ✅ Sem `useEffect` para fetch (Server Component para init, TanStack Query para refresh)
- ✅ Paginação nos logs (10 items)
- ✅ Period selector (7d/30d/90d)
- ✅ Formatação de valores (USD, K tokens)

---

## 6. Cron: Charge Overage (n8n)

**Função**: `src/services/billing/ai-overage-charge.service.ts` (novo)

```typescript
export async function chargeAiOverage() {
  const subscriptions = await prisma.billingSubscription.findMany({
    where: { status: 'ACTIVE' },
    include: { planTemplate: true }
  })

  const PLAN_QUOTAS = {
    'FREE': 0,
    'STARTER': 5,
    'GROWTH': 50,
    'PROFESSIONAL': 500
  }

  for (const sub of subscriptions) {
    const monthStart = new Date()
    monthStart.setDate(1)

    const usage = await prisma.aiInsightCost.count({
      where: {
        organizationId: sub.organizationId,
        feature: 'meta-ads-audit',
        createdAt: { gte: monthStart },
        status: 'success'
      }
    })

    const quota = PLAN_QUOTAS[sub.planTemplate.tier] || 5
    const overageCalls = Math.max(0, usage - quota)
    const overageCharge = overageCalls * 0.50  // $0.50 per call

    if (overageCharge > 0) {
      await prisma.billingEventUsage.create({
        data: {
          organizationId: sub.organizationId,
          eventType: 'META_ADS_AUDIT_OVERAGE',
          quantity: overageCalls,
          pricePerUnit: 0.50,
          totalCost: overageCharge,
          month: new Date().getMonth(),
          year: new Date().getFullYear(),
          notes: `${overageCalls} Meta Ads audits over quota at $0.50 each`
        }
      })
    }
  }
}
```

**n8n Job**:
- Trigger: 28º dia do mês, 02:00 UTC
- Endpoint: `POST /api/v1/cron/billing/charge-ai-overage` (similar a webhook-retry)
- Payload: `{}`
- Retries: 3x se falhar

---

## 7. Implementação (Step-by-Step)

### Passo 1: Migration + Service (1.5h)
- Criar migration `add_ai_insight_cost`
- Implementar `ai-cost-tracking.service.ts`
- Implementar `getTokenCosts()`

### Passo 2: Integração em Execution Services (1h)
- Modificar `dispatchAiEvent()` → adicionar `recordAiCost()`
- Modificar `dispatchAiEventForAudit()` → adicionar `recordAiCost()`
- Testes das integrações

### Passo 3: Endpoints Analytics (2h)
- `GET /api/v1/ai/usage` (aggregation)
- `GET /api/v1/ai/usage/logs` (pagination)
- Testes de aggregation e pagination

### Passo 4: Dashboard `/dashboard/ai/usage` (2h)
- Página Server Component
- Stats grid + charts
- Period selector
- Logs table com paginação

### Passo 5: Cron + Overage Charge (1h)
- Implementar `ai-overage-charge.service.ts`
- Endpoint POST `/api/v1/cron/billing/charge-ai-overage`
- n8n job configuration

### Passo 6: Testes (1h)
- Unit tests: `recordAiCost()`, aggregation queries
- E2E: cron charging overage
- Dashboard: carrega dados, filtra período

---

## 8. Validação Obrigatória

```bash
npm run lint          # Sem erros
npm run test          # Testes novos passam
npm run build         # Build sem erros
```

Testes a criar:
- `src/services/ai/ai-cost-tracking.service.spec.ts`
- `src/services/billing/ai-overage-charge.service.spec.ts`

---

## 9. Critério de Conclusão

- ✅ `AiInsightCost` table criada e populada
- ✅ Ambos `dispatchAiEvent()` e `dispatchAiEventForAudit()` registram custos
- ✅ Endpoints `/api/v1/ai/usage` + `/api/v1/ai/usage/logs` funcionais
- ✅ Dashboard `/dashboard/ai/usage` carrega e exibe dados
- ✅ Cron charge funcional (testado manualmente)
- ✅ Testes passando
- ✅ Lint sem erros
- ✅ Nenhum breaking change em funções existentes

---

## 10. Estimativa

| Componente | Tempo |
|-----------|-------|
| Migration + Service | 1.5h |
| Integração em executions | 1h |
| Endpoints analytics | 2h |
| Dashboard | 2h |
| Cron + Overage | 1h |
| Testes | 1h |
| **Total** | **8.5h** |

---

## 11. Dependências

- PRD 10 (Meta Ads Analyst) deve estar DONE primeiro
- Ambas as funções (`dispatchAiEvent`, `dispatchAiEventForAudit`) devem estar finalizadas

---

## Próximas Ações

1. ✅ PRD 10 completo
2. ✅ PRD 11 planejado
3. ⬜ Implementar PRD 10 (6h)
4. ⬜ Validar PRD 10
5. ⬜ Implementar PRD 11 (8.5h)
6. ⬜ Validar PRD 11
7. ➡️ Phase 3: Real-time alerting, breakdown por user, etc
