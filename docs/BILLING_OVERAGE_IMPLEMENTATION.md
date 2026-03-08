# Implementação de Cobrança de Excedentes (Overage Billing)

## Visão Geral

WhaTrack usa um modelo **híbrido** onde o preço base é uma assinatura mensal na Stripe, e excedentes de eventos são calculados localmente e cobrados no final do período.

## Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    Ciclo de Faturamento (30 dias)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  DIA 1 (Início do Ciclo)                                        │
│  ├─ Usuário assina plano Starter (200 eventos/mês)              │
│  ├─ Stripe cria subscription com price_starter                  │
│  ├─ Cobrança: R$ 97,00                                          │
│  └─ Evento: checkout.session.completed → BD atualizado          │
│                                                                   │
│  DIAS 2-30 (Durante o Ciclo)                                    │
│  ├─ Aplicação registra cada evento (conversão, lead, etc)       │
│  ├─ Contador local: events_used_in_current_cycle += 1           │
│  ├─ Limite do plano: 200 eventos                                │
│  └─ Cliente pode ver uso em dashboard → /dashboard/billing      │
│                                                                   │
│  DIA 30 (Fim do Ciclo)                                          │
│  ├─ Webhook: customer.subscription.updated (Stripe)             │
│  ├─ Sistema calcula excedente:                                  │
│  │    excedente = events_used - limit_per_month                 │
│  │    excedente = 250 - 200 = 50 eventos                        │
│  │                                                               │
│  │  Se excedente > 0:                                           │
│  │    - Valor = 50 × R$ 0,25 = R$ 12,50                        │
│  │    - Cria item na fatura da Stripe via API                   │
│  │    - Stripe emite fatura com:                                │
│  │      * Assinatura: R$ 97,00                                  │
│  │      * Excedentes (50 eventos @ 0,25): R$ 12,50              │
│  │      * TOTAL: R$ 109,50                                      │
│  │                                                               │
│  └─ Reseta contador: events_used_in_current_cycle = 0           │
│                                                                   │
│  DIA 31 (Próximo Ciclo)                                         │
│  └─ Tudo repete...                                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Estrutura no Banco de Dados

### Tabela: BillingSubscription

```sql
CREATE TABLE billing_subscriptions (
  id UUID PRIMARY KEY,
  organizationId UUID NOT NULL UNIQUE,

  -- Plan info
  planType VARCHAR,  -- 'starter', 'pro', 'agency'
  eventLimitPerMonth INTEGER,  -- 200, 500, 10000

  -- Billing cycle (30 days rolling)
  billingCycleStartDate TIMESTAMP,
  billingCycleEndDate TIMESTAMP,
  nextResetDate TIMESTAMP,

  -- Usage tracking (reset every cycle)
  eventsUsedInCurrentCycle INTEGER DEFAULT 0,

  -- Provider info
  provider VARCHAR,  -- 'stripe', 'abacatepay'
  providerSubscriptionId VARCHAR UNIQUE,
  providerCustomerId VARCHAR UNIQUE,

  -- Status
  status VARCHAR,  -- 'active', 'past_due', 'canceled', 'paused'

  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

## Arquitetura de Código

### 1. Registro de Eventos

**Arquivo**: `src/services/billing/billing-metering.service.ts`

```typescript
export async function recordEventUsage(params: {
  organizationId: string
  eventType: string  // 'lead', 'conversion', 'message', etc
}) {
  // 1. Buscar subscription ativa
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId: params.organizationId }
  })

  if (!subscription || subscription.status !== 'active') {
    throw new Error('No active subscription')
  }

  // 2. Verificar se ciclo expirou
  const now = new Date()
  if (now > subscription.nextResetDate) {
    // Ciclo expirou, reseta
    await resetCycle(subscription.id)
  }

  // 3. Incrementar contador
  const updated = await prisma.billingSubscription.update({
    where: { id: subscription.id },
    data: {
      eventsUsedInCurrentCycle: {
        increment: 1
      }
    }
  })

  // 4. Log para auditoria
  await prisma.billingEventUsage.create({
    data: {
      subscriptionId: subscription.id,
      organizationId: params.organizationId,
      eventType: params.eventType,
      recordedAt: now
    }
  })

  return updated
}
```

### 2. Cálculo de Excedente

**Arquivo**: `src/services/billing/billing-subscription.service.ts`

```typescript
export async function calculateOverage(subscriptionId: string) {
  const subscription = await prisma.billingSubscription.findUnique({
    where: { id: subscriptionId }
  })

  const plan = getBillingPlan(subscription.planType)

  const exceeded = subscription.eventsUsedInCurrentCycle - plan.eventLimitPerMonth

  if (exceeded <= 0) {
    return {
      hasOverage: false,
      events: 0,
      amount: 0
    }
  }

  return {
    hasOverage: true,
    events: exceeded,
    amount: exceeded * plan.overagePricePerEvent  // Ex: 50 × 0.25 = 12.50
  }
}
```

### 3. Webhook do Stripe (Final do Ciclo)

**Arquivo**: `src/services/billing/handlers/stripe-webhook.handler.ts`

Quando `customer.subscription.updated` é recebido:

```typescript
async function handleSubscriptionUpdated(stripeSubscription) {
  const dbSubscription = await findByStripeId(stripeSubscription.id)

  // Verificar se ciclo venceu
  const now = new Date()
  if (now >= dbSubscription.nextResetDate) {
    // 1. Calcular excedente do ciclo que está terminando
    const overage = await calculateOverage(dbSubscription.id)

    if (overage.hasOverage) {
      // 2. Criar item na fatura do Stripe
      await stripe.invoiceItems.create({
        customer: dbSubscription.providerCustomerId,
        amount: Math.round(overage.amount * 100),  // Centavos
        currency: 'brl',
        description: `${overage.events} eventos extras @ R$ ${plan.overagePricePerEvent}`,
        subscription: dbSubscription.providerSubscriptionId
      })

      // 3. Log do excedente
      await prisma.billingOverageLog.create({
        data: {
          subscriptionId: dbSubscription.id,
          eventsOver: overage.events,
          amountCharged: overage.amount,
          cycleEndDate: dbSubscription.nextResetDate
        }
      })
    }

    // 4. Reseta o contador para o próximo ciclo
    await resetCycleCounters(dbSubscription.id)
  }
}
```

## Dados na Stripe

### Como aparece para o cliente no Portal Stripe

**Fatura de exemplo** (fim do ciclo):

```
Fatura #INV-001
Data: 30 de Março, 2026
Cliente: João Silva

═══════════════════════════════════
Descrição                Qtd.    Valor
───────────────────────────────────
Plano Starter - Mensal    1   R$ 97,00
50 eventos extras @ 0,25  50  R$ 12,50
───────────────────────────────────
TOTAL DEVIDO                      R$ 109,50
═══════════════════════════════════

Data de Vencimento: 07 de Abril, 2026
Método de Pagamento: Cartão terminado em 4242
```

### Campos na Stripe Dashboard

Quando você vai a **Invoices** no dashboard:

```
Invoice ID: in_1T5nigQrzlIAxgo4...
Amount: R$ 109,50
Status: Paid
Customer: stripe_cus_xxx
Subscription: sub_1T5nigQrzlIAxgo4...

Items:
  - Starter subscription: R$ 97,00 (from customer.subscription.updated)
  - Invoice item (50 eventos extras): R$ 12,50 (created by API)
```

## Configuração no WhaTrack

### Arquivo: `src/lib/billing/plans.ts`

```typescript
export const BILLING_PLANS = {
  starter: {
    eventLimitPerMonth: 200,
    overagePricePerEvent: 0.25,
    overageLabel: 'R$ 0,25 por evento extra',
    // ...
  },
  pro: {
    eventLimitPerMonth: 500,
    overagePricePerEvent: 0.18,
    overageLabel: 'R$ 0,18 por evento extra',
    // ...
  },
  agency: {
    eventLimitPerMonth: 10000,
    overagePricePerEvent: 0.12,
    overageLabel: 'R$ 0,12 por evento extra',
    // ...
  }
}
```

## Dashboard do Cliente

Na página `/dashboard/billing`, o cliente vê:

```
┌─────────────────────────────────────────┐
│  Plano Starter                    Ativo  │
├─────────────────────────────────────────┤
│                                          │
│  Limite: 200 eventos/mês                │
│  Usados: 180 / 200  ████████░░          │
│  Disponíveis: 20                        │
│                                          │
│  Excedente: R$ 0,25 por evento          │
│  (Se atingir limite)                    │
│                                          │
│  Próximo reset: 30 de Março             │
│  Dias restantes: 7                      │
│                                          │
│  [Gerenciar assinatura]  [Cancelar]    │
└─────────────────────────────────────────┘
```

## Casos de Uso

### Caso 1: Sem Excedente

```
Cliente com plano Starter
├─ Limite: 200 eventos
├─ Usados: 150 eventos
└─ Fim do ciclo:
   ├─ Excedente: 0
   ├─ Stripe cobra: R$ 97,00 (apenas assinatura)
   └─ Próximo ciclo começa
```

### Caso 2: Com Excedente

```
Cliente com plano Starter
├─ Limite: 200 eventos
├─ Usados: 280 eventos
└─ Fim do ciclo:
   ├─ Excedente: 80 eventos
   ├─ Valor excedente: 80 × R$ 0,25 = R$ 20,00
   ├─ Stripe cobra:
   │  ├─ Assinatura: R$ 97,00
   │  └─ Excedentes: R$ 20,00
   │  └─ TOTAL: R$ 117,00
   └─ Próximo ciclo começa (contador reseta)
```

### Caso 3: Upgrade No Meio do Ciclo

```
Cliente com plano Starter → Pro
├─ Dia 15: Muda de Starter para Pro
├─ Stripe:
│  ├─ Cancela subscription Starter (prorrateado)
│  └─ Cria nova subscription Pro
├─ WhaTrack:
│  ├─ Copia eventos usados: 80
│  ├─ Novo limite: 500
│  └─ Próximo reset: ainda em 30 de Março
└─ Fim do ciclo:
   ├─ Eventos naquele ciclo: 80 (preservados)
   ├─ Novo limite: 500 (Pro)
   └─ Sem excedente
```

## Testes Recomendados

### Teste 1: Simular Ciclo Completo

```bash
# 1. Criar assinatura
POST /api/v1/billing/checkout
{ planType: 'starter' }

# 2. Registrar eventos
POST /api/v1/billing/events
{ count: 250 }  # Acima do limite de 200

# 3. Verificar em dashboard
GET /dashboard/billing
# Verifica: 250 usados, 50 de excedente

# 4. Simular fim do ciclo (ajustar nextResetDate no BD)
# UPDATE billing_subscriptions SET next_reset_date = NOW()

# 5. Trigger webhook manualmente
curl -X POST http://localhost:3000/api/v1/billing/webhooks/stripe \
  -H "stripe-signature: t=...,v1=..." \
  -d '{
    "type": "customer.subscription.updated",
    "data": { "object": { ... } }
  }'

# 6. Validar na Stripe Dashboard
# → Invoice deve ter 2 items:
#    - Starter subscription: R$ 97
#    - Excedentes (50 @ 0,25): R$ 12,50
#    - Total: R$ 109,50
```

### Teste 2: Upgrade No Meio do Ciclo

```bash
# Dia 1: Assina Starter
POST /api/v1/billing/checkout
{ planType: 'starter' }

# Dia 15: Registra 250 eventos
POST /api/v1/billing/events
{ count: 250 }

# Dia 15: Upgrade para Pro
POST /api/v1/billing/upgrade
{ newPlanType: 'pro' }

# Verificar:
# - Stripe: 2 subscriptions (Starter proratizado, Pro novo)
# - WhaTrack: eventos preservados (250), novo limite (500)
# - Sem excedente porque 250 < 500
```

## Fluxo de Implementação Pendente

Para cobrança real de excedentes, você precisa implementar:

1. **`billingOverageLog` table** no Prisma schema
   - Para auditoria de cobranças extras

2. **`resetCycleCounters()`** no billing service
   - Reseta `eventsUsedInCurrentCycle` para 0
   - Atualiza `billingCycleStartDate` e `nextResetDate`

3. **Stripe `invoiceItems.create()` API call**
   - Cria item extra na fatura
   - Chamado quando excedente > 0

4. **Agendador de ciclos** (opcional)
   - CRON job que dispara cálculo de excedentes
   - Ou via webhook (recomendado)

## Referências

- [Stripe Invoices API](https://stripe.com/docs/api/invoices)
- [Stripe Invoice Items API](https://stripe.com/docs/api/invoiceitems)
- [Stripe Billing Cycles](https://stripe.com/docs/billing/subscriptions/billing-cycle)
- [Usage-Based Billing (futuro)](https://stripe.com/docs/billing/subscriptions/metered-billing)
