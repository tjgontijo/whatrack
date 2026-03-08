# PRD: Billing Legacy Cleanup and Data Migration

## Objetivo

Remover do domínio de billing tudo que hoje mantém o sistema em estado híbrido, migrando o produto para um desenho coerente com Stripe-only e catálogo administrado, sem legado operacional ativo no `src/`.

Nesta frente, a meta não é apenas "despriorizar" AbacatePay. A meta é:

- remover completamente AbacatePay do produto
- não deixar vestígios operacionais no código, env, schema, testes ou documentação ativa
- tratar qualquer referência restante como falha de fechamento da iniciativa

## Problema Atual

O billing ainda mistura:

- catálogo hardcoded
- schema administrativo parcial
- provider registry com AbacatePay e Stripe
- webhook Stripe novo com webhook genérico legado
- documentação ativa e testes ainda presos a contratos antigos

Isso dificulta review, operação e futuras mudanças.

## Decisão Fechada

AbacatePay deve sair integralmente do repositório operacional.

Isso inclui remover:

- provider
- webhook
- env vars
- comentários de schema
- referências em docs ativas
- fixtures e testes
- exemplos de setup
- referências em UI, copy e suporte

O único lugar aceitável para a existência histórica da AbacatePay é o histórico do git. O alvo desta iniciativa é que o tree ativo do projeto não carregue mais esse provider.

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
6. remover env vars e validações ligadas à AbacatePay
7. remover referências da AbacatePay do schema, comments e tipos gerados
8. atualizar testes, fixtures e docs ativos
9. remover ou reescrever documentação antiga de billing ligada à AbacatePay
10. remover qualquer clone, guia ou material auxiliar da AbacatePay dentro do repositório

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
- não manter `enum`, comentário, `type`, env var ou exemplo mencionando AbacatePay
- não manter docs "arquivadas" dentro do repositório ativo se ainda servirem como referência operacional indevida

### Regra de Higiene Final

Ao final desta iniciativa, a busca abaixo deve retornar zero ocorrências no tree ativo do projeto:

```bash
rg -n "abacatepay|ABACATEPAY|dashboard\\.abacatepay|api\\.abacatepay" src prisma docs .env*
```

Se algum diretório precisar ser explicitamente excluído dessa regra, isso deve ser decidido e documentado antes da implementação. O alvo preferencial continua sendo zero matches no repositório.

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

- remover AbacatePay do domínio, não apenas do fluxo ativo
- deixar só Stripe no caminho oficial

### 2. Limpar routes legadas

Revisar:

- `src/app/api/v1/billing/webhook/route.ts`
- rotas/documentos antigos ligados à AbacatePay

Objetivo:

- deletar o webhook legado
- impedir que o domínio continue sustentando dois contratos de provider

### 3. Migrar consumidores de plano

Revisar:

- landing pricing
- billing UI
- checkout
- success page
- account billing card

Objetivo:

- eliminar dependência operacional de `getBillingPlan()`

### 4. Limpar env e setup operacional

Revisar:

- `.env.example` ou equivalentes
- `src/lib/env/env.ts`
- docs operacionais de deploy
- scripts/setup ligados à AbacatePay

Objetivo:

- remover `ABACATEPAY_SECRET_KEY`
- remover `ABACATEPAY_WEBHOOK_SECRET`
- remover `ABACATEPAY_WEBHOOK_URL`
- remover qualquer instrução operacional do provider antigo

### 5. Migrar schema e dados

Revisar:

- `BillingPlan`
- `BillingPlanHistory`
- `BillingPlanTemplate`
- `BillingSubscription`

Objetivo:

- coerência estrutural
- sem tabelas sem função definida
- sem campos, comentários ou referências de provider antigo

### 6. Limpar docs e artefatos residuais

Revisar:

- `docs/BILLING_DEPLOYMENT.md`
- `docs/BILLING_QUICK_FIX.md`
- `docs/GUIDE/abacatepay_guide.md`
- PRDs antigos ou auxiliares que ainda instruam uso de AbacatePay
- diretórios auxiliares em `docs/SKILL/` ou equivalentes, se existirem

Objetivo:

- remover ou reescrever qualquer documento que mantenha a AbacatePay viva no repo
- evitar que suporte, produto ou engenharia usem documentação morta como referência

### 7. Atualizar testes

Objetivo:

- remover fixtures `abacatepay` do caminho principal
- alinhar testes ao mundo Stripe-only

## Critérios de Aceite

- nenhuma rota oficial de billing depende da AbacatePay
- nenhum arquivo operacional do repo menciona AbacatePay
- nenhum env obrigatório do app menciona AbacatePay
- nenhum fluxo principal depende de `plans.ts`
- subscription aponta para catálogo administrativo real
- docs ativas não instruem uso de provider antigo
- testes do domínio principal deixam de assumir `abacatepay`
- busca textual por `abacatepay|ABACATEPAY` no repo ativo retorna zero ou somente exceções explicitamente aprovadas

## Dependências

- `15_PRD_BILLING_PLANS_CRUD.md`
- `14_PRD_STRIPE_SUBSCRIPTIONS_CORE.md`

## Riscos

- migração parcial deixar metade dos consumers no hardcode
- schema ficar com tabelas sobrepostas sem dono claro
- remoção do legado sem migração de dados quebrar assinaturas existentes
- sobrar referência textual isolada e o time assumir incorretamente que o provider antigo ainda é suportado
