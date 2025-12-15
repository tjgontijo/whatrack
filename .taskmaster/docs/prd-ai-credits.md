# PRD: Sistema de Créditos de IA

## Problema

Precisamos controlar o uso de IA para escalar como SaaS sem custos imprevisíveis.

## Solução

Sistema de créditos **integrado ao billing existente** (Asaas):
- Cada plano define quota de créditos (`aiCreditsQuota` no model `Plan`)
- Créditos são adicionados quando pagamento é confirmado (webhook `PAYMENT_CONFIRMED`)
- Créditos não utilizados acumulam mês a mês
- Reset acontece automaticamente no ciclo de billing (via webhook)

---

## Integração com Billing

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE CRÉDITOS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Cliente assina plano Pro (R$297)                                │
│     └─▶ Subscription criada (status: incomplete)                    │
│     └─▶ AICredits criado com balance=0                              │
│                                                                     │
│  2. Asaas webhook: PAYMENT_CONFIRMED                                │
│     └─▶ Subscription.status = active                                │
│     └─▶ AICredits.balance += Plan.aiCreditsQuota (500)              │
│     └─▶ AICredits.lastCreditedAt = now()                            │
│     └─▶ AICredits.usedThisCycle = 0                                 │
│                                                                     │
│  3. Próximo mês: PAYMENT_CONFIRMED                                  │
│     └─▶ Mesmo fluxo: adiciona quota ao balance                      │
│                                                                     │
│  4. Cliente faz upgrade para Business                               │
│     └─▶ Plan.aiCreditsQuota agora é 1500                            │
│     └─▶ Próximo pagamento adiciona 1500 créditos                    │
│                                                                     │
│  5. Pagamento falha (PAYMENT_OVERDUE)                               │
│     └─▶ Subscription.status = past_due                              │
│     └─▶ Créditos existentes continuam funcionando                   │
│     └─▶ Não adiciona novos até regularizar                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Ações que Consomem Créditos

| Ação | Créditos | Provider |
|------|----------|----------|
| Geração de follow-up | 1 | Gemini Flash |
| Análise de conversa | 2 | Groq/Llama |
| Sugestão de resposta | 1 | Gemini Flash |

---

## Quotas por Plano

| Plano | Preço | aiCreditsQuota | Custo IA (100% uso) |
|-------|-------|----------------|---------------------|
| Free | R$ 0 | 0 | - |
| Starter | R$ 97 | 100 | ~R$ 0.04 |
| Pro | R$ 297 | 500 | ~R$ 0.20 |
| Business | R$ 497 | 1.500 | ~R$ 0.60 |
| Enterprise | R$ 1.497 | 5.000 | ~R$ 2.00 |

**Cálculo de custo**:
- Gemini Flash: ~R$ 0.0004/geração
- Groq: ~R$ 0.0006/análise (ou grátis no free tier)

---

## Regras de Negócio

1. **Créditos via webhook**: Adicionados automaticamente quando `PAYMENT_CONFIRMED`
2. **Acumulam**: Saldo não utilizado soma ao novo (`balance += quota`)
3. **Verificação**: Toda ação de IA verifica saldo antes de executar
4. **Falha graceful**: Se sem créditos, não executa (mostra modal de upgrade)
5. **MVP sem compra avulsa**: Simplifica - apenas upgrade de plano

---

## Cenários de Cancelamento e Falha

### Pagamento Recusado / Vencido

| Evento Asaas | Subscription Status | Créditos |
|--------------|---------------------|----------|
| `PAYMENT_OVERDUE` | `past_due` | Continuam funcionando (já pagou) |
| `PAYMENT_REFUNDED` | `past_due` | Continuam funcionando |
| `PAYMENT_DELETED` | `past_due` | Continuam funcionando |

**Regra**: Créditos já creditados pertencem ao cliente. Ele pagou por eles.

```
Pagamento falha
      │
      ▼
┌─────────────────────────────┐
│ Subscription.status = past_due
│ Créditos: mantém balance atual
│ Novos créditos: NÃO adiciona
└─────────────────────────────┘
      │
      ▼
Regulariza pagamento?
      │
      ├─▶ SIM: PAYMENT_CONFIRMED → adiciona quota normalmente
      │
      └─▶ NÃO (após grace period): Subscription.status = canceled
          └─▶ Ver seção "Cancelamento" abaixo
```

### Cancelamento de Plano

| Tipo | Subscription | Créditos |
|------|--------------|----------|
| `cancelAtPeriodEnd = true` | Ativa até `currentPeriodEnd` | Usa até o fim do período pago |
| Cancelamento imediato | `status = canceled` | **Zera balance** (perdeu acesso) |

**Regra**: Cancelamento imediato = perde créditos. Cancelamento no fim do período = usa até lá.

```typescript
// Quando Subscription é cancelada imediatamente
private async handleSubscriptionCanceled(subscriptionId: string): Promise<void> {
  const subscription = await this.prisma.subscription.findFirst({
    where: { externalId: subscriptionId },
    include: { billingCustomer: true }
  })

  if (subscription && subscription.status === 'canceled') {
    const orgId = subscription.billingCustomer.organizationId

    // Busca créditos atuais para salvar antes de zerar
    const currentCredits = await this.prisma.aICredits.findUnique({
      where: { organizationId: orgId }
    })

    // Salva balance para possível reativação e zera
    await this.prisma.aICredits.updateMany({
      where: { organizationId: orgId },
      data: {
        balanceAtCancellation: currentCredits?.balance || 0,
        canceledAt: new Date(),
        balance: 0,
        usedThisCycle: 0
      }
    })
  }
}
```

### Downgrade de Plano

| Cenário | Créditos |
|---------|----------|
| Business → Pro | Mantém balance atual, próxima recarga será 500 (não 1500) |
| Pro → Free | Mantém balance até acabar, não recarrega mais |

**Regra**: Downgrade não remove créditos já creditados. Apenas muda a quota futura.

### Trial Period

| Status | Créditos | Comportamento |
|--------|----------|---------------|
| `trialing` | 20 | Renovado mensalmente durante o trial |

**Regras**:
- Trial recebe 20 créditos (não acumula - reseta para 20 a cada mês)
- Permite testar a funcionalidade de IA sem risco de abuso
- Ao converter para plano pago, recebe quota completa do plano

```typescript
// No handlePaymentSuccess ou em cron de trial
if (subscription.status === 'trialing') {
  await this.prisma.aICredits.upsert({
    where: { organizationId: orgId },
    create: { organizationId: orgId, balance: 20 },
    update: { balance: 20 } // Reseta para 20, não acumula
  })
}
```

### Reativação (Win-back)

| Cenário | Créditos |
|---------|----------|
| Reativa em até 30 dias | **Restaura balance anterior** |
| Reativa após 30 dias | Começa do zero |

**Regra**: Campanha de reativação - cliente que volta em até 30 dias recupera os créditos que tinha.

```prisma
// Adicionar ao model AICredits
model AICredits {
  // ... campos existentes ...

  // Para reativação
  balanceAtCancellation Int?       // Saldo no momento do cancelamento
  canceledAt            DateTime?  // Data do cancelamento
}
```

```typescript
// Ao reativar subscription
async function handleReactivation(organizationId: string): Promise<void> {
  const credits = await prisma.aICredits.findUnique({
    where: { organizationId }
  })

  if (!credits) return

  const daysSinceCancellation = credits.canceledAt
    ? differenceInDays(new Date(), credits.canceledAt)
    : Infinity

  if (daysSinceCancellation <= 30 && credits.balanceAtCancellation) {
    // Restaura créditos anteriores
    await prisma.aICredits.update({
      where: { organizationId },
      data: {
        balance: credits.balanceAtCancellation,
        balanceAtCancellation: null,
        canceledAt: null
      }
    })
  }
  // Se > 30 dias, primeiro pagamento adiciona quota normalmente
}
```

---

## Rate Limiting

Protege contra abuso mesmo com créditos disponíveis.

| Limite | Valor | Descrição |
|--------|-------|-----------|
| Requests/minuto | 10 | Por organização |
| Requests/hora | 100 | Por organização |

**Regra**: Rate limit sempre ativo, independente do saldo de créditos.

**Implementação**: Usa Redis local (mesmo do docker-compose) com `rate-limiter-flexible`.

```bash
npm i rate-limiter-flexible
```

```typescript
// src/lib/credits/rate-limit.ts
import { RateLimiterRedis } from 'rate-limiter-flexible'
import { redis } from '@/lib/redis' // Redis já existente no projeto

const rateLimiterMinute = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'ai_ratelimit_min',
  points: 10,      // 10 requests
  duration: 60,    // por minuto
})

const rateLimiterHour = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'ai_ratelimit_hour',
  points: 100,     // 100 requests
  duration: 3600,  // por hora
})

async function checkRateLimit(organizationId: string): Promise<{
  allowed: boolean
  remaining: number
  retryAfterMs?: number
}> {
  try {
    const [resMinute, resHour] = await Promise.all([
      rateLimiterMinute.consume(organizationId),
      rateLimiterHour.consume(organizationId),
    ])

    return {
      allowed: true,
      remaining: Math.min(resMinute.remainingPoints, resHour.remainingPoints),
    }
  } catch (error) {
    // Rate limit exceeded
    if (error instanceof Error && 'msBeforeNext' in error) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: (error as any).msBeforeNext,
      }
    }
    throw error
  }
}
```

---

## Notificações de Low Credits

Avisar o cliente quando créditos estão acabando.

| Threshold | Notificação |
|-----------|-------------|
| 20% da quota | Email + In-app banner |
| 10% da quota | Email urgente + In-app modal |
| 0 créditos | Email + Bloqueia ações de IA |

```typescript
// Verificar após cada consumo
async function checkLowCreditsNotification(organizationId: string): Promise<void> {
  const { balance, quota } = await getCredits(organizationId)
  const percentRemaining = (balance / quota) * 100

  if (percentRemaining <= 10 && percentRemaining > 0) {
    await sendLowCreditsEmail(organizationId, 'urgent', balance)
    await createInAppNotification(organizationId, 'low_credits_urgent')
  } else if (percentRemaining <= 20) {
    await sendLowCreditsEmail(organizationId, 'warning', balance)
    await createInAppNotification(organizationId, 'low_credits_warning')
  }
}
```

### UI: Banner de Low Credits
```
┌────────────────────────────────────────────────────────────────────┐
│ ⚠️ Você tem apenas 15 créditos restantes. [Fazer Upgrade]         │
└────────────────────────────────────────────────────────────────────┘
```

---

## Relatórios e Dashboards

**Nota**: Dashboards de uso de créditos serão planejados em PRD separado junto com outros dashboards do SaaS.

Dados disponíveis para relatórios:
- Uso por ação (follow-up, análise, sugestão)
- Uso por período (dia, semana, mês)
- Histórico de recargas
- ROI de IA (conversões após análise/follow-up)

---

### Verificação antes de consumir

```typescript
// src/lib/credits/check-credits.ts
async function canUseCredits(organizationId: string, amount: number): Promise<{
  allowed: boolean
  reason?: 'no_credits' | 'subscription_inactive' | 'plan_no_ai'
}> {
  // 1. Busca subscription ativa
  const subscription = await getActiveSubscription(organizationId)

  if (!subscription) {
    return { allowed: false, reason: 'subscription_inactive' }
  }

  // 2. Verifica se plano tem IA
  if (subscription.plan.aiCreditsQuota === 0) {
    return { allowed: false, reason: 'plan_no_ai' }
  }

  // 3. Verifica saldo (mesmo em past_due, pode usar)
  const credits = await prisma.aICredits.findUnique({
    where: { organizationId }
  })

  if (!credits || credits.balance < amount) {
    return { allowed: false, reason: 'no_credits' }
  }

  return { allowed: true }
}
```

---

## Controle de Follow-up Automático

| Nível | Configuração | Descrição |
|-------|--------------|-----------|
| **Organização** | Settings > Follow-up | Define se follow-up está habilitado para toda org (default: ON) |
| **Conversa** | Toggle no painel | Atendente pode desativar em conversas específicas |

**Regra**: Org define o padrão, conversa pode sobrescrever para OFF (nunca para ON se org desativou).

---

## Alterações no Schema Existente

### Adicionar campo ao Plan (já existe)

```prisma
model Plan {
  // ... campos existentes ...

  // NOVO: Quota de créditos de IA
  aiCreditsQuota Int @default(0) // Free=0, Starter=100, Pro=500, Business=1500, Enterprise=5000
}
```

### Novo model: AICredits

```prisma
model AICredits {
  id             String   @id @default(cuid())
  organizationId String   @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  balance        Int      @default(0)      // Saldo total (acumulado)
  usedThisCycle  Int      @default(0)      // Usado no ciclo atual

  // Tracking
  lastCreditedAt DateTime?                 // Última vez que créditos foram adicionados

  // Para reativação (win-back campaign)
  balanceAtCancellation Int?               // Saldo no momento do cancelamento
  canceledAt            DateTime?          // Data do cancelamento

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  usageLogs      AIUsageLog[]

  @@map("ai_credits")
}
```

### Novo model: AIUsageLog

```prisma
model AIUsageLog {
  id             String   @id @default(cuid())
  organizationId String

  aiCreditsId    String
  aiCredits      AICredits @relation(fields: [aiCreditsId], references: [id], onDelete: Cascade)

  // Ação
  action         String   // "followup_generation", "ticket_analysis", "response_suggestion"
  creditsUsed    Int

  // Contexto
  ticketId       String?  // Referência ao ticket (consistente com TicketAnalysis)
  contactPhone   String?  // Telefone do lead (para auditoria)

  // Metadata técnica
  model          String?  // "gemini-2.0-flash", "llama-3.3-70b"
  inputTokens    Int?
  outputTokens   Int?
  latencyMs      Int?

  // Quem disparou
  triggeredBy    String   // "system" ou "user:{userId}"

  createdAt      DateTime @default(now())

  @@index([organizationId, createdAt])
  @@index([aiCreditsId])
  @@map("ai_usage_logs")
}
```

---

## Modificar AsaasWebhookProcessor

```typescript
// src/services/billing/providers/asaas/webhook-processor.ts

private async handlePaymentSuccess(payment: AsaasPaymentPayload): Promise<WebhookProcessResult> {
  // ... código existente ...

  // NOVO: Adicionar créditos de IA
  if (payment.subscription) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { externalId: payment.subscription },
      include: {
        plan: true,
        billingCustomer: { include: { organization: true } }
      }
    })

    if (subscription?.billingCustomer.organization) {
      const orgId = subscription.billingCustomer.organizationId
      const quota = subscription.plan.aiCreditsQuota || 0

      if (quota > 0) {
        await this.prisma.aICredits.upsert({
          where: { organizationId: orgId },
          create: {
            organizationId: orgId,
            balance: quota,
            usedThisCycle: 0,
            lastCreditedAt: new Date()
          },
          update: {
            balance: { increment: quota },
            usedThisCycle: 0,
            lastCreditedAt: new Date()
          }
        })
      }
    }
  }

  // ... resto do código existente ...
}
```

---

## APIs

```
GET /api/v1/credits
Response: {
  balance: 145,
  usedThisCycle: 23,
  plan: {
    name: "Pro",
    quota: 500
  },
  nextBillingDate: "2024-01-19",  // Via Subscription.currentPeriodEnd
  usageByAction: {
    followup_generation: 15,
    conversation_analysis: 8
  }
}
```

---

## Funções Core

```typescript
// src/lib/credits/check-credits.ts
async function hasCredits(organizationId: string, amount: number): Promise<boolean>

// src/lib/credits/consume-credits.ts
async function consumeCredits(params: {
  organizationId: string
  amount: number
  action: 'followup_generation' | 'ticket_analysis' | 'response_suggestion'
  ticketId?: string
  contactPhone?: string
  metadata?: { model?: string, inputTokens?: number, outputTokens?: number, latencyMs?: number }
  triggeredBy: string // "system" ou "user:{userId}"
}): Promise<{ success: boolean, newBalance: number }>

// src/lib/credits/get-credits.ts
async function getCredits(organizationId: string): Promise<{
  balance: number
  usedThisCycle: number
  quota: number
  planName: string
}>
```

---

## UI

### Badge de créditos (header ou sidebar)
```
⚡ 145 créditos
```

### No accordion de AI Insights
```
⚡ Créditos: 145 restantes
[Analisar Conversa] (2 créditos)
```

### Modal de "sem créditos"
```
┌─────────────────────────────────────┐
│  Créditos insuficientes             │
│                                     │
│  Você precisa de 2 créditos para    │
│  analisar esta conversa.            │
│                                     │
│  Saldo atual: 1 crédito             │
│                                     │
│  [Fazer Upgrade]                    │
└─────────────────────────────────────┘
```

---

## Seed: Atualizar Planos Existentes

```typescript
// prisma/seed.ts - Adicionar aiCreditsQuota aos planos

const plans = [
  { slug: 'free', aiCreditsQuota: 0 },
  { slug: 'starter', aiCreditsQuota: 100 },
  { slug: 'pro', aiCreditsQuota: 500 },
  { slug: 'business', aiCreditsQuota: 1500 },
  { slug: 'enterprise', aiCreditsQuota: 5000 },
]

for (const plan of plans) {
  await prisma.plan.update({
    where: { slug: plan.slug },
    data: { aiCreditsQuota: plan.aiCreditsQuota }
  })
}
```
