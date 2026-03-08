# PRD: Billing Closeout Index

## Objetivo

Fechar o domínio de pagamentos do Whatrack de ponta a ponta, eliminando implementações parciais e definindo uma sequência executável até o billing ficar operacionalmente confiável em produção.

## Diagnóstico Real do Código

Hoje o domínio de billing está funcional apenas no caminho básico de assinatura, mas ainda fragmentado:

- checkout Stripe existe
- webhook Stripe existe
- customer portal existe
- metering de eventos existe
- UI de billing existe

O problema é que essas peças ainda não fecham um sistema completo.

### Pontas soltas confirmadas no código

1. O domínio ainda está em transição de provider
- `src/lib/billing/providers/init.ts` ainda registra `abacatepay` e `stripe`
- `src/lib/billing/providers/providers/provider-registry.ts` ainda nasce com provider ativo `abacatepay`
- `src/app/api/v1/billing/webhook/route.ts` continua existindo para o fluxo legado

2. A assinatura local ainda não espelha corretamente o lifecycle final da Stripe
- o checkout cria assinatura local pendente antes da consolidação definitiva
- `providerSubscriptionId` recebe IDs transitórios no fluxo de checkout
- mudança de plano e cancelamento ainda não estão fechados como contrato de produto e operação

3. O catálogo de planos ainda não é source of truth do sistema
- checkout, landing e UI ainda dependem de `src/lib/billing/plans.ts`
- o banco já tem `BillingPlan`, mas o fluxo principal ainda não depende dele
- o schema atual não sustenta versionamento real do preço contratado

4. O overage não é cobrado de verdade
- o sistema calcula uso e exibe excedente
- mas não fecha ciclo, não cria invoice item e não reconcilia cobrança
- `chargedAmount` ainda nasce zerado no metering

5. Billing ops e documentação ainda divergem do código
- `docs/STRIPE_SETUP_GUIDE.md` promete partes não concluídas
- não existe today um fluxo operacional completo para overage, retry e fechamento de ciclo
- o domínio ainda precisa de smoke dedicado de billing

## Resultado Esperado

Ao final do programa de fechamento:

- Stripe é a única verdade operacional do billing
- catálogo de planos sai do hardcode
- assinatura local reflete a Stripe com consistência
- overage é medido, consolidado e cobrado de forma confiável
- customer portal, cancelamento e mudança de plano funcionam de verdade
- documentação e operação batem com o código

## PRDs Necessários

### 12. `12_PRD_STRIPE_FIRST_BILLING.md`

PRD macro da decisão de produto e arquitetura:

- Stripe como provider oficial
- cartão only
- arquitetura preparada para futuro `Polar`

### 15. `15_PRD_BILLING_PLANS_CRUD.md`

PRD do catálogo administrativo:

- CRUD de planos
- source of truth no banco
- versionamento comercial
- sync app -> Stripe

### 14. `14_PRD_STRIPE_SUBSCRIPTIONS_CORE.md`

PRD do fechamento do lifecycle principal:

- checkout
- webhook
- customer portal
- cancelamento
- mudança de plano
- trial, se entrar na decisão final

### 16. `16_PRD_BILLING_OVERAGE_EXECUTION.md`

PRD do excedente:

- medição confiável
- deduplicação
- fechamento de ciclo
- cobrança via Stripe
- reconciliação

### 17. `17_PRD_BILLING_LEGACY_CLEANUP_AND_DATA_MIGRATION.md`

PRD de limpeza estrutural:

- remoção de dependência ativa da AbacatePay
- migração de dados/contratos
- remoção de código morto e docs legadas
- alinhamento do domínio com Stripe-only

### 18. `18_PRD_BILLING_RELEASE_OPS_AND_SMOKE.md`

PRD operacional:

- envs
- Stripe Dashboard setup
- n8n/cron para billing
- retries e observabilidade
- smoke real de billing

## Ordem Recomendada de Execução

1. `14_PRD_STRIPE_SUBSCRIPTIONS_CORE.md`
2. `15_PRD_BILLING_PLANS_CRUD.md`
3. `16_PRD_BILLING_OVERAGE_EXECUTION.md`
4. `17_PRD_BILLING_LEGACY_CLEANUP_AND_DATA_MIGRATION.md`
5. `18_PRD_BILLING_RELEASE_OPS_AND_SMOKE.md`

## Regra de Prioridade

Se houver conflito de escopo:

- primeiro fecha dinheiro entrando
- depois fecha catálogo
- depois fecha excedente
- depois limpa legado
- por fim fecha operação e go-live

## Critério de Fechamento do Programa

O billing só pode ser considerado fechado quando:

- checkout Stripe estiver estável em produção
- subscription lifecycle local estiver coerente com a Stripe
- customer portal estiver funcional
- overage estiver sendo cobrado ou explicitamente desabilitado na V1
- catálogo não depender do hardcode como fluxo principal
- não restar rota webhook legada sustentando o caminho oficial
- documentação operacional estiver coerente com o código
- smoke completo de billing passar
