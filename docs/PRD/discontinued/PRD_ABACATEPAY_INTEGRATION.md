# PRD: Integração AbacatePay — Billing com Cartão de Crédito

**Status**: Phase 1 Recomendado (Simples + BR)
**Provider**: AbacatePay (Payment Gateway Brasileiro)
**Payment Methods**: CARD (Cartão de Crédito) + PIX (opcional)
**Owner**: Engineering
**Updated**: 2026-02-28

---

## Context

AbacatePay é um payment gateway brasileiro **simples e moderno**, perfeito para subscriptions com cartão de crédito. Não precisa de complexidade Stripe/Polar — AbacatePay foi feito para exatamente esse caso.

**Vantagens**:
- ✅ **Cartão de crédito** (recurring subscriptions)
- ✅ **Made in Brazil** — Documentação PT-BR
- ✅ **Simples** — Menos overhead que Stripe
- ✅ **Webhooks nativo** — Igual ao padrão
- ✅ **Provider agnóstico** — Funciona com sua arquitetura
- ✅ **SDK oficial Node.js** — Integração fácil

**Foco**: Cartão de crédito apenas (sem PIX, sem boleto) para subscriptions recorrentes.

---

## 1. Setup AbacatePay

### Passo 1: Criar Conta

1. Ir para: https://abacatepay.com (ou seu dashboard)
2. **Cadastro**: Email + senha
3. **Verificação**: Email
4. Login no dashboard

### Passo 2: Gerar API Keys

1. Dashboard → **Configurações** → **API Keys** (ou similar)
2. **Gerar chave privada**: Cole em `.env.local` como `ABACATEPAY_SECRET_KEY`
3. **Gerar chave pública**: Cole em `.env.local` como `NEXT_PUBLIC_ABACATEPAY_PUBLIC_KEY`

### Passo 3: Webhook Secret

1. Dashboard → **Webhooks** (ou **Notificações**)
2. **Criar webhook endpoint**: `https://seu-dominio.com/api/v1/billing/webhooks/abacatepay`
3. **Copiar secret** → Cole em `.env.local` como `ABACATEPAY_WEBHOOK_SECRET`

---

## 2. Estrutura de Planos

AbacatePay não tem "produtos pré-configurados" — você define valores direto na chamada de checkout.

```typescript
// src/lib/payments/providers/abacatepay-constants.ts
export const ABACATEPAY_PLANS = {
  starter: {
    name: 'WhaTrack Starter',
    description: 'Para começar a rastrear suas vendas',
    monthlyPrice: 9700, // Centavos: R$ 97.00
    eventLimit: 200,
    overagePrice: 0.25,
  },
  pro: {
    name: 'WhaTrack Pro',
    description: 'Para agências e operações em escala',
    monthlyPrice: 19700, // Centavos: R$ 197.00
    eventLimit: 500,
    overagePrice: 0.18,
  },
  agency: {
    name: 'WhaTrack Agency',
    description: 'Para agências complexas',
    monthlyPrice: 0, // Sob consulta
    eventLimit: 10000,
    overagePrice: 0.12,
  },
}
```

---

## 3. AbacatepayProvider Implementation

```typescript
// src/lib/payments/providers/abacatepay-provider.ts
import axios from 'axios'
import { env } from '@/lib/env/env'
import type { PaymentProvider, CheckoutSession, SubscriptionDetails } from './payment-provider'
import { ABACATEPAY_PLANS } from './abacatepay-constants'

export class AbacatepayProvider implements PaymentProvider {
  private baseUrl = 'https://api.abacatepay.com/v1' // Ou seu endpoint
  private secretKey: string

  constructor(secretKey: string) {
    this.secretKey = secretKey
  }

  getProviderId(): string {
    return 'abacatepay'
  }

  isConfigured(): boolean {
    return !!this.secretKey
  }

  private headers() {
    return {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    }
  }

  async createCheckoutSession(params: {
    organizationId: string
    planType: 'starter' | 'pro' | 'agency'
    successUrl: string
    returnUrl: string
  }): Promise<CheckoutSession> {
    const plan = ABACATEPAY_PLANS[params.planType]

    // AbacatePay cria um "charge" ou "subscription link"
    // Exemplo: POST /charges ou /subscriptions
    try {
      const response = await axios.post(
        `${this.baseUrl}/subscriptions`, // ou /charges
        {
          customer: {
            externalId: params.organizationId, // Seu organizationId
            email: '', // Preenchido depois
          },
          amount: plan.monthlyPrice, // Em centavos
          interval: 'month', // Recorrente mensal
          description: plan.name,
          paymentMethod: 'card', // Apenas cartão
          returnUrl: params.successUrl,
          // Outros campos conforme AbacatePay API
        },
        { headers: this.headers() }
      )

      return {
        id: response.data.id,
        url: response.data.checkoutUrl || response.data.link, // AbacatePay fornece URL de checkout
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        method: 'card' as const,
      }
    } catch (error) {
      throw new Error(`AbacatePay checkout creation failed: ${error}`)
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionDetails> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/subscriptions/${subscriptionId}`,
        { headers: this.headers() }
      )

      const sub = response.data

      return {
        id: sub.id,
        customerId: sub.customer?.id || sub.customerId,
        status: this.mapStatus(sub.status),
        currentPeriodStart: new Date(sub.nextBillingDate),
        currentPeriodEnd: new Date(
          new Date(sub.nextBillingDate).getTime() + 30 * 24 * 60 * 60 * 1000
        ),
        provider: 'abacatepay',
      }
    } catch (error) {
      throw new Error(`AbacatePay get subscription failed: ${error}`)
    }
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<void> {
    try {
      // AbacatePay: PATCH ou DELETE /subscriptions/{id}
      await axios.patch(
        `${this.baseUrl}/subscriptions/${subscriptionId}`,
        {
          status: 'cancelled',
          cancelAtPeriodEnd: atPeriodEnd, // ou apenas cancel agora
        },
        { headers: this.headers() }
      )
    } catch (error) {
      throw new Error(`AbacatePay cancel subscription failed: ${error}`)
    }
  }

  async updateSubscriptionPlan(
    subscriptionId: string,
    newPlanType: 'starter' | 'pro' | 'agency'
  ): Promise<void> {
    // AbacatePay: Update subscription amount
    const newPlan = ABACATEPAY_PLANS[newPlanType]

    try {
      await axios.patch(
        `${this.baseUrl}/subscriptions/${subscriptionId}`,
        {
          amount: newPlan.monthlyPrice,
          // Proration conforme AbacatePay suporta
        },
        { headers: this.headers() }
      )
    } catch (error) {
      throw new Error(`AbacatePay plan change failed: ${error}`)
    }
  }

  private mapStatus(status: string): 'active' | 'paused' | 'canceled' | 'past_due' {
    const map: Record<string, 'active' | 'paused' | 'canceled' | 'past_due'> = {
      active: 'active',
      pending: 'past_due',
      cancelled: 'canceled',
      paused: 'paused',
      failed: 'past_due',
      expired: 'canceled',
    }
    return map[status] ?? 'past_due'
  }
}
```

---

## 4. Route Handler - Checkout

```typescript
// src/app/api/v1/billing/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env/env'
import { requireAuth } from '@/lib/auth/guards'
import { ensurePaymentProviders } from '@/lib/payments/init'
import { providerRegistry } from '@/lib/payments/providers/provider-registry'

export async function POST(request: NextRequest) {
  // 1. Autenticação
  const session = await requireAuth(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse do body
  const body = await request.json()
  const { planType, email } = body // 'starter' | 'pro' | 'agency'

  if (!['starter', 'pro', 'agency'].includes(planType)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const organizationId = session.user.organization?.id
  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization' }, { status: 400 })
  }

  try {
    // 3. Delegar ao provider
    ensurePaymentProviders()
    const provider = providerRegistry.getActive()

    const checkout = await provider.createCheckoutSession({
      organizationId,
      planType,
      successUrl: `${env.APP_URL}/billing/success?plan=${planType}`,
      returnUrl: `${env.APP_URL}/dashboard/billing`,
    })

    // 4. Retornar URL de pagamento
    return NextResponse.json({
      url: checkout.url,
      provider: provider.getProviderId(),
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
```

---

## 5. Webhook Handler - AbacatePay

```typescript
// src/app/api/v1/billing/webhooks/abacatepay/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateAbacatepayWebhook } from '@/lib/payments/webhooks/abacatepay-verify'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-abacatepay-signature') || ''

  // 1. Validar assinatura
  if (!(await validateAbacatepayWebhook(body, signature))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 2. Parse do payload
  const payload = JSON.parse(body)

  // 3. Deduplicação
  const existing = await prisma.billingWebhookLog.findUnique({
    where: { eventId: payload.id },
  })

  if (existing?.isProcessed) {
    return NextResponse.json({ ok: true })
  }

  // 4. Log
  const log = await prisma.billingWebhookLog.create({
    data: {
      provider: 'abacatepay',
      eventType: payload.type || payload.event,
      payload: payload,
      eventId: payload.id,
    },
  })

  // 5. Processar evento
  try {
    switch (payload.type || payload.event) {
      case 'subscription.created':
      case 'subscription.activated':
        await handleSubscriptionCreated(payload)
        break

      case 'subscription.updated':
        await handleSubscriptionUpdated(payload)
        break

      case 'subscription.cancelled':
      case 'subscription.deleted':
        await handleSubscriptionCanceled(payload)
        break

      case 'charge.completed':
      case 'charge.paid':
        // Pagamento confirmado
        await handlePaymentConfirmed(payload)
        break

      default:
        console.log(`[AbacatePay] Unhandled event: ${payload.type}`)
    }

    await prisma.billingWebhookLog.update({
      where: { id: log.id },
      data: { isProcessed: true, processedAt: new Date() },
    })
  } catch (error) {
    console.error('Webhook processing error:', error)
    // Retry logic se necessário
  }

  return NextResponse.json({ ok: true })
}

async function handleSubscriptionCreated(payload: any) {
  const subscription = payload.subscription || payload.data

  const organizationId = subscription.customer?.externalId

  if (!organizationId) {
    console.error('[AbacatePay] Missing organizationId in webhook')
    return
  }

  const planType = getPlanTypeFromAmount(subscription.amount)

  await prisma.billingSubscription.create({
    data: {
      organizationId,
      provider: 'abacatepay',
      providerCustomerId: subscription.customer?.id,
      providerSubscriptionId: subscription.id,
      planType,
      eventLimitPerMonth: planType === 'starter' ? 200 : 500,
      overagePricePerEvent: planType === 'starter' ? 0.25 : 0.18,
      billingCycleStartDate: new Date(),
      billingCycleEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      nextResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
  })
}

async function handleSubscriptionUpdated(payload: any) {
  const subscription = payload.subscription || payload.data

  await prisma.billingSubscription.update({
    where: { providerSubscriptionId: subscription.id },
    data: {
      status: subscription.status === 'active' ? 'active' : 'past_due',
    },
  })
}

async function handleSubscriptionCanceled(payload: any) {
  const subscription = payload.subscription || payload.data

  await prisma.billingSubscription.update({
    where: { providerSubscriptionId: subscription.id },
    data: {
      status: 'canceled',
      canceledAt: new Date(),
    },
  })
}

async function handlePaymentConfirmed(payload: any) {
  const charge = payload.charge || payload.data

  if (!charge.subscriptionId) return

  // Confirmar que payment foi aprovado
  await prisma.billingSubscription.update({
    where: { providerSubscriptionId: charge.subscriptionId },
    data: { status: 'active' },
  })
}

function getPlanTypeFromAmount(amountInCents: number): 'starter' | 'pro' {
  // 9700 centavos = R$ 97.00 = Starter
  // 19700 centavos = R$ 197.00 = Pro
  if (amountInCents <= 10000) return 'starter'
  return 'pro'
}
```

---

## 6. Webhook Signature Validation

```typescript
// src/lib/payments/webhooks/abacatepay-verify.ts
import crypto from 'crypto'
import { env } from '@/lib/env/env'

export async function validateAbacatepayWebhook(
  body: string,
  signature: string
): Promise<boolean> {
  // AbacatePay usa HMAC SHA256
  // Formato: x-abacatepay-signature: sha256=<hash>

  const hash = crypto
    .createHmac('sha256', env.ABACATEPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  const expectedSignature = `sha256=${hash}`

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    )
  } catch {
    return false
  }
}
```

---

## 7. Frontend - Landing Checkout

```typescript
// src/components/landing/LandingPricing.tsx (ajustado)
'use client'
import { useState } from 'react'
import { useSession } from '@/lib/auth/auth-client'

export function PricingCard({ plan }: { plan: 'starter' | 'pro' | 'agency' }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()

  async function handleCheckout() {
    if (!session?.user) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.href)}`
      return
    }

    if (!session?.user.organization?.id) {
      setError('No active organization')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: plan,
          email: session.user.email,
        }),
      })

      if (!response.ok) {
        throw new Error('Checkout failed')
      }

      const data = await response.json()

      // Redirecionar para AbacatePay checkout
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={`px-6 py-3 rounded-lg font-semibold ${
        loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {loading ? 'Aguarde...' : 'Começar agora'}
    </button>
  )
}
```

---

## 8. Environment Variables

```env
# AbacatePay
ABACATEPAY_SECRET_KEY=sk_live_xxxxx  # Chave privada
ABACATEPAY_WEBHOOK_SECRET=whsec_xxxxx

# Public
NEXT_PUBLIC_ABACATEPAY_PUBLIC_KEY=pk_live_xxxxx
```

Adicionar ao `src/lib/env/env.ts`:

```typescript
ABACATEPAY_SECRET_KEY: z.string().min(1, 'ABACATEPAY_SECRET_KEY is required'),
ABACATEPAY_WEBHOOK_SECRET: z.string().min(1, 'ABACATEPAY_WEBHOOK_SECRET is required'),
NEXT_PUBLIC_ABACATEPAY_PUBLIC_KEY: z.string().min(1, 'NEXT_PUBLIC_ABACATEPAY_PUBLIC_KEY is required'),
```

---

## 9. Registrar Provider no Init

```typescript
// src/lib/payments/init.ts
import { AbacatepayProvider } from './providers/abacatepay-provider'
import { env } from '@/lib/env/env'

let initialized = false

export function ensurePaymentProviders() {
  if (initialized) return

  // Registrar AbacatePay
  providerRegistry.register(
    'abacatepay',
    new AbacatepayProvider(env.ABACATEPAY_SECRET_KEY)
  )

  // Ativar como padrão
  providerRegistry.setActive('abacatepay')

  initialized = true
}
```

---

## 10. Fluxo Completo

```
1. Usuário clica "Começar agora" na landing
   ↓
2. POST /api/v1/billing/checkout { planType: 'starter', email: 'user@...' }
   ↓
3. Backend chama AbacatepayProvider.createCheckoutSession()
   ↓
4. AbacatePay cria subscription link
   ↓
5. Frontend redireciona para AbacatePay checkout (card form)
   ↓
6. Usuário insere dados do cartão e confirma
   ↓
7. AbacatePay processa pagamento (recorrente, mensal)
   ↓
8. AbacatePay envia webhook "subscription.created" ou "charge.paid"
   ↓
9. Backend processa webhook → cria BillingSubscription
   ↓
10. Usuário vê dashboard com subscription ativa
    ↓
11. Todo mês: AbacatePay cobra cartão automaticamente
    ↓
12. Webhook "charge.paid" a cada cobrança → você rastreia
```

---

## 11. Vantagens AbacatePay vs Stripe

| Aspecto | AbacatePay | Stripe |
|---------|-----------|--------|
| **Cartão de crédito** | ✅ Nativo | ✅ Nativo |
| **Subscriptions recorrentes** | ✅ Nativo | ✅ Nativo |
| **Complexidade** | ✅ Simples | ⚠️ Complexo |
| **Documentação PT-BR** | ✅ Sim | ❌ Inglês |
| **Setup rápido** | ✅ 1 dia | ⏳ 2-3 dias |
| **Taxas** | ⚠️ Verificar | ⚠️ Verificar |
| **Webhooks** | ✅ Agnóstico | ✅ Agnóstico |

**Recomendação**: Use AbacatePay agora. É mais simples, documentação em PT-BR, e foca exatamente em cartão recorrente.

---

## 12. Checklist de Implementação

- [ ] Criar conta AbacatePay
- [ ] Gerar API keys + webhook secret
- [ ] Preencher `.env.local`
- [ ] Implementar `AbacatepayProvider`
- [ ] Route handler checkout
- [ ] Webhook handler + validação HMAC
- [ ] Conectar landing checkout
- [ ] Testar em sandbox AbacatePay
- [ ] Criar `/billing/success` e `/dashboard/billing`
- [ ] Testar fluxo end-to-end

---

## 13. Tempo Estimado

- **Setup AbacatePay**: 1 dia
- **Implementação backend**: 2 dias
- **Frontend + testes**: 2 dias
- **Go live**: 5-7 dias total

---

## 14. Próximas Fases (Futuro)

- **Phase 2**: Adicionar PIX opcional (sem quebrar recurso)
- **Phase 3**: Upgrade/downgrade de planos
- **Phase 4**: Dunning (retry de pagamentos falhados)

A arquitetura agnóstica permite adicionar providers sem mudanças em services/routes.

---

**Status**: ✅ Pronto para implementação com AbacatePay.

Ver: `PRD_BILLING_SYSTEM.md` para arquitetura geral.
