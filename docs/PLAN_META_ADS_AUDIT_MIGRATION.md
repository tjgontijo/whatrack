# Plano: Meta Ads Analyst Agent com Cost Tracking (Revisado)

**Status**: Revisado com inspiração em Kadernim LLM Usage
**Data**: 8 de Março de 2026
**Padrão**: Separar `dispatchAiEvent()` (tickets) de `dispatchAiEventForAudit()` (audits)

---

## 1. Princípio: Separação de Concerns

❌ **Errado**: Tentar fazer `dispatchAiEvent` genérico que suporte tickets + audits

✅ **Certo**: Duas funções especializadas
- `dispatchAiEvent(eventType, ticketId, organizationId)` → tickets
- `dispatchAiEventForAudit(eventType, organizationId, customContext)` → audits

Ambas registram em `AiInsightCost` (tabela unificada de custos).

---

## 2. Nova Tabela: `AiInsightCost`

**Inspirado em Kadernim `LlmUsageLog`**, mas melhorado.

```prisma
model AiInsightCost {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId  String   @db.Uuid
  aiInsightId     String   @db.Uuid

  // Contexto
  feature         String   // "meta-ads-audit", "ticket-analysis", etc
  operation       String   // "account-analysis", "conversation-idle", etc
  agentName       String   // "Meta Ads Analyst", "Sale Detector", etc
  eventType       String   // "META_ADS_AUDIT_REQUESTED", "CONVERSATION_IDLE_3M", etc

  // Tokens & Custo
  inputTokens     Int
  outputTokens    Int
  totalTokens     Int      // computed: input + output
  modelUsed       String   // "openai/gpt-4o-mini", "groq/mixtral-8x7b"
  inputCost       Decimal  // tokens * rate / 1M
  outputCost      Decimal  // tokens * rate / 1M
  totalCost       Decimal  // inputCost + outputCost

  // Performance
  latencyMs       Int?     // tempo total da execução
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

---

## 3. Service: `ai-cost-tracking.service.ts`

```typescript
// src/services/ai/ai-cost-tracking.service.ts

export async function recordAiCost(params: {
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
}) {
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
  return {
    'openai/gpt-4o-mini': { inputPrice: 0.15, outputPrice: 0.60 },  // $ per 1M
    'openai/gpt-4o': { inputPrice: 2.50, outputPrice: 10.00 },
    'groq/mixtral-8x7b': { inputPrice: 0.27, outputPrice: 0.27 },
  }[model] || { inputPrice: 0.15, outputPrice: 0.60 }
}
```

---

## 4. Duas Funções Especializadas

### 4.1 `dispatchAiEvent()` - MANTÉM ORIGINAL (Tickets)

```typescript
// src/services/ai/ai-execution.service.ts

export async function dispatchAiEvent(
  eventType: string,
  ticketId: string,        // ← Obrigatório
  organizationId: string
): Promise<number> {
  // Busca ticket + conversa
  // Roda agents
  // Cria AiInsight
  // Registra custo com feature="ticket-analysis", operation="idle|closed"
}
```

### 4.2 `dispatchAiEventForAudit()` - NOVO (Audits)

```typescript
// src/services/ai/ai-execution-audit.service.ts

export async function dispatchAiEventForAudit(
  eventType: string,
  organizationId: string,
  customContext: Record<string, unknown>
): Promise<AiInsight> {
  const startTime = performance.now()

  try {
    // 1. Busca agent
    const agent = await prisma.aiAgent.findFirst({
      where: {
        organizationId,
        isActive: true,
        triggers: { some: { eventType } }
      },
      include: { schemaFields: true, skillBindings: true }
    })

    if (!agent) throw new Error(`No agent for ${eventType}`)

    // 2. Formata contexto (NÃO usa ticket)
    const contextData = formatCustomContext(customContext)

    // 3. Roda agent
    const result = await mastraAgent.generate(
      `Analise:\n${contextData}`,
      { structuredOutput: { schema: dynamicSchema } }
    )

    const latencyMs = performance.now() - startTime

    // 4. Cria insight
    const insight = await prisma.aiInsight.create({
      data: {
        organizationId,
        eventType,
        agentId: agent.id,
        payload: result.object,
        status: 'SUGGESTION'
      }
    })

    // 5. Registra custo
    await recordAiCost({
      organizationId,
      aiInsightId: insight.id,
      feature: eventTypeToFeature(eventType),
      operation: eventTypeToOperation(eventType),
      agentName: agent.name,
      eventType,
      modelUsed: agent.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: Math.round(latencyMs),
      status: 'success'
    })

    return insight
  } catch (error) {
    const latencyMs = performance.now() - startTime

    await recordAiCost({
      organizationId,
      aiInsightId: 'error',
      feature: eventTypeToFeature(eventType),
      operation: eventTypeToOperation(eventType),
      agentName: 'Unknown',
      eventType,
      modelUsed: 'openai/gpt-4o-mini',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Math.round(latencyMs),
      status: 'error',
      errorMessage: error.message
    })

    throw error
  }
}
```

---

## 5. Endpoint `/api/v1/meta-ads/audit`

```typescript
// src/app/api/v1/meta-ads/audit/route.ts

export async function POST(req: Request) {
  try {
    const access = await validatePermissionAccess(req, 'manage:ai')
    if (!access.hasAccess) return apiError('Unauthorized', 401)

    const { accountId } = await metaAdsAuditSchema.parseAsync(req.json())

    // 1. Check quota
    const quota = await checkAndEnforceQuota(access.organizationId, 'meta-ads-audit')
    if (!quota.allowed) {
      return apiError('Quota exceeded', 429, {
        remaining: 0,
        overageCost: 0.50
      })
    }

    // 2. Buscar dados da conta
    const accountData = await fetchMetaAdsAccountData(accountId, access.organizationId)

    // 3. Formatar contexto
    const auditContext = formatContextForAudit(accountData)

    // 4. Disparar audit
    const insight = await dispatchAiEventForAudit(
      'META_ADS_AUDIT_REQUESTED',
      access.organizationId,
      auditContext
    )

    // 5. Buscar cost record
    const cost = await prisma.aiInsightCost.findFirst({
      where: { aiInsightId: insight.id }
    })

    return apiSuccess({
      insightId: insight.id,
      ...insight.payload,
      cost: cost ? {
        inputTokens: cost.inputTokens,
        outputTokens: cost.outputTokens,
        totalTokens: cost.totalTokens,
        estimatedUSD: parseFloat(cost.totalCost.toString())
      } : null
    })

  } catch (error) {
    return apiError('Audit failed', 500, error.message)
  }
}
```

---

## 6. Dashboard: `/dashboard/ai/usage`

**Inspirado em Kadernim**, mas para AI insights em vez de LLM log.

### Página: `src/app/dashboard/ai/usage/page.tsx`

**Features**:
- 📊 Stats: Total calls, tokens, cost, models
- 📈 Daily cost history (line chart)
- 📋 Feature breakdown (meta-ads-audit, ticket-analysis, etc) - bar chart
- 🔍 Detailed logs table (paginado, 10 rows)
- ⚠️ Cost alerts

### Endpoints

```
GET /api/v1/ai/usage?period=7d|30d|90d
  → { totals: {calls, tokens, cost}, byFeature: {...}, daily: [...] }

GET /api/v1/ai/usage/logs?page=1&limit=10&feature=meta-ads-audit&status=success
  → { logs: [...], pagination: {...} }
```

---

## 7. Monetização

### 7.1 Quota por Plano

```typescript
const PLAN_QUOTAS = {
  FREE: { auditCalls: 0, pricePerOverage: null },
  STARTER: { auditCalls: 5, pricePerOverage: 0.50 },
  GROWTH: { auditCalls: 50, pricePerOverage: 0.25 },
  PROFESSIONAL: { auditCalls: 500, pricePerOverage: 0.10 }
}
```

### 7.2 Validação de Quota

```typescript
async function checkAndEnforceQuota(
  organizationId: string,
  feature: string
): Promise<{ allowed: boolean; remaining: number }> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const usage = await prisma.aiInsightCost.count({
    where: {
      organizationId,
      feature,
      createdAt: { gte: monthStart },
      status: 'success'
    }
  })

  const subscription = await prisma.billingSubscription.findFirst({
    where: { organizationId, status: 'ACTIVE' },
    include: { planTemplate: true }
  })

  const quota = PLAN_QUOTAS[subscription.planTemplate.tier]
  const allowed = usage < quota.auditCalls

  return { allowed, remaining: Math.max(0, quota.auditCalls - usage) }
}
```

### 7.3 Cobrar Overage (Cron n8n)

```typescript
// Executar 1x/mês (28º dia)

async function chargeAiOverage() {
  const subscriptions = await prisma.billingSubscription.findMany({
    where: { status: 'ACTIVE' }
  })

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

    const quota = PLAN_QUOTAS[sub.planTemplate.tier]
    const overageCalls = Math.max(0, usage - quota.auditCalls)
    const overageCharge = overageCalls * quota.pricePerOverage

    if (overageCharge > 0) {
      await prisma.billingEventUsage.create({
        data: {
          organizationId: sub.organizationId,
          eventType: 'META_ADS_AUDIT_OVERAGE',
          quantity: overageCalls,
          pricePerUnit: quota.pricePerOverage,
          totalCost: overageCharge,
          month: new Date().getMonth(),
          year: new Date().getFullYear(),
          notes: `${overageCalls} audits at $${quota.pricePerOverage}`
        }
      })
    }
  }
}
```

---

## 8. Roadmap Revisado

### P0 - Backend Core (4h)
- [ ] Create `AiInsightCost` table + migration (1h)
- [ ] Create `ai-cost-tracking.service.ts` (1h)
- [ ] Create `dispatchAiEventForAudit()` in `ai-execution-audit.service.ts` (1h)
- [ ] Create `/api/v1/meta-ads/audit` endpoint (1h)

### P1 - Frontend + Monetização (6h)
- [ ] Update drawer to call `/api/v1/meta-ads/audit` (1h)
- [ ] Create `/dashboard/ai/usage` page (3h)
- [ ] Create `/api/v1/ai/usage` + `/api/v1/ai/usage/logs` (1.5h)
- [ ] Implement quota checking + cron (30min)

### P2 - QA (1 dia)
- [ ] E2E test audit flow
- [ ] Verify cost tracking
- [ ] Smoke test (PRD 09)

---

## 9. Estimativa de Valor

| Métrica | Valor |
|---------|-------|
| Custo real/audit | $0.009 |
| Preço Starter | $0.50 |
| Margem | 5,400% |

**Mensal** (100 orgs × 5 audits):
- Receita: $250 | Custo: $0.45 | Lucro: $249.55

**Anual** (1000 orgs × 50 audits):
- Receita: $30k | Custo: $4.50 | Lucro: $29.9k

---

## 10. Arquivos a Criar

### Criar
- `prisma/migrations/YYYYMMDD_add_ai_insight_cost.sql`
- `src/services/ai/ai-cost-tracking.service.ts`
- `src/services/ai/ai-execution-audit.service.ts`
- `src/services/meta-ads/meta-ads-context.service.ts`
- `src/app/api/v1/meta-ads/audit/route.ts`
- `src/app/api/v1/ai/usage/route.ts`
- `src/app/api/v1/ai/usage/logs/route.ts`
- `src/app/dashboard/ai/usage/page.tsx`

### Modificar
- `src/services/ai/ai-execution.service.ts` (add `recordAiCost()`)
- `src/components/dashboard/meta-ads/campaign-analysis-drawer.tsx` (chamar novo endpoint)

---

## 11. Próximas Ações

1. ✅ Arquitetura aprovada (separar concerns)
2. ⬜ Implementar P0
3. ⬜ Implementar P1
4. ⬜ QA + Deploy
