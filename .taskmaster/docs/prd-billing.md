<context>
# Overview

Sistema de billing desacoplado para o Whatrack SaaS, permitindo cobrancas recorrentes via checkout transparente. A arquitetura suporta multiplos provedores de pagamento (Asaas para BRL, Stripe para USD/EUR no futuro) atraves de um padrao Provider/Adapter.

O sistema gerencia planos, assinaturas, faturas e pagamentos de forma agnositca ao gateway, permitindo troca de provedor sem impacto nas entidades de dominio.

## Problema que resolve
- Monetizacao do SaaS com cobranca recorrente automatica
- Controle de acesso a features baseado em planos
- Limites de uso (Meta Ads profiles, WhatsApp instances, membros, etc.)
- Experiencia de checkout sem redirecionamento (checkout transparente)
- Flexibilidade para operar em multiplas moedas/paises no futuro

## Usuarios
- **Owners de Organization**: Gerenciam assinatura, visualizam faturas, atualizam pagamento
- **Sistema**: Processa webhooks, aplica limites, suspende acesso por inadimplencia

## Valor
- Receita recorrente previsivel
- Reducao de churn com retry automatico de cobranca
- Escalabilidade internacional com multiplos gateways

# Core Features

## 1. Gestao de Planos
- Planos com diferentes limites (Starter, Pro, Business)
- Precos por intervalo (mensal/anual) e moeda
- Periodo de trial configuravel
- Features como flags JSON para flexibilidade

## 2. Checkout Transparente
- Formulario de pagamento embedded na aplicacao
- Suporte a cartao de credito, PIX e boleto (Asaas)
- Tokenizacao de cartao para cobrancas futuras (one-click)
- Sem redirecionamento para pagina externa

## 3. Assinaturas Recorrentes
- Cobranca automatica no ciclo configurado
- Retry automatico em caso de falha (3 tentativas)
- Gestao de status (active, past_due, canceled, paused)
- Upgrade/downgrade de plano com pro-rata

## 4. Gestao de Pagamentos
- Historico completo de transacoes
- Suporte a reembolso parcial/total
- Comprovantes e faturas em PDF
- Notificacoes por email de cobranca/falha

## 5. Webhooks e Sincronizacao
- Processamento assincrono de eventos do gateway
- Idempotencia para evitar duplicacao
- Auditoria completa de eventos recebidos
- Atualizacao automatica de status

## 6. Aplicacao de Limites
- Verificacao de limites antes de criar recursos
- Bloqueio suave (aviso) vs bloqueio duro (impede acao)
- Degradacao gradual por inadimplencia

# User Experience

## Personas

### Owner/Admin da Organization
- Precisa assinar um plano para usar features premium
- Quer visualizar faturas e historico de pagamentos
- Precisa atualizar metodo de pagamento quando cartao expira
- Quer fazer upgrade quando precisar de mais recursos

### Usuario comum
- Ve indicadores de limite (ex: "2/5 contas Meta Ads")
- Recebe feedback quando atinge limite do plano
- Nao tem acesso a gestao de billing

## Key User Flows

### Flow 1: Primeira Assinatura
1. Usuario acessa /settings/billing
2. Ve comparativo de planos com precos e features
3. Seleciona plano desejado
4. Preenche dados de pagamento (cartao/PIX/boleto)
5. Confirma assinatura
6. Sistema cria customer no Asaas + subscription
7. Primeira cobranca e processada
8. Usuario tem acesso imediato as features do plano

### Flow 2: Upgrade de Plano
1. Usuario acessa /settings/billing
2. Clica em "Mudar plano"
3. Seleciona novo plano
4. Ve calculo de pro-rata (credito do plano atual)
5. Confirma mudanca
6. Sistema atualiza subscription no Asaas
7. Novos limites aplicados imediatamente

### Flow 3: Falha de Pagamento
1. Webhook recebe evento de falha
2. Sistema marca subscription como past_due
3. Email enviado ao owner com link para atualizar pagamento
4. Usuario acessa /settings/billing
5. Atualiza metodo de pagamento
6. Sistema tenta nova cobranca
7. Se sucesso, subscription volta para active

### Flow 4: Cancelamento
1. Usuario acessa /settings/billing
2. Clica em "Cancelar assinatura"
3. Ve modal de confirmacao com data de fim do acesso
4. Confirma cancelamento
5. Sistema cancela no Asaas (acesso ate fim do periodo pago)
6. Apos periodo, organization volta para plano free/limitado

## UI/UX Considerations

### Pagina de Billing (/settings/billing)
- Card com plano atual e status
- Barra de progresso dos limites usados
- Botoes: Mudar plano, Atualizar pagamento, Cancelar
- Tabela de historico de faturas com download PDF

### Pagina de Planos (/pricing ou modal)
- Cards comparativos lado a lado
- Destaque no plano recomendado
- Toggle mensal/anual com desconto visivel
- CTA claro em cada plano

### Checkout Modal
- Formulario limpo com validacao em tempo real
- Tabs para cartao/PIX/boleto
- Preview do valor e proxima cobranca
- Loading state durante processamento

### Indicadores de Limite (global)
- Badge no menu lateral mostrando uso
- Toast quando usuario atinge 80% do limite
- Modal de upgrade quando atinge 100%
</context>

<PRD>
# Technical Architecture

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  /settings/billing  │  /pricing  │  CheckoutModal Component │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  /api/billing/*  │  /api/webhooks/asaas  │  /api/plans      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BillingService Layer                      │
├─────────────────────────────────────────────────────────────┤
│  BillingService (orchestrator)                               │
│    ├── PlanService                                           │
│    ├── SubscriptionService                                   │
│    ├── PaymentService                                        │
│    └── LimitService                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Provider Adapters                          │
├──────────────────┬──────────────────┬───────────────────────┤
│  AsaasProvider   │  StripeProvider  │  (future providers)   │
│  (implements     │  (implements     │                       │
│   IBillingGateway)│   IBillingGateway)│                      │
└──────────────────┴──────────────────┴───────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    External APIs                             │
├──────────────────┬──────────────────────────────────────────┤
│  Asaas API       │  Stripe API (future)                     │
│  (sandbox/prod)  │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

## Data Models (Prisma Schema)

### Enums

```prisma
enum PlanInterval {
  monthly
  yearly
}

enum SubscriptionStatus {
  incomplete       // Aguardando primeiro pagamento
  trialing         // Em periodo de trial
  active           // Ativo e pago
  past_due         // Pagamento atrasado, ainda ativo
  unpaid           // Multiplas falhas, acesso suspenso
  canceled         // Cancelado
  paused           // Pausado pelo usuario
}

enum PaymentStatus {
  pending
  processing
  succeeded
  failed
  refunded
  canceled
}

enum PaymentMethod {
  credit_card
  debit_card
  pix
  boleto
  bank_transfer
  wallet
}

enum BillingProvider {
  asaas
  stripe
  mercadopago
  manual
}
```

### Core Models

```prisma
model Plan {
  id                   String   @id @default(cuid())
  name                 String
  slug                 String   @unique
  description          String?

  priceMonthlyCents    Int
  priceYearlyCents     Int?
  currency             String   @default("BRL")

  // Limites
  maxMetaProfiles      Int      @default(1)
  maxMetaAdAccounts    Int      @default(2)
  maxWhatsappInstances Int      @default(1)
  maxMembers           Int      @default(3)
  maxLeadsPerMonth     Int?
  maxMessagesPerMonth  Int?

  features             Json?

  active               Boolean  @default(true)
  isDefault            Boolean  @default(false)
  sortOrder            Int      @default(0)
  trialDays            Int      @default(0)

  createdAt            DateTime @default(now())
  updatedAt            DateTime @default(now()) @updatedAt

  subscriptions        Subscription[]
  planPrices           PlanPrice[]

  @@map("plans")
}

model PlanPrice {
  id              String          @id @default(cuid())
  planId          String
  plan            Plan            @relation(fields: [planId], references: [id], onDelete: Cascade)

  provider        BillingProvider
  currency        String
  interval        PlanInterval
  amountCents     Int
  externalPriceId String?
  active          Boolean         @default(true)

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @default(now()) @updatedAt

  @@unique([planId, provider, currency, interval])
  @@map("plan_prices")
}

model BillingCustomer {
  id             String       @id @default(cuid())
  organizationId String       @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  email          String
  name           String?
  taxId          String?
  phone          String?

  addressLine1   String?
  addressLine2   String?
  city           String?
  state          String?
  postalCode     String?
  country        String       @default("BR")

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @default(now()) @updatedAt

  externalIds    BillingCustomerExternal[]
  paymentMethods PaymentMethodStored[]
  subscription   Subscription?

  @@map("billing_customers")
}

model BillingCustomerExternal {
  id                String          @id @default(cuid())
  billingCustomerId String
  billingCustomer   BillingCustomer @relation(fields: [billingCustomerId], references: [id], onDelete: Cascade)

  provider          BillingProvider
  externalId        String
  metadata          Json?

  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @default(now()) @updatedAt

  @@unique([billingCustomerId, provider])
  @@unique([provider, externalId])
  @@map("billing_customer_externals")
}

model PaymentMethodStored {
  id                String          @id @default(cuid())
  billingCustomerId String
  billingCustomer   BillingCustomer @relation(fields: [billingCustomerId], references: [id], onDelete: Cascade)

  provider          BillingProvider
  type              PaymentMethod

  cardBrand         String?
  cardLast4         String?
  cardExpMonth      Int?
  cardExpYear       Int?

  externalId        String
  isDefault         Boolean         @default(false)

  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @default(now()) @updatedAt

  @@unique([provider, externalId])
  @@index([billingCustomerId])
  @@map("payment_methods_stored")
}

model Subscription {
  id                String             @id @default(cuid())
  billingCustomerId String             @unique
  billingCustomer   BillingCustomer    @relation(fields: [billingCustomerId], references: [id], onDelete: Cascade)

  planId            String
  plan              Plan               @relation(fields: [planId], references: [id])

  status            SubscriptionStatus @default(incomplete)
  interval          PlanInterval       @default(monthly)

  provider          BillingProvider
  externalId        String?

  currency          String             @default("BRL")
  amountCents       Int

  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  trialStart         DateTime?
  trialEnd           DateTime?
  canceledAt         DateTime?
  cancelReason       String?
  pausedAt           DateTime?

  metadata          Json?

  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @default(now()) @updatedAt

  payments          Payment[]
  invoices          Invoice[]

  @@index([status])
  @@index([provider])
  @@map("subscriptions")
}

model Invoice {
  id             String           @id @default(cuid())
  subscriptionId String?
  subscription   Subscription?    @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)

  provider       BillingProvider
  externalId     String?

  currency       String
  subtotalCents  Int
  discountCents  Int              @default(0)
  taxCents       Int              @default(0)
  totalCents     Int

  status         PaymentStatus    @default(pending)
  dueDate        DateTime?
  paidAt         DateTime?

  hostedUrl      String?
  pdfUrl         String?

  periodStart    DateTime?
  periodEnd      DateTime?

  metadata       Json?

  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @default(now()) @updatedAt

  payments       Payment[]
  invoiceItems   InvoiceItem[]

  @@unique([provider, externalId])
  @@index([subscriptionId])
  @@map("invoices")
}

model InvoiceItem {
  id          String   @id @default(cuid())
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  description String
  quantity    Int      @default(1)
  unitCents   Int
  totalCents  Int

  createdAt   DateTime @default(now())

  @@map("invoice_items")
}

model Payment {
  id             String           @id @default(cuid())
  subscriptionId String?
  subscription   Subscription?    @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)
  invoiceId      String?
  invoice        Invoice?         @relation(fields: [invoiceId], references: [id], onDelete: SetNull)

  provider       BillingProvider
  externalId     String?

  currency       String
  amountCents    Int
  feeCents       Int?
  netCents       Int?

  status         PaymentStatus    @default(pending)
  method         PaymentMethod?

  pixQrCode      String?          @db.Text
  pixCopyPaste   String?          @db.Text
  pixExpiresAt   DateTime?
  boletoUrl      String?
  boletoBarcode  String?
  boletoDueDate  DateTime?

  cardBrand      String?
  cardLast4      String?

  paidAt         DateTime?
  refundedAt     DateTime?
  failedAt       DateTime?
  failureReason  String?

  webhookPayload Json?

  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @default(now()) @updatedAt

  @@unique([provider, externalId])
  @@index([subscriptionId])
  @@index([invoiceId])
  @@index([status])
  @@map("payments")
}

model WebhookEvent {
  id          String          @id @default(cuid())
  provider    BillingProvider
  externalId  String
  eventType   String

  payload     Json
  processed   Boolean         @default(false)
  processedAt DateTime?
  error       String?

  createdAt   DateTime        @default(now())

  @@unique([provider, externalId])
  @@index([provider, eventType])
  @@index([processed])
  @@map("webhook_events")
}
```

### Organization Update

```prisma
model Organization {
  // ... campos existentes ...

  // Nova relacao
  billingCustomer BillingCustomer?

  // ... resto ...
}
```

## APIs and Integrations

### Internal API Routes

```
POST   /api/billing/checkout          # Criar sessao de checkout
POST   /api/billing/subscription      # Criar/atualizar assinatura
DELETE /api/billing/subscription      # Cancelar assinatura
POST   /api/billing/subscription/pause   # Pausar
POST   /api/billing/subscription/resume  # Retomar

GET    /api/billing/customer          # Dados do customer
PUT    /api/billing/customer          # Atualizar dados

GET    /api/billing/invoices          # Listar faturas
GET    /api/billing/invoices/[id]     # Detalhe da fatura
GET    /api/billing/invoices/[id]/pdf # Download PDF

GET    /api/billing/payments          # Historico de pagamentos

POST   /api/billing/payment-method    # Adicionar metodo
DELETE /api/billing/payment-method/[id] # Remover metodo
POST   /api/billing/payment-method/[id]/default # Definir padrao

GET    /api/plans                     # Listar planos disponiveis

POST   /api/webhooks/asaas            # Webhook Asaas
POST   /api/webhooks/stripe           # Webhook Stripe (futuro)
```

### Asaas API Integration

```typescript
// Endpoints utilizados
POST /customers                    # Criar cliente
PUT  /customers/{id}              # Atualizar cliente

POST /subscriptions               # Criar assinatura
PUT  /subscriptions/{id}          # Atualizar
DELETE /subscriptions/{id}        # Cancelar

POST /payments                    # Cobranca avulsa
GET  /payments/{id}               # Consultar pagamento
POST /payments/{id}/refund        # Estornar

POST /creditCard/tokenize         # Tokenizar cartao
```

### Webhook Events (Asaas)

```
PAYMENT_CREATED           # Cobranca criada
PAYMENT_AWAITING_RISK_ANALYSIS
PAYMENT_APPROVED_BY_RISK_ANALYSIS
PAYMENT_REPROVED_BY_RISK_ANALYSIS
PAYMENT_UPDATED           # Cobranca atualizada
PAYMENT_CONFIRMED         # Pagamento confirmado
PAYMENT_RECEIVED          # Pagamento recebido
PAYMENT_OVERDUE           # Cobranca vencida
PAYMENT_DELETED           # Cobranca removida
PAYMENT_RESTORED          # Cobranca restaurada
PAYMENT_REFUNDED          # Pagamento estornado
PAYMENT_RECEIVED_IN_CASH_UNDONE
PAYMENT_CHARGEBACK_REQUESTED
PAYMENT_CHARGEBACK_DISPUTE
PAYMENT_AWAITING_CHARGEBACK_REVERSAL
PAYMENT_DUNNING_RECEIVED
PAYMENT_DUNNING_REQUESTED
PAYMENT_BANK_SLIP_VIEWED
PAYMENT_CHECKOUT_VIEWED
```

## Infrastructure Requirements

### Environment Variables

```env
# Asaas
ASAAS_API_KEY=xxx
ASAAS_ENVIRONMENT=sandbox|production
ASAAS_WEBHOOK_TOKEN=xxx

# Stripe (futuro)
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx
STRIPE_PUBLISHABLE_KEY=xxx

# App
BILLING_DEFAULT_PROVIDER=asaas
BILLING_WEBHOOK_BASE_URL=https://whatrack.com/api/webhooks
```

### Security

- Tokens de API em variaves de ambiente
- Webhook signature validation
- Dados sensiveis (tokens de cartao) nunca armazenados localmente
- Rate limiting nos endpoints de checkout
- CSRF protection nos forms de pagamento

# Development Roadmap

## Phase 1: Foundation (MVP)

### 1.1 Database Schema
- Criar migrations com todos os models de billing
- Seed de planos iniciais (Free, Starter, Pro)
- Relacao Organization -> BillingCustomer

### 1.2 Provider Interface
- Definir interface IBillingProvider
- Implementar AsaasProvider com metodos basicos:
  - createCustomer
  - createSubscription
  - cancelSubscription
  - getPayment

### 1.3 Checkout Flow Basico
- Pagina /settings/billing com plano atual
- Modal de checkout com form de cartao
- Integracao com Asaas para tokenizacao
- Criacao de subscription apos pagamento

### 1.4 Webhook Handler
- Endpoint POST /api/webhooks/asaas
- Validacao de assinatura
- Processamento de PAYMENT_CONFIRMED
- Atualizacao de status da subscription

## Phase 2: Complete Billing

### 2.1 Gestao de Pagamentos
- Listagem de invoices em /settings/billing
- Download de PDF de faturas
- Historico de payments

### 2.2 Metodos de Pagamento Alternativos
- PIX com QR Code e copy/paste
- Boleto bancario
- Listagem e gestao de metodos salvos

### 2.3 Subscription Management
- Upgrade/downgrade de plano
- Calculo de pro-rata
- Cancelamento com data de termino
- Reativacao de subscription cancelada

### 2.4 Retry e Dunning
- Processamento de PAYMENT_OVERDUE
- Email automatico para owner
- Fluxo de atualizacao de cartao
- Degradacao gradual de acesso

## Phase 3: Limit Enforcement

### 3.1 LimitService
- Hook useOrganizationLimits
- Verificacao em tempo real de limites
- Cache de limites para performance

### 3.2 UI de Limites
- Barras de progresso no dashboard
- Toasts de aviso em 80%
- Modal de upgrade em 100%
- Bloqueio de acoes quando no limite

### 3.3 Integracao com Features
- Meta Ads: verificar maxMetaProfiles, maxMetaAdAccounts
- WhatsApp: verificar maxWhatsappInstances
- Team: verificar maxMembers

## Phase 4: Polish e Extras

### 4.1 Trial Period
- Fluxo de trial de 14 dias
- Email de fim de trial
- Conversao automatica para pago

### 4.2 Cupons e Descontos
- Model Coupon
- Aplicacao no checkout
- Validacao de uso unico/multiplo

### 4.3 Metricas e Analytics
- Dashboard admin com MRR, churn, etc
- Integracao com analytics (Mixpanel/Amplitude)

### 4.4 Multi-provider (Stripe)
- StripeProvider implementation
- Selecao automatica por moeda
- Migracao de customers entre providers

# Logical Dependency Chain

```
1. Schema & Migrations
   └── Base para tudo

2. Provider Interface + AsaasProvider
   └── Necessario para qualquer operacao de billing

3. Checkout Flow (cartao apenas)
   └── Permite primeira monetizacao
   └── Depende de: 1, 2

4. Webhook Handler
   └── Confirma pagamentos automaticamente
   └── Depende de: 1, 2, 3

5. Pagina de Billing basica
   └── Usuario consegue ver status
   └── Depende de: 1, 3

   --- MVP COMPLETO ---

6. PIX e Boleto
   └── Aumenta conversao
   └── Depende de: 3, 4

7. Invoice Management
   └── Compliance e transparencia
   └── Depende de: 4, 5

8. Upgrade/Downgrade
   └── Flexibilidade de planos
   └── Depende de: 3, 4, 5

9. LimitService
   └── Enforcement real dos planos
   └── Depende de: 1, 5

10. UI de Limites
    └── UX de upsell
    └── Depende de: 9

11. Retry/Dunning
    └── Reducao de churn involuntario
    └── Depende de: 4, 7

12. Trial Period
    └── Aquisicao de usuarios
    └── Depende de: 3, 4, 9

13. Stripe Provider
    └── Expansao internacional
    └── Depende de: 2 (interface ja pronta)
```

# Risks and Mitigations

## Technical Challenges

### Risk: Complexidade do Asaas API
- **Mitigacao**: Comecar com subset minimo (customer, subscription, payment)
- **Mitigacao**: Usar SDK oficial quando disponivel
- **Mitigacao**: Testes extensivos em sandbox antes de producao

### Risk: Webhook reliability
- **Mitigacao**: Idempotencia em todos os handlers
- **Mitigacao**: Tabela WebhookEvent para auditoria e replay
- **Mitigacao**: Retry manual via admin se necessario

### Risk: Race conditions em pagamentos
- **Mitigacao**: Locks otimistas com versao
- **Mitigacao**: Transacoes atomicas no banco
- **Mitigacao**: Status machine bem definida

### Risk: Seguranca de dados de pagamento
- **Mitigacao**: Nunca armazenar dados de cartao
- **Mitigacao**: Usar tokenizacao do Asaas
- **Mitigacao**: HTTPS em todos os endpoints
- **Mitigacao**: Webhook signature validation

## MVP Definition

O MVP permite:
1. Criar planos no banco de dados
2. Usuario fazer checkout com cartao de credito
3. Sistema confirmar pagamento via webhook
4. Usuario ver status da assinatura
5. Sistema aplicar limites basicos

NAO inclui no MVP:
- PIX/Boleto (Phase 2)
- Upgrade/downgrade (Phase 2)
- Trial period (Phase 4)
- Cupons (Phase 4)
- Stripe (Phase 4)

## Resource Constraints

### Desenvolvimento
- Priorizar checkout funcional sobre features secundarias
- Usar componentes UI existentes (shadcn)
- Evitar over-engineering na interface de providers

### Infraestrutura
- Webhook endpoint deve ter alta disponibilidade
- Considerar queue para processamento assincrono (futuro)

# Appendix

## Asaas API Reference
- Documentacao: https://docs.asaas.com/
- Sandbox: https://sandbox.asaas.com/
- SDK Node: https://github.com/asaas/asaas-node (se disponivel)

## Planos Iniciais Sugeridos

| Plano | Preco/mes | Meta Profiles | Ad Accounts | Members | WhatsApp |
|-------|-----------|---------------|-------------|---------|----------|
| Free | R$ 0 | 0 | 0 | 1 | 1 |
| Starter | R$ 97 | 1 | 2 | 3 | 1 |
| Pro | R$ 197 | 2 | 5 | 10 | 3 |
| Business | R$ 497 | 5 | 15 | 25 | 10 |

## Webhook Payload Examples

### PAYMENT_CONFIRMED
```json
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_xxx",
    "customer": "cus_xxx",
    "subscription": "sub_xxx",
    "value": 97.00,
    "netValue": 94.09,
    "billingType": "CREDIT_CARD",
    "status": "CONFIRMED",
    "confirmedDate": "2025-01-15"
  }
}
```

## Security Checklist

- [ ] Webhook signature validation implementada
- [ ] Tokens em environment variables
- [ ] HTTPS em todos os endpoints
- [ ] Rate limiting em checkout
- [ ] Logs sem dados sensiveis
- [ ] Idempotency keys em mutacoes
</PRD>
