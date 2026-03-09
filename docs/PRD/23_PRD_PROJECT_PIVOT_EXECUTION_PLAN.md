# PRD 23 — Project Pivot Execution Plan

## Status

Ativo. Este documento organiza a execucao da pivotagem do WhaTrack para o ICP de agencias, com `Project` como workspace do cliente da agencia e unidade de franquia operacional.

## Objetivo

Evitar retrabalho e execucao fora de ordem durante a pivotagem.

Este documento define:

- ordem de execucao
- dependencias entre PRDs
- escopo tecnico por fase
- arquivos e dominios afetados
- criterio de conclusao de cada etapa

## Contexto

O WhaTrack deixou de mirar prioritariamente o usuario final B2C.

ICP travado:

- agencias de performance
- gestores de trafego
- operacoes que gerenciam varios clientes com Meta Ads + WhatsApp

Consequencia estrutural:

- `Organization` passa a representar a agencia
- `Project` passa a representar cada cliente da agencia
- billing, onboarding, dashboard e copy precisam refletir esse modelo

## Regra Mestra de Execucao

Nao implementar billing novo, onboarding novo ou copy nova sem antes travar o contexto de `Project`.

Regras complementares:

- tratar a pivotagem como greenfield; nao manter compatibilidade legada ativa no `src/`
- se o schema intermediario atrapalhar o andamento em dev, resetar o banco e reseedar e preferivel a carregar fallback temporario
- toda tela read-heavy nova dessa pivotagem deve nascer `server-first`
- toda listagem/CRUD novo deve nascer com paginação explicita e pacote de performance do projeto

Ordem obrigatoria:

1. `Project` como base estrutural
2. escopo operacional por projeto
3. onboarding novo
4. billing novo
5. copy e posicionamento
6. cutover e smoke

## Ordem de Execucao

### Fase 1. Base estrutural de Project

PRD fonte:

- `19_PRD_CLIENT_MANAGEMENT.md`

Objetivo:

- criar a entidade `Project`
- estabelecer `projectId` nas entidades operacionais principais
- preparar o app para operar com contexto de projeto ativo

Entregas:

- schema Prisma para `Project`
- migrations
- `projectId` em:
  - `WhatsAppConfig`
  - `MetaAdAccount`
  - `Lead`
  - `Ticket`
  - `Sale`
  - `Item`
  - `ItemCategory`
- tipos, schemas e services de `Project`
- APIs de CRUD
- seletor global de projeto
- rotas de projeto desenhadas como `Server Component` + `loading.tsx`

Arquivos/dominios afetados:

- `prisma/schema.prisma`
- `prisma/migrations/*`
- `src/services/projects/*`
- `src/schemas/projects/*`
- `src/types/projects/*`
- `src/app/api/v1/projects/*`
- `src/components/dashboard/projects/*`
- contexto de sessao / dashboard shell

Gate de conclusao:

- e possivel criar, editar e selecionar um projeto
- as entidades principais aceitam e persistem `projectId`
- o app consegue operar com “projeto ativo”
- nao existe contrato legado paralelo no `src/` para o modelo anterior

### Fase 2. Escopo operacional por projeto

PRD fonte:

- `19_PRD_CLIENT_MANAGEMENT.md`

Objetivo:

- tirar o produto do modo “flat”
- fazer os modulos internos operarem por cliente da agencia

Entregas:

- associacao de WhatsApp a projeto
- associacao de Meta Ads a projeto
- filtros por projeto nas telas principais
- dashboard, CRM, vendas, itens e categorias filtrando por `projectId`
- detalhe de projeto com resumo operacional
- `/dashboard/projects` e `/dashboard/projects/[projectId]` server-first
- listagens paginadas desde o contrato inicial
- client incremental usando `useInfiniteQuery` apenas onde realmente houver paginação interativa

Arquivos/dominios afetados:

- `src/app/dashboard/*`
- `src/components/dashboard/*`
- `src/services/whatsapp/*`
- `src/services/meta-ads/*`
- `src/services/leads/*`
- `src/services/tickets/*`
- `src/services/sales/*`
- `src/services/dashboard/*`

Gate de conclusao:

- o usuario consegue trocar de projeto e ver dados coerentes daquele cliente
- criar/editar entidades principais respeita o projeto ativo

### Fase 3. Novo onboarding e trial

PRD fonte:

- `20_PRD_CUSTOMER_ONBOARDING_CONVERSION.md`

Objetivo:

- trocar o funil atual por:
  - landing
  - sign up
  - onboarding leve
  - criacao do primeiro projeto
  - `/welcome`
  - trial

Entregas:

- remover checkout direto da landing
- onboarding leve:
  - nome do responsavel
  - nome da agencia
  - nome do primeiro cliente/projeto
- criar organizacao + primeiro projeto automaticamente
- iniciar trial de 14 dias
- cair em `/welcome` com o projeto ativo
- `/welcome` server-first com payload agregado e `loading.tsx`

Arquivos/dominios afetados:

- `src/components/landing/*`
- `src/app/(auth)/*`
- `src/components/dashboard/organization/onboarding-dialog.tsx`
- futura rota `src/app/dashboard/welcome/*`
- services de trial e onboarding

Gate de conclusao:

- novo usuario nao cai mais em checkout
- onboarding cria agencia e primeiro projeto
- trial inicia sem cartao

### Fase 4. Novo billing comercial

PRDs fonte:

- `12_PRD_STRIPE_FIRST_BILLING.md`
- `13_PRD_BILLING_CLOSEOUT_INDEX.md`
- `18_PRD_BILLING_RELEASE_OPS_AND_SMOKE.md`
- `21_PRD_PRICING_INSTANCE_MODEL.md`

Objetivo:

- refletir no billing o modelo comercial de agencia

Entregas:

- catalogo novo:
  - `platform_base`
  - `additional_project`
  - `additional_whatsapp_number`
  - `additional_meta_ad_account`
- Stripe com assinatura multi-item
- regras de entitlement por projeto
- trial focado no primeiro projeto
- dashboard de billing mostrando:
  - base
  - projetos incluidos
  - projetos adicionais
  - WhatsApps extras
  - contas Meta extras
- sem catalogo legacy ativo em codigo, banco ou docs

Arquivos/dominios afetados:

- `prisma/seeds/seed_billing_plans.ts`
- `src/services/billing/*`
- `src/lib/billing/*`
- `src/app/api/v1/billing/*`
- `src/app/api/v1/billing/webhooks/stripe/*`
- `src/components/dashboard/billing/*`
- `src/components/dashboard/account/account-billing-card.tsx`

Gate de conclusao:

- trial respeita o primeiro projeto
- plano pago libera 3 projetos
- add-ons incrementam billing corretamente

### Fase 5. Copy e posicionamento

PRD fonte:

- `22_PRD_AGENCY_POSITIONING_AND_COPY.md`

Objetivo:

- alinhar promessa comercial ao produto novo

Entregas:

- landing falando com agencia/gestor de trafego
- pricing refletindo clientes ativos e add-ons
- auth e onboarding falando em agencia + primeiro cliente
- billing/success refletindo modelo novo

Arquivos/dominios afetados:

- `src/components/landing/*`
- `src/app/(auth)/*`
- `src/app/(public)/billing/success/page.tsx`
- `src/components/dashboard/billing/*`
- `src/app/dashboard/welcome/*`

Gate de conclusao:

- nao restam referencias ativas ao ICP B2C generico nem ao billing antigo

### Fase 6. Cutover e smoke

PRDs fonte:

- `18_PRD_BILLING_RELEASE_OPS_AND_SMOKE.md`
- `21_PRD_PRICING_INSTANCE_MODEL.md`

Objetivo:

- colocar o novo modelo em operacao sem ambiguidade

Entregas:

- seed final rodado
- Products/Prices na Stripe
- docs operacionais atualizadas
- smoke completo:
  - sign up
  - onboarding leve
  - trial
  - conectar WhatsApp
  - conectar Meta Ads
  - upgrade
  - projeto adicional
  - WhatsApp adicional
  - Meta Ads adicional

Gate de conclusao:

- smoke completo aprovado
- dashboard, onboarding e billing coerentes entre si

## Dependencias entre PRDs

| Ordem | PRD | Depende de |
|---|---|---|
| 1 | `19_PRD_CLIENT_MANAGEMENT.md` | nenhuma |
| 2 | `20_PRD_CUSTOMER_ONBOARDING_CONVERSION.md` | `19` |
| 3 | `21_PRD_PRICING_INSTANCE_MODEL.md` | `19`, alinhamento com `20` |
| 4 | `22_PRD_AGENCY_POSITIONING_AND_COPY.md` | `20`, `21` |
| 5 | `18_PRD_BILLING_RELEASE_OPS_AND_SMOKE.md` | `21` implementado |

## Lista Consolidada do que vai mudar

### Schema e banco

- `Project`
- `projectId` em entidades operacionais principais
- novos seeds de billing
- novos contratos de entitlement por projeto

### Dashboard e shell do app

- contexto de projeto ativo
- seletor global de projeto
- modulos filtrados por projeto

### Onboarding

- onboarding leve
- criacao automatica do primeiro projeto
- `/welcome`

### Billing

- trial de 14 dias sem cartao
- base + add-ons
- franquia por projeto
- Stripe com multiplos itens de assinatura

### Copy

- landing
- pricing
- auth
- onboarding
- welcome
- billing

## Riscos Principais

1. Misturar rollout de `Project` com billing antes de o contexto operacional estar pronto.
2. Alterar copy antes de o produto refletir a nova promessa.
3. Migrar billing sem o dashboard conseguir mostrar corretamente projetos e extras.
4. Criar `projectId` em muitas entidades sem revisar todos os create paths.

## Regra de Execucao Recomendada

Sempre trabalhar com commits por fase logica:

1. schema + services de projeto
2. contexto de projeto no produto
3. onboarding novo
4. billing novo
5. copy
6. smoke final

## Recomendacao Final

O ponto de partida correto e **Fase 1 do PRD 19**.

Se a execucao comecar por billing ou copy antes de `Project`, o custo de retrabalho sobe muito.
