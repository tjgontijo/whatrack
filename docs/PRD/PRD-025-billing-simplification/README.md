# PRD-025: Billing Simplification — MVP Asaas com Checkout Transparente

**Status:** Draft  
**Data:** 2026-04-15  
**Versão:** 2.1

---

## O Que Este PRD Define

Este pacote redefine o `PRD-025` para um MVP menor e mais direto, reaproveitando o modelo de billing com Asaas que já foi implementado no `kadernim`.

O objetivo deixa de ser um redesenho comercial completo com múltiplos tiers, portal e lógica avançada de assinatura. O foco passa a ser:

- Asaas como único gateway
- checkout transparente
- cartão de crédito como modalidade principal
- pagamento por `PIX_AUTOMATIC`, `PIX` e `cartão de crédito`
- ativação local por webhook
- modelo de dados simples no padrão `plan -> offer -> subscription -> invoice`

---

## Resumo Executivo

### Objetivo

- substituir o stack atual acoplado ao Stripe por um fluxo menor e previsível
- colocar no ar um checkout transparente com cartão de crédito como caminho principal
- manter `PIX Automático` no mensal como opção secundária
- manter `PIX` manual no anual como opção secundária
- persistir o estado local de assinatura e cobrança com idempotência
- reduzir o MVP ao que já existe validado no `kadernim`

### Problema Atual

- o billing atual está preso a `Stripe`, `subscription items`, portal e add-ons
- o checkout atual assume redirecionamento e abstração por provider
- o PRD anterior abria escopo demais para o primeiro go-live com Asaas

### Novo Escopo do MVP

**Entra:**

- `Asaas` como gateway único
- checkout transparente com `PIX_AUTOMATIC`, `PIX` e `CREDIT_CARD`
- um produto self-serve com catálogo operacional simples:
  - `monthly`
  - `annual`
- ofertas por método de pagamento:
  - `monthly_credit_card`
  - `monthly_pix_automatic`
  - `annual_credit_card`
  - `annual_pix`
- persistência local com:
  - `BillingPlan`
  - `BillingOffer`
  - `BillingSubscription`
  - `BillingInvoice`
  - `BillingAuditLog`
- webhook público com validação por token e idempotência
- tela de checkout, tela de autorização/status PIX Automático, tela de QR Code PIX anual e tela de status/sucesso

**Fica fora do MVP:**

- boleto
- split
- portal de billing
- catálogo `Starter / Growth / Pro / Enterprise`
- quotas rígidas por projeto/WhatsApp/Meta Ads
- upgrade, downgrade e proration self-serve
- add-ons automáticos
- `PIX` manual no plano mensal
- coexistência com Stripe

### Decisão de Produto

Para este MVP, billing não resolve o modelo final de monetização do Whatrack. Ele resolve apenas o primeiro fluxo confiável de cobrança e ativação.

Cartão de crédito é a modalidade foco do produto:

- deve aparecer como opção padrão no checkout
- deve ser o caminho principal de comunicação, UX e testes
- deve sustentar o primeiro go-live com prioridade

Projetos isolados continuam sendo parte do produto, mas as regras finas de limite e empacotamento comercial ficam para uma fase posterior.

---

## Estrutura do Pacote

```text
PRD-025-billing-simplification/
|-- README.md
|-- CONTEXT.md
|-- DIAGNOSTIC.md
|-- TASKS.md
`-- MIGRATION.md
```

---

## Modelo de Referência Trazido do Kadernim

O padrão a ser reaproveitado é:

1. frontend coleta dados do checkout dentro do Whatrack
2. backend resolve/cria customer no Asaas
3. backend cria cobrança no Asaas
4. backend persiste `subscription` e `invoice` locais
5. frontend recebe dados imediatos do checkout
6. webhook do Asaas confirma o pagamento e ativa a assinatura

### Fluxo PIX Automático (Mensal)

```text
1. Usuário escolhe plano mensal + PIX Automático
2. POST /api/v1/billing/checkout
3. Backend cria autorização PIX Automático no Asaas
4. Retorna dados de autorização + statusToken
5. Frontend acompanha o status da autorização
6. Webhook de autorização/confirmação ativa subscription
```

### Fluxo PIX (Anual)

```text
1. Usuário escolhe plano anual + PIX
2. POST /api/v1/billing/checkout
3. Backend cria payment PIX no Asaas
4. Backend busca QR Code no Asaas
5. Retorna payload do PIX + imagem + expirationDate
6. Webhook PAYMENT_RECEIVED/PAYMENT_CONFIRMED ativa subscription
```

### Fluxo Cartão de Crédito

```text
1. Usuário escolhe plano + cartão
2. Checkout transparente coleta dados do cartão no app
3. POST /api/v1/billing/checkout
4. Backend cria cobrança no Asaas
5. Retorna status inicial da cobrança
6. Webhook confirma e ativa subscription
```

Este é o fluxo principal do MVP e deve receber prioridade em UX, QA e rollout.

---

## Modelo de Dados Proposto

```prisma
model BillingPlan {
  id         String   @id @default(cuid())
  code       String   @unique // monthly | annual
  name       String
  cycle      String   // MONTHLY | YEARLY
  accessDays Int
  isActive   Boolean  @default(true)
  sortOrder  Int      @default(0)
  offers     BillingOffer[]
}

model BillingOffer {
  id              String   @id @default(cuid())
  code            String   @unique
  planId          String
  paymentMethod   String   // PIX | PIX_AUTOMATIC | CREDIT_CARD
  amount          Decimal  @db.Decimal(10, 2)
  currency        String   @default("BRL")
  maxInstallments Int      @default(1)
  installmentRate Decimal? @db.Decimal(6, 4)
  isActive        Boolean  @default(true)
  validFrom       DateTime @default(now())
  validUntil      DateTime?

  plan            BillingPlan @relation(fields: [planId], references: [id])
  subscriptions   BillingSubscription[]
  invoices        BillingInvoice[]
}

model BillingSubscription {
  id              String   @id @default(cuid())
  organizationId  String   @unique @db.Uuid
  offerId         String?
  asaasId         String?  @unique
  asaasCustomerId String?
  pixAutomaticAuthId String? @unique
  status          String   @default("INACTIVE")
  paymentMethod   String?
  isActive        Boolean  @default(false)
  purchaseDate    DateTime @default(now())
  expiresAt       DateTime?
  canceledAt      DateTime?
  failureReason   String?
  failureCount    Int      @default(0)
  lastFailureAt   DateTime?
  nextRetryAt     DateTime?

  organization    Organization @relation(fields: [organizationId], references: [id])
  offer           BillingOffer? @relation(fields: [offerId], references: [id])
  invoices        BillingInvoice[]
}

model BillingInvoice {
  id                String   @id @default(cuid())
  organizationId    String   @db.Uuid
  subscriptionId    String?
  offerId           String?
  asaasId           String   @unique
  status            String   @default("PENDING")
  paymentMethod     String
  value             Decimal  @db.Decimal(10, 2)
  netValue          Decimal? @db.Decimal(10, 2)
  description       String?
  billingType       String
  dueDate           DateTime
  paidAt            DateTime?
  refundedAt        DateTime?
  invoiceUrl        String?
  pixQrCodePayload  String?
  pixQrCodeImage    String?
  pixExpirationDate DateTime?

  organization      Organization @relation(fields: [organizationId], references: [id])
  subscription      BillingSubscription? @relation(fields: [subscriptionId], references: [id])
  offer             BillingOffer? @relation(fields: [offerId], references: [id])
}

model BillingAuditLog {
  id           String   @id @default(cuid())
  organizationId String? @db.Uuid
  action       String
  entity       String
  entityId     String
  asaasEventId String?  @unique
  asaasPaymentId String?
  previousState Json?
  newState     Json?
  metadata     Json?
  createdAt    DateTime @default(now())
}
```

---

## Áreas Principais

- `prisma/schema.prisma` — remodelagem do domínio de billing
- `src/services/billing/asaas-config.service.ts`
- `src/services/billing/asaas-client.ts`
- `src/services/billing/customer.service.ts`
- `src/services/billing/catalog.service.ts`
- `src/services/billing/payment.service.ts`
- `src/services/billing/checkout.service.ts`
- `src/services/billing/webhook.handler.ts`
- `src/app/api/v1/billing/checkout/route.ts`
- `src/app/api/v1/billing/webhook/route.ts`
- `src/components/dashboard/billing/`

Configuração de runtime deve seguir o padrão do `kadernim`, via variáveis de ambiente:

- `ASAAS_BASE_URL`
- `ASAAS_API_KEY`
- `WALLET_ASAAS_ID`
- `ASAAS_WEBHOOK_TOKEN`
- `NEXT_PUBLIC_APP_URL`

---

## Dependências

1. conta Asaas com ambiente sandbox e produção
2. chaves configuradas via `.env`, no mesmo padrão do `kadernim`
3. `ASAAS_API_KEY` e `ASAAS_BASE_URL` configurados por ambiente
4. `WALLET_ASAAS_ID` configurado no `.env`
5. `ASAAS_WEBHOOK_TOKEN` configurado no Asaas e no `.env`
6. habilitação do fluxo de `PIX Automático` no Asaas
7. revisão do fluxo de checkout transparente de cartão antes do go-live
8. limpeza do código legado de Stripe no Whatrack

---

## Como Ler Este Pacote

1. `CONTEXT.md` — escopo funcional e regras do MVP
2. `DIAGNOSTIC.md` — decisões técnicas, riscos e mitigação
3. `TASKS.md` — backlog de implementação enxuto
4. `MIGRATION.md` — plano de remoção do legado e adoção do novo modelo

---

## Próximo Passo

Aprovar o escopo reduzido e iniciar a refatoração do domínio de billing para o padrão Asaas do `kadernim`, adaptado ao contexto de `organization` do Whatrack.
