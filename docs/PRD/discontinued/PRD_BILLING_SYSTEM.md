# PRD: Sistema de Billing — WhaTrack

**Status**: Ready for Implementation
**Target Release**: Sprint 1
**Owner**: Engineering
**Updated**: 2026-02-27

---

## 1. Executive Summary

Implementar sistema de pagamentos recorrente para monetizar WhaTrack com **3 planos** (Starter R$97, Pro R$197, Agency sob consulta).

**Arquitetura agnóstica a provider** via Strategy Pattern permite suportar Polar (inicial), ASAAS, Stripe ou outros no futuro sem refatoração do código de negócio.

**Metering baseado em eventos**: Lead qualificado enviado para Meta + Purchase confirmada, com reset de 30 dias por ciclo de assinatura (não calendário).

---

## 2. Planos e Limites

| Plano | Preço | Eventos/ciclo | Overage | WhatsApp | Ad Accounts | Suporte |
|-------|-------|---|---|---|---|---|
| **Starter** | R$97/mês | 200 | R$0,25/evt | 1 | 1 | Email |
| **Pro** | R$197/mês | 500 | R$0,18/evt | 2 | 2 | Prioritário |
| **Agency** | Sob consulta | Custom | Custom | Custom | Custom | Dedicado |

---

## 3. Event Tracking

**O que conta como evento:**
- Lead qualificado + enviado para Meta (após AI approval) = +1 evento
- Purchase criada com status `confirmed` = +1 evento
- **Customização futura**: cliente define stages do funil e atribui eventos por stage

**Reset do contador:**
- 30 dias a partir da data da assinatura (não calendário)
- Ex: assinado em 27/02 → reset em 27/03 → próximo em 27/04

**`billingCycle` (campo String `YYYY-MM`):**
- Usa o mês de início do ciclo como chave de agregação histórica
- Ex: ciclo 27/02–27/03 → `billingCycle = "2026-02"`
- Ciclo 27/03–27/04 → `billingCycle = "2026-03"`

---

## 4. User Flows

### Flow 1: Nova assinatura
1. Usuário clica "Começar agora" na landing
2. Frontend chama `POST /api/v1/billing/checkout` com `planType` e `organizationId` (extraído da sessão no backend)
3. Backend cria checkout session via provider → retorna `{ url }`
4. Usuário é redirecionado para checkout do provider
5. Provider processa → envia webhook `order.paid`
6. Handler cria `BillingSubscription` no banco
7. Dashboard mostra `0/200` (ou `0/500`)

### Flow 2: Consumo de evento
1. Lead qualificado é enviado para Meta (ou Purchase criada)
2. Sistema chama `billingMeteringService.recordEvent(organizationId, 'lead_qualified')`
3. Incrementa `eventsUsedInCurrentCycle`
4. Se `eventsUsedInCurrentCycle > eventLimitPerMonth` → marca overage para cobrança posterior

### Flow 3: Cancelamento
1. Usuário clica "Cancelar" em Settings → Billing
2. Modal: "Cancelar agora ou no fim do período?"
3. `POST /api/v1/billing/cancel` → provider API → atualiza DB
4. Dashboard mostra "Assinatura será cancelada em X dias" (se `canceledAtPeriodEnd`)

### Flow 4: Dashboard de uso
- Plano atual, eventos usados/limite (progress bar)
- Data do próximo reset
- Botão upgrade/downgrade (fase 2)
- Histórico de faturas (fase 2)

---

## 5. Arquitetura

### 5.1 Estrutura de arquivos (DDD)

Seguir padrão `src/<layer>/<domain>/`:

```
src/
├── app/api/v1/billing/
│   ├── webhooks/[provider]/route.ts      # POST /webhooks/polar|asaas|stripe
│   ├── subscription/route.ts             # GET subscription ativa
│   ├── checkout/route.ts                 # POST criar checkout session
│   ├── cancel/route.ts                   # POST cancelar subscription
│   └── usage/route.ts                    # GET uso do ciclo atual
│
├── services/billing/
│   ├── billing-subscription.service.ts   # CRUD + lifecycle
│   ├── billing-metering.service.ts       # Event recording + limits
│   └── handlers/
│       └── payment-webhook.handler.ts    # Orquestrar webhooks (agnóstico)
│
├── server/billing/
│   └── billing-permissions.ts            # Auth/authorization
│
├── schemas/billing/
│   └── billing-schemas.ts                # Zod validations
│
├── types/billing/
│   └── billing.ts                        # TypeScript types
│
├── lib/payments/
│   ├── providers/
│   │   ├── payment-provider.ts           # Interface + tipos
│   │   ├── provider-registry.ts          # Factory/Registry singleton
│   │   ├── polar-provider.ts             # Implementação Polar
│   │   ├── asaas-provider.ts             # Placeholder (Phase 2)
│   │   └── stripe-provider.ts            # Placeholder (Phase 3)
│   ├── init.ts                           # Bootstrap (importado por route handlers)
│   ├── metering-constants.ts             # Limites e preços por plano
│   └── billing-utils.ts                  # Funções puras (cálculos de ciclo)
│
└── components/dashboard/billing/
    ├── billing-status.tsx
    ├── usage-progress.tsx
    └── subscription-form.tsx
```

### 5.2 Provider Interface

**`src/lib/payments/providers/payment-provider.ts`**

```typescript
export type PaymentMethod = 'card' | 'pix' | 'boleto';
export type SubscriptionStatus = 'active' | 'paused' | 'canceled' | 'past_due';

export interface CheckoutSession {
  id: string;
  url: string;
  expiresAt: Date;
  method: PaymentMethod;
}

export interface SubscriptionDetails {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  provider: string;
}

export interface WebhookPayload {
  type: string;         // 'order.paid', 'subscription.updated', etc
  data: Record<string, unknown>;
  timestamp: Date;
  eventId?: string;     // Para deduplicação
}

export interface PaymentProvider {
  getProviderId(): string;   // 'polar' | 'asaas' | 'stripe'
  isConfigured(): boolean;

  createCheckoutSession(params: {
    organizationId: string;
    planType: string;
    paymentMethod?: PaymentMethod;
    successUrl: string;
    returnUrl: string;
  }): Promise<CheckoutSession>;

  getSubscription(subscriptionId: string): Promise<SubscriptionDetails>;
  cancelSubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<void>;
  updateSubscriptionPlan(subscriptionId: string, newPlanId: string): Promise<void>;
  // Webhook signature verification is done in route handler using provider SDK (e.g., @polar-sh/sdk/webhooks)
}
```

### 5.3 Provider Registry

**`src/lib/payments/providers/provider-registry.ts`**

```typescript
// Singleton em módulo — importado diretamente pelos route handlers
// NÃO inicializar em layout.tsx (Server Components executam por request)
import type { PaymentProvider } from './payment-provider';

type ProviderId = 'polar' | 'asaas' | 'stripe';

class ProviderRegistry {
  private providers = new Map<ProviderId, PaymentProvider>();
  private activeId: ProviderId = 'polar';

  register(id: ProviderId, provider: PaymentProvider): void {
    this.providers.set(id, provider);
  }

  get(id?: ProviderId): PaymentProvider {
    const key = id ?? this.activeId;
    const provider = this.providers.get(key);
    if (!provider) throw new Error(`Provider '${key}' not registered`);
    if (!provider.isConfigured()) throw new Error(`Provider '${key}' not configured`);
    return provider;
  }

  setActive(id: ProviderId): void {
    if (!this.providers.has(id)) throw new Error(`Provider '${id}' not registered`);
    this.activeId = id;
  }

  getActive(): PaymentProvider { return this.get(); }
  getActiveId(): ProviderId { return this.activeId; }
}

export const providerRegistry = new ProviderRegistry();
```

### 5.4 Inicialização do Registry

**`src/lib/payments/init.ts`**

```typescript
// Importar diretamente nos route handlers de billing (não em layout.tsx)
// Ex: import '@/lib/payments/init' no topo de cada route.ts de billing
import { providerRegistry } from './providers/provider-registry';
import { PolarPaymentProvider } from './providers/polar-provider';
import { env } from '@/lib/env/env';

let initialized = false;

export function ensurePaymentProviders() {
  if (initialized) return;

  providerRegistry.register(
    'polar',
    new PolarPaymentProvider(
      env.POLAR_ACCESS_TOKEN,
      env.POLAR_WEBHOOK_SECRET
    )
  );

  const active = env.ACTIVE_PAYMENT_PROVIDER as 'polar';
  providerRegistry.setActive(active);
  initialized = true;
}
```

### 5.5 Polar Provider — métodos reais da SDK

**`src/lib/payments/providers/polar-provider.ts`**

Referências da API Polar (`@polar-sh/sdk` v0.x):

```typescript
import { Polar } from '@polar-sh/sdk';
import { env } from '@/lib/env/env';

export class PolarPaymentProvider implements PaymentProvider {
  private client: Polar;

  constructor(accessToken: string, webhookSecret: string) {
    this.client = new Polar({ accessToken });
    // Webhook secret validation is done in route handler via validateEvent from @polar-sh/sdk/webhooks
  }

  async createCheckoutSession(params) {
    // API real: checkouts.custom.create
    const checkout = await this.client.checkouts.custom.create({
      productId: this.getProductIdForPlan(params.planType),
      metadata: { organizationId: params.organizationId, plan: params.planType },
      successUrl: params.successUrl,
    });
    return {
      id: checkout.id,
      url: checkout.url,
      expiresAt: new Date(checkout.expiresAt),
      method: 'card' as const,
    };
  }

  async getSubscription(subscriptionId: string) {
    // API real: subscriptions.get({ id })
    const sub = await this.client.subscriptions.get({ id: subscriptionId });
    return {
      id: sub.id,
      customerId: sub.customerId,
      status: this.mapStatus(sub.status),
      currentPeriodStart: new Date(sub.currentPeriodStart),
      currentPeriodEnd: new Date(sub.currentPeriodEnd),
      provider: 'polar',
    };
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean) {
    // API real: subscriptions.cancel({ id }) — sempre cancela at period end no Polar
    await this.client.subscriptions.cancel({ id: subscriptionId });
  }

  async updateSubscriptionPlan(subscriptionId: string, newProductId: string) {
    await this.client.subscriptions.update({
      id: subscriptionId,
      body: { productId: newProductId },
    });
  }

  private getProductIdForPlan(planType: string): string {
    const map: Record<string, string> = {
      starter: env.POLAR_STARTER_PRODUCT_ID,
      pro: env.POLAR_PRO_PRODUCT_ID,
      agency: env.POLAR_AGENCY_PRODUCT_ID,
    };
    return map[planType] ?? (() => { throw new Error(`Unknown plan: ${planType}`); })();
  }

  private mapStatus(status: string): SubscriptionStatus {
    const map: Record<string, SubscriptionStatus> = {
      active: 'active',
      canceled: 'canceled',
      past_due: 'past_due',
      unpaid: 'past_due',
      paused: 'paused',
    };
    return map[status] ?? 'past_due';
  }
}
```

---

## 6. Database Schema

**4 novos models com prefixo `Billing`** — adicionar ao `prisma/schema.prisma`:

```prisma
// ============================================
// Billing Domain
// ============================================

model BillingSubscription {
  id             String @id @default(cuid())
  organizationId String @db.Uuid

  // Provider (agnóstico)
  provider              String  // 'polar' | 'asaas' | 'stripe'
  providerCustomerId    String  @unique  // ID do customer no provider
  providerSubscriptionId String? @unique // ID da subscription no provider

  // Plan
  planType             String   // 'starter' | 'pro' | 'agency'
  eventLimitPerMonth   Int      // 200, 500, custom
  overagePricePerEvent Decimal  @db.Decimal(6, 2)

  // Billing cycle (30 dias a partir da assinatura, não calendário)
  billingCycleStartDate DateTime
  billingCycleEndDate   DateTime
  nextResetDate         DateTime

  // Usage (reset a cada ciclo)
  eventsUsedInCurrentCycle Int @default(0)

  // Status
  status              String  @default("active") // 'active' | 'paused' | 'canceled' | 'past_due'
  canceledAtPeriodEnd Boolean @default(false)

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  canceledAt DateTime?

  eventUsages  BillingEventUsage[]
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId])
  @@index([status])
  @@index([nextResetDate])
  @@map("billing_subscriptions")
}

model BillingEventUsage {
  id             String @id @default(cuid())
  subscriptionId String

  eventType    String  // 'lead_qualified' | 'purchase_confirmed' | custom_slug
  eventCount   Int     @default(1)
  chargedAmount Decimal @db.Decimal(10, 2) // 0 se dentro do limite; overage se acima

  // billingCycle = mês de início do ciclo (ex: '2026-02' para ciclo 27/02–27/03)
  billingCycle String   // YYYY-MM
  recordedAt   DateTime @default(now())
  createdAt    DateTime @default(now())

  subscription BillingSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([subscriptionId])
  @@index([billingCycle])
  @@index([eventType])
  @@map("billing_event_usages")
}

model BillingWebhookLog {
  id String @id @default(cuid())

  provider    String  // 'polar' | 'asaas' | 'stripe'
  eventType   String  // 'order.paid' | 'subscription.updated' | etc
  payload     Json
  eventId     String? @unique  // ID do evento no provider (deduplicação)

  isProcessed     Boolean   @default(false)
  processingError String?
  processedAt     DateTime?

  retryCount  Int       @default(0)
  lastRetryAt DateTime?

  createdAt DateTime @default(now())

  @@index([isProcessed])
  @@index([provider])
  @@index([createdAt])
  @@map("billing_webhook_logs")
}

model BillingPlanTemplate {
  id String @id @default(cuid())

  slug        String  @unique  // 'starter' | 'pro' | 'agency'
  name        String
  description String?

  eventLimitPerMonth   Int
  overagePricePerEvent Decimal @db.Decimal(6, 2)
  monthlyPrice         Decimal @db.Decimal(8, 2)

  maxWhatsAppNumbers Int    @default(1)
  maxAdAccounts      Int    @default(1)
  maxTeamMembers     Int    @default(1)
  supportLevel       String @default("email")  // 'email' | 'priority' | 'dedicated'

  // Referências por provider
  polarProductId  String?
  polarPriceId    String?
  asaasProductId  String?
  stripeProductId String?
  stripePriceId   String?

  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([slug])
  @@index([isActive])
  @@map("billing_plan_templates")
}
```

**Relation a adicionar em `Organization`:**
```prisma
billingSubscription BillingSubscription?
```

**Migration:**
```bash
npx prisma migrate dev --name add_billing_domain
```

---

## 7. Seed

**`prisma/seeds/billing-seeds.ts`**

```typescript
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedBillingPlans() {
  const plans = [
    {
      slug: 'starter',
      name: 'Starter',
      description: 'Para começar a rastrear suas vendas com clareza.',
      eventLimitPerMonth: 200,
      overagePricePerEvent: new Prisma.Decimal('0.25'),
      monthlyPrice: new Prisma.Decimal('97.00'),
      maxWhatsAppNumbers: 1,
      maxAdAccounts: 1,
      maxTeamMembers: 2,
      supportLevel: 'email',
    },
    {
      slug: 'pro',
      name: 'Pro',
      description: 'Para agências e operações em escala.',
      eventLimitPerMonth: 500,
      overagePricePerEvent: new Prisma.Decimal('0.18'),
      monthlyPrice: new Prisma.Decimal('197.00'),
      maxWhatsAppNumbers: 2,
      maxAdAccounts: 2,
      maxTeamMembers: 5,
      supportLevel: 'priority',
    },
    {
      slug: 'agency',
      name: 'Agency',
      description: 'Para agências e operações complexas.',
      eventLimitPerMonth: 10000,
      overagePricePerEvent: new Prisma.Decimal('0.12'),
      monthlyPrice: new Prisma.Decimal('0.00'),  // Sob consulta
      maxWhatsAppNumbers: 10,
      maxAdAccounts: 10,
      maxTeamMembers: 999,
      supportLevel: 'dedicated',
    },
  ];

  for (const plan of plans) {
    await prisma.billingPlanTemplate.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }

  console.log('✅ Billing plans seeded');
}
```

Adicionar em `prisma/seed.ts`:
```typescript
import { seedBillingPlans } from './seeds/billing-seeds';
await seedBillingPlans();
```

---

## 8. API Endpoints

| Method | Route | Descrição |
|--------|-------|---|
| POST | `/api/v1/billing/checkout` | Cria checkout session — retorna `{ url }` |
| GET | `/api/v1/billing/subscription` | Retorna subscription ativa da org |
| GET | `/api/v1/billing/usage` | Retorna uso do ciclo atual |
| POST | `/api/v1/billing/cancel` | Cancela subscription |
| POST | `/api/v1/billing/webhooks/[provider]` | Recebe webhooks do provider |

**`POST /billing/checkout` — body:**
```typescript
{ planType: 'starter' | 'pro' | 'agency' }
// organizationId é extraído da sessão no backend (nunca do body)
```

**Webhook route** — permite múltiplos providers via param dinâmico:
- `POST /api/v1/billing/webhooks/polar`
- `POST /api/v1/billing/webhooks/asaas` (futuro)
- `POST /api/v1/billing/webhooks/stripe` (futuro)

---

## 9. Webhook Handler

**`src/services/billing/handlers/payment-webhook.handler.ts`**

Security: Signature verification is done via provider SDK (e.g., `@polar-sh/sdk/webhooks`), not manual HMAC. Timestamp validation prevents replay attacks. Rate limiting is applied via middleware. See seção 9 do PRD para detalhes.

```typescript
// Agnóstico: roteia para o provider correto via [provider] param
export async function handleWebhook(request: NextRequest, providerId: string) {
  const body = await request.text();

  // SECURITY: Use provider SDK for signature verification (e.g., Polar uses @polar-sh/sdk/webhooks)
  // Example for Polar:
  // import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'
  // import { env } from '@/lib/env/env'
  //
  // try {
  //   const event = validateEvent(body, request.headers, env.POLAR_WEBHOOK_SECRET)
  // } catch (e) {
  //   if (e instanceof WebhookVerificationError) {
  //     return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  //   }
  //   throw e
  // }

  const payload = JSON.parse(body);

  // SECURITY: Anti-replay — reject webhooks older than 5 minutes
  const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000; // 5 minutos
  const webhookAge = Date.now() - new Date(payload.created_at).getTime();
  if (webhookAge > MAX_WEBHOOK_AGE_MS) {
    return NextResponse.json({ error: 'Webhook expired' }, { status: 400 });
  }

  // Log para auditoria + deduplicação
  const existing = payload.id
    ? await prisma.billingWebhookLog.findUnique({ where: { eventId: payload.id } })
    : null;

  if (existing?.isProcessed) return NextResponse.json({ ok: true }); // Já processado

  const log = await prisma.billingWebhookLog.create({
    data: {
      provider: providerId,
      eventType: payload.type,
      payload: payload,
      eventId: payload.id,
    },
  });

  await processEvent({
    type: payload.type,
    data: payload.data ?? payload,
    timestamp: new Date(payload.created_at),
    eventId: payload.id,
  });

  await prisma.billingWebhookLog.update({
    where: { id: log.id },
    data: { isProcessed: true, processedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

async function processEvent(payload: WebhookPayload) {
  switch (payload.type) {
    case 'order.paid':
    case 'subscription.active':
      await handleSubscriptionActivated(payload);
      break;
    case 'subscription.updated':
      await handleSubscriptionUpdated(payload);
      break;
    case 'subscription.canceled':
    case 'subscription.revoked':
      await handleSubscriptionCanceled(payload);
      break;
  }
}
```

**Rate Limiting on Webhook Endpoint:**

Webhook endpoints must have rate limiting to prevent abuse. Use the existing `rateLimitMiddleware` pattern from `src/lib/utils/rate-limit.middleware.ts`:

```typescript
// In POST /api/v1/billing/webhooks/[provider]/route.ts
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware';

export async function POST(request: NextRequest, { params }: { params: { provider: string } }) {
  // Rate limit: 100 requests/hour per IP, 10 burst/minute
  const rateLimitResp = await rateLimitMiddleware(request, 'billing-webhook', {
    hourly: 100,
    burst: 10,
  });
  if (rateLimitResp) return rateLimitResp;

  // Continue with signature verification and webhook handling...
}
```

---

## 10. Reset de Ciclo (Scheduler)

**`src/services/billing/billing-cycle.scheduler.ts`**

```typescript
// Executar via cron job (ex: diariamente às 00:05 UTC)
export async function resetBillingCycles() {
  const now = new Date();

  const subs = await prisma.billingSubscription.findMany({
    where: { status: 'active', nextResetDate: { lte: now } },
  });

  for (const sub of subs) {
    const nextReset = new Date(sub.nextResetDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    await prisma.billingSubscription.update({
      where: { id: sub.id },
      data: {
        eventsUsedInCurrentCycle: 0,
        billingCycleStartDate: sub.nextResetDate,
        billingCycleEndDate: nextReset,
        nextResetDate: nextReset,
      },
    });
  }

  return subs.length;
}
```

---

## 11. Environment Variables

All environment variables are validated centrally in `src/lib/env/env.ts` using Zod schema. This ensures fail-fast on startup instead of runtime errors.

Add these billing-specific env vars to your `.env.local`:

```env
# Payment Provider (billing)
ACTIVE_PAYMENT_PROVIDER=polar   # polar | asaas | stripe (default: polar)

# Polar — Get these from https://polar.sh/dashboard
POLAR_ACCESS_TOKEN=org_pat_xxxxx
POLAR_WEBHOOK_SECRET=whsec_xxxxx
POLAR_STARTER_PRODUCT_ID=prod_xxxxx
POLAR_PRO_PRODUCT_ID=prod_xxxxx
POLAR_AGENCY_PRODUCT_ID=prod_xxxxx

# ASAAS (Phase 2)
# ASAAS_API_KEY=xxxxx
# ASAAS_WEBHOOK_SECRET=xxxxx

# Stripe (Phase 3)
# STRIPE_SECRET_KEY=sk_xxxxx
# STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**See**: `src/lib/env/env.ts` for the complete schema and validation rules.

---

## 12. Dependências

```bash
npm install @polar-sh/sdk @polar-sh/nextjs
```

**Nota**: `@polar-sh/nextjs` oferece um handler `Checkout` pronto, simplificando muito a rota de pagamento. Ver PRD_POLAR_INTEGRATION.md para detalhes de uso.

---

## 13. Fases de Implementação

### Phase 1: Database (1 dia)
- [ ] Adicionar 4 models ao `prisma/schema.prisma`
- [ ] Adicionar relation `billingSubscription` em `Organization`
- [ ] `npx prisma migrate dev --name add_billing_domain`
- [ ] Implementar e rodar seed de planos
- [ ] `npx tsc --noEmit` para validar tipos

### Phase 2: Provider Abstraction (1–2 dias)
- [ ] `payment-provider.ts` — interface + tipos
- [ ] `provider-registry.ts` — singleton
- [ ] `polar-provider.ts` — implementação real (validar métodos vs SDK atual)
- [ ] `init.ts` — bootstrap com guard `initialized`
- [ ] `metering-constants.ts` — limites e preços por plano

### Phase 3: Services (2 dias)
- [ ] `billing-subscription.service.ts` — CRUD, checkout, cancelamento
- [ ] `billing-metering.service.ts` — recordEvent, checkLimit, overage
- [ ] `billing-cycle.scheduler.ts` — reset de ciclo
- [ ] Testes unitários para services

### Phase 4: Routes & Webhook (1–2 dias)
- [ ] `POST /billing/checkout`
- [ ] `GET /billing/subscription`
- [ ] `GET /billing/usage`
- [ ] `POST /billing/cancel`
- [ ] `POST /billing/webhooks/[provider]`
- [ ] Webhook handler com deduplicação e retry

### Phase 5: Frontend
Ver `PRD_BILLING_FRONTEND.md` — implementado após Phase 4 completa.

### Phase 6: Integração e Testes (1 dia)
- [ ] Integrar `billingMeteringService.recordEvent` em `whatsapp-chat.service.ts` (lead)
- [ ] Integrar em `sale.service.ts` (purchase)
- [ ] Testar checkout em sandbox Polar
- [ ] Testar webhook signature verification
- [ ] E2E: checkout → subscription criada → evento registrado

---

## 14. Testing Strategy

- **Unit**: `BillingSubscriptionService`, `BillingMeteringService`, `PolarPaymentProvider`
- **Integration**: Checkout flow completo (sandbox), webhook simulation
- **Manual**: checklist de flows 1–4 da seção 4

---

## 15. Success Criteria

- [ ] Primeiro pagamento processado com sucesso (sandbox)
- [ ] Webhook `order.paid` cria `BillingSubscription` corretamente
- [ ] Contador de eventos incrementa ao criar lead/purchase
- [ ] Cancelamento atualiza status corretamente
- [ ] 0 breaking changes no código existente
- [ ] Provider abstraction funcional: trocar provider muda apenas 1 env var
- [ ] Frontend: ver critérios em `PRD_BILLING_FRONTEND.md`

---

## 16. Future Work

- **Phase 2**: ASAAS para PIX/Boleto — criar `AsaasPaymentProvider`, registrar em `init.ts`, zero mudanças em services/routes
- **Phase 3**: Stripe
- Upgrade/downgrade de planos com proration
- Invoice PDF download
- Dunning (retry de pagamentos falhados)
- Multi-provider simultâneo (PIX via ASAAS + cartão via Polar)

---

## 17. Alternativas de Pagamento

### Se Polar não suportar Brasil

Se a Polar não ativar Brasil automaticamente ou não tiver planos em BRL:

**Opção 1: Usar USD com Polar** (mais simples agora)
- Configure os preços em USD: Starter $19.99, Pro $39.99
- Usuários pagam em USD via cartão internacional
- Webhook handler continua igual
- Quando Brasil for ativado, apenas ajuste os preços

**Opção 2: ASAAS + Polar (Phase 2)**
- Polar: cartão internacional (USD)
- ASAAS: PIX + Boleto (BRL)
- Provider abstraction permite usar ambos simultaneamente
- Implementar `AsaasPaymentProvider` que herda de `PaymentProvider`
- No checkout, oferecer opção de método de pagamento

**Opção 3: Contato com suporte Polar**
- Solicitar ativação de Brasil e BRL
- Documentação: https://polar.sh/docs/

A arquitetura atual suporta todas as opções sem mudanças em services/routes — apenas configure a env var `ACTIVE_PAYMENT_PROVIDER`.
