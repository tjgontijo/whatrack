# PRD: Billing Legacy Cleanup and Data Migration

## Objetivo

Remover do domínio de billing tudo que ainda mantém o sistema em estado híbrido, deixando o produto coerente com Stripe-only e sem legado operacional ativo no `src/`, `prisma/`, `docs/` ou `.env*`.

## Problema Atual

Mesmo com Stripe já operando o caminho principal, ainda restam resíduos do provider antigo em:

- provider layer
- webhook legado
- env schema
- comentários e campos de schema
- testes e fixtures
- documentação histórica que ainda parece operacional

Isso aumenta risco de manutenção, revisão e setup errado.

## Decisão Fechada

O provider legado deve sair integralmente do tree ativo do projeto.

Isso inclui remover:

- provider e webhook antigos
- env vars antigas
- utilitários, schemas e testes ligados ao webhook antigo
- referências textuais em código, schema, docs e `.env*`
- documentação antiga que possa ser confundida com referência operacional

## Escopo

### Entra nesta iniciativa

1. remover provider antigo do runtime
2. remover webhook legado do caminho oficial
3. limpar env e setup operacional
4. limpar schema, seed e artefatos Prisma gerados
5. atualizar testes e fixtures para Stripe-only
6. remover docs e guias antigos
7. zerar referências textuais ao provider removido

### Fica fora desta iniciativa

- novos fluxos de checkout
- novos métodos de pagamento
- overage
- smoke final de billing

## Mudanças Técnicas Necessárias

### 1. Provider layer

Revisar:

- `src/lib/billing/providers/init.ts`
- `src/lib/billing/providers/providers/provider-registry.ts`
- `src/lib/billing/providers/providers/billing-provider.ts`

Objetivo:

- manter apenas Stripe no caminho ativo
- remover IDs e comentários mortos

### 2. Webhook legado

Remover:

- rota antiga de webhook de billing
- `src/services/billing/handlers/billing-webhook.handler.ts`
- utilitários e testes associados

Objetivo:

- deixar apenas `POST /api/v1/billing/webhooks/stripe`

### 3. Env e setup

Revisar:

- `.env*`
- `src/lib/env/env.ts`
- docs de setup de billing

Objetivo:

- manter apenas envs ativos de Stripe e cron

### 4. Schema e seeds

Revisar:

- `prisma/schema.prisma`
- migrations ativas
- `prisma/seeds/seed_billing_plans.ts`

Objetivo:

- remover campos ligados ao provider removido
- manter o catálogo coerente com Stripe-only

### 5. Docs e histórico operacional

Revisar:

- `docs/BILLING_DEPLOYMENT.md`
- `docs/BILLING_QUICK_FIX.md`
- PRDs ativos e arquivos arquivados que ainda instruam uso do provider removido

Objetivo:

- deixar o repositório sem referência operacional morta

## Critérios de Aceite

- nenhuma rota oficial de billing depende do provider removido
- nenhum env obrigatório menciona o provider removido
- nenhum teste do domínio principal assume o provider removido
- docs ativas de billing refletem Stripe-only
- busca textual por referências do provider removido retorna zero no tree ativo

## Ordem Recomendada

1. remover runtime e webhook legado
2. limpar env schema e `.env*`
3. limpar schema/seed/migrations
4. limpar docs
5. regenerar Prisma Client e validar o projeto
