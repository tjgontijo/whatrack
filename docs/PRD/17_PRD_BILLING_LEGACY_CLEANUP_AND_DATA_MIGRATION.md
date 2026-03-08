# PRD: Billing Legacy Cleanup and Data Migration

## Objetivo

Remover do domínio de billing tudo que hoje mantém o sistema em estado híbrido, migrando o produto para um desenho coerente com Stripe-only e catálogo administrado, sem legado operacional ativo no `src/`.

## Problema Atual

O billing ainda mistura:

- catálogo hardcoded
- schema administrativo parcial
- provider registry com AbacatePay e Stripe
- webhook Stripe novo com webhook genérico legado
- documentação ativa e testes ainda presos a contratos antigos

Isso dificulta review, operação e futuras mudanças.

## Estado Confirmado no Código

### Legados ativos ou semi-ativos

- `src/lib/billing/plans.ts` ainda sustenta landing, checkout e UI
- `src/lib/billing/providers/providers/abacatepay-provider.ts` ainda está no caminho ativo do domínio
- `src/app/api/v1/billing/webhook/route.ts` continua existindo
- `BillingPlanTemplate` e `BillingPlan` coexistem sem contrato fechado
- vários testes ainda assumem `abacatepay`

### Inconsistências de dados

- `BillingSubscription` ainda depende de `planType`
- `planId` existe, mas não sustenta o fluxo principal
- ainda não existe `planVersionId`

## Escopo

### Entra nesta iniciativa

1. remover dependência operacional da AbacatePay no `src/`
2. remover webhook legado do caminho oficial
3. migrar o domínio de `planType` hardcoded para catálogo administrado
4. decidir e implementar o destino de `BillingPlanTemplate`
5. introduzir `planVersionId` se o PRD 13 for seguido
6. atualizar testes, fixtures e docs ativos
7. arquivar ou remover documentação antiga de billing

### Fica fora desta iniciativa

- implementação inicial do catálogo admin
- implementação inicial do overage
- smoke final de produção

## Decisões Arquiteturais

### Anti-legado

Regra:

- não manter fallback eterno entre `plans.ts` e banco
- não manter webhook genérico ativo junto do oficial Stripe
- não manter provider antigo registrado só “por precaução”

### Migração de subscriptions

Alvo:

- subscription deixa de depender apenas de `planType`
- passa a apontar para `planId` e, quando existir, `planVersionId`

### Destino de `BillingPlanTemplate`

Precisa de decisão explícita:

- ou vira seed-only
- ou é removido
- ou é absorvido por `BillingPlan`/`BillingPlanVersion`

Não pode continuar sem papel claro.

## Mudanças Técnicas Necessárias

### 1. Limpar provider layer

Revisar:

- `src/lib/billing/providers/init.ts`
- `src/lib/billing/providers/providers/provider-registry.ts`
- `src/lib/billing/providers/providers/abacatepay-provider.ts`
- `src/lib/env/env.ts`

Objetivo:

- remover AbacatePay do fluxo operacional ativo
- deixar só Stripe no caminho oficial

### 2. Limpar routes legadas

Revisar:

- `src/app/api/v1/billing/webhook/route.ts`
- rotas/documentos antigos ligados à AbacatePay

### 3. Migrar consumidores de plano

Revisar:

- landing pricing
- billing UI
- checkout
- success page
- account billing card

Objetivo:

- eliminar dependência operacional de `getBillingPlan()`

### 4. Migrar schema e dados

Revisar:

- `BillingPlan`
- `BillingPlanHistory`
- `BillingPlanTemplate`
- `BillingSubscription`

Objetivo:

- coerência estrutural
- sem tabelas sem função definida

### 5. Atualizar testes

Objetivo:

- remover fixtures `abacatepay` do caminho principal
- alinhar testes ao mundo Stripe-only

## Critérios de Aceite

- nenhuma rota oficial de billing depende da AbacatePay
- nenhum fluxo principal depende de `plans.ts`
- subscription aponta para catálogo administrativo real
- docs ativas não instruem uso de provider antigo
- testes do domínio principal deixam de assumir `abacatepay`

## Dependências

- `15_PRD_BILLING_PLANS_CRUD.md`
- `14_PRD_STRIPE_SUBSCRIPTIONS_CORE.md`

## Riscos

- migração parcial deixar metade dos consumers no hardcode
- schema ficar com tabelas sobrepostas sem dono claro
- remoção do legado sem migração de dados quebrar assinaturas existentes
