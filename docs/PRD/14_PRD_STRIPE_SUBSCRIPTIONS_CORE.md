# PRD: Stripe Subscriptions Core

## Objetivo

Fechar o núcleo de assinatura recorrente com Stripe como provider oficial, removendo ambiguidades do lifecycle local e deixando checkout, webhook, portal, cancelamento e mudança de plano consistentes entre app e provider.

## Problema Atual

Hoje o billing já abre checkout e recebe webhook, mas o núcleo ainda está incompleto:

- o domínio ainda carrega resquícios de multi-provider
- a assinatura local ainda nasce e evolui com estados transitórios pouco rigorosos
- o portal existe, mas ainda depende de cast e bootstrap genérico
- a mudança de plano não está fechada como fluxo de produto
- o cancelamento existe na camada de provider, mas precisa virar contrato robusto ponta a ponta

## Estado Confirmado no Código

### Já existe

- `src/lib/billing/providers/providers/stripe-provider.ts`
- `src/app/api/v1/billing/checkout/route.ts`
- `src/services/billing/billing-checkout.service.ts`
- `src/app/api/v1/billing/webhooks/stripe/route.ts`
- `src/services/billing/handlers/stripe-webhook.handler.ts`
- `src/app/api/v1/billing/portal/route.ts`

### Gaps concretos

1. Bootstrap de provider ainda não está Stripe-only
- `src/lib/billing/providers/init.ts`
- `src/lib/billing/providers/providers/provider-registry.ts`

2. A assinatura local ainda é criada cedo demais no checkout
- `src/services/billing/billing-checkout.service.ts`
- hoje o fluxo persiste estado antes da consolidação final do subscription real

3. O webhook Stripe ainda cobre só o básico
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

4. O portal route usa cast para `StripeProvider`
- `src/app/api/v1/billing/portal/route.ts`

5. Mudança de plano e cancelamento ainda não estão amarrados ao contrato final da UI e do support flow

## Decisões Fechadas

- Stripe é o único provider operacional desta frente
- checkout self-serve é cartão only
- o app deve refletir o lifecycle oficial da Stripe
- o provider local não deve inventar semântica extra quando a Stripe já fornece o contrato

## Escopo

### Entra nesta iniciativa

1. tornar Stripe o único provider ativo do domínio operacional
2. fechar checkout de assinatura
3. fechar webhook Stripe de subscription lifecycle
4. fechar customer portal
5. fechar cancelamento no provider
6. fechar mudança de plano no provider
7. decidir e implementar trial, se ele entrar na V1
8. alinhar status locais com Stripe

### Fica fora desta iniciativa

- overage
- catálogo administrativo de planos
- migração histórica de planos
- cleanup final de docs legadas

## Arquitetura Alvo

### Provider bootstrap

Objetivo:

- `init.ts` registra Stripe como caminho oficial
- provider ativo deixa de depender do legado AbacatePay
- o domínio continua extensível sem dualidade operacional ativa

### Checkout

Fluxo alvo:

1. app cria checkout session Stripe
2. metadata inclui `organizationId`, `planId`/`planVersionId` ou `planType` transitório
3. app persiste apenas estado transitório mínimo e seguro
4. webhook Stripe consolida customer, subscription, ciclo e status

### Webhook

Eventos mínimos da V1:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

O webhook deve:

- validar assinatura oficial da Stripe
- deduplicar por `event.id`
- atualizar assinatura local de forma idempotente
- atualizar datas de ciclo
- consolidar cancelamento no fim do período

### Customer Portal

O app deve usar o portal oficial da Stripe para:

- atualizar cartão
- ver cobrança
- gerenciar cancelamento
- acessar invoices

### Mudança de plano

Fluxo alvo:

- UI solicita troca
- app atualiza a subscription item da Stripe
- webhook consolida estado final local

## Mudanças Técnicas Necessárias

### 1. Fechar contrato do provider Stripe

Revisar:

- `src/lib/billing/providers/providers/billing-provider.ts`
- `src/lib/billing/providers/providers/stripe-provider.ts`

Objetivo:

- contrato tipado e completo
- sem cast em consumers
- métodos explícitos para portal, cancelamento e troca de plano

### 2. Fechar bootstrap de providers

Revisar:

- `src/lib/billing/providers/init.ts`
- `src/lib/billing/providers/providers/provider-registry.ts`
- `src/lib/env/env.ts`

Objetivo:

- Stripe-only no caminho ativo
- remover default operacional legado

### 3. Fechar checkout

Revisar:

- `src/services/billing/billing-checkout.service.ts`
- `src/app/api/v1/billing/checkout/route.ts`
- `src/app/(public)/billing/success/page.tsx`

Objetivo:

- persistência local coerente
- metadata correta
- sem IDs transitórios sendo tratados como subscription real

### 4. Fechar webhook Stripe

Revisar:

- `src/app/api/v1/billing/webhooks/stripe/route.ts`
- `src/services/billing/handlers/stripe-webhook.handler.ts`

Objetivo:

- lifecycle completo
- datas de ciclo confiáveis
- status coerente
- idempotência

### 5. Fechar portal e UI de lifecycle

Revisar:

- `src/app/api/v1/billing/portal/route.ts`
- `src/components/dashboard/billing/billing-status.tsx`
- `src/components/dashboard/account/account-billing-card.tsx`
- rotas de cancelamento e subscription

## Critérios de Aceite

- checkout cria sessão Stripe válida
- webhook ativa assinatura local corretamente
- `providerCustomerId` e `providerSubscriptionId` ficam consistentes
- cancelamento no app reflete no provider
- mudança de plano reflete no provider e no app
- customer portal abre sem cast inseguro no domínio
- status local não depende de heurística herdada da AbacatePay

## Dependências

- `12_PRD_STRIPE_FIRST_BILLING.md`
- definição final de trial na V1

## Riscos

- inconsistência de IDs entre checkout session e subscription real
- status local divergindo da Stripe
- mudança de plano sem proration/efeito esperado se a regra não for explícita
