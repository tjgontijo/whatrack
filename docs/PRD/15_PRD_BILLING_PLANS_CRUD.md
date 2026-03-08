# PRD: Billing Plans CRUD

## Objetivo

Criar um CRUD administrativo para planos de billing com `Stripe` como source of truth externa de cobrança e o banco do Whatrack como source of truth interna de catálogo e versionamento.

O resultado esperado é:

- criar e editar planos sem alterar `src/lib/billing/plans.ts`
- configurar `7 dias grátis` sem editar código
- versionar preço e limites sem sobrescrever contratos antigos
- sincronizar novas versões do plano com a Stripe
- manter auditoria usando a infraestrutura já existente do projeto

## Decisão de Produto

- esta interface é administrativa e interna
- o método oficial de cobrança continua sendo `cartão`
- `Stripe` é o único provider desta frente
- `Starter` e `Pro` devem carregar `trialDays = 7`
- não existe plano gratuito permanente nesta fase
- não haverá compatibilidade legada permanente com planos hardcoded no `src/`
- quotas de plano entram como configuração administrativa do catálogo, não como UI para usuários finais

## Estado Real Hoje

O projeto já tem partes do domínio espalhadas:

- catálogo hardcoded em `src/lib/billing/plans.ts`
- provider Stripe já em evolução no código
- `BillingSubscription.planId` já existe no schema
- `BillingPlan`, `BillingPlanHistory` e `BillingPlanTemplate` já existem no schema atual
- o projeto já possui auditoria sistêmica em `OrgAuditLog`

O problema do estado atual é que ele está inconsistente:

- a fonte real de planos ainda é `plans.ts`
- o schema atual de `BillingPlan` não sustenta versionamento real de preço
- `BillingPlanHistory` duplica o papel de auditoria já coberto por `OrgAuditLog`
- o desenho proposto anteriormente assumia criação do zero, o que já não corresponde ao banco atual

## Decisão Arquitetural

### Source of truth

O catálogo de planos deve sair de `src/lib/billing/plans.ts` e passar para o banco.

Regra:

- o banco passa a ser a única fonte de verdade do catálogo administrativo
- `plans.ts` pode existir apenas como artefato transitório de migração
- ao final da implementação, `plans.ts` não pode continuar sustentando o fluxo principal

### Versionamento

Para suportar “preço novo para novas assinaturas, preço antigo para assinaturas existentes”, o domínio precisa de versionamento explícito.

O desenho alvo é:

- `BillingPlan`: identidade estável do plano
- `BillingPlanVersion`: versão comercial do plano, com preço, limites, quotas e IDs da Stripe
- `BillingSubscription` deve apontar para a versão contratada

### Auditoria

Não criar um sistema paralelo de histórico.

Usar:

- `OrgAuditLog` para auditoria de ações administrativas

Se for necessário um endpoint de histórico por plano, ele deve consultar `OrgAuditLog` filtrando:

- `resourceType = "billing-plan"`
- `resourceId = <planId>`

## Escopo

### Entra nesta iniciativa

1. refatorar o schema de plano para suportar versionamento real
2. CRUD administrativo de planos
3. sincronização app -> Stripe para produto/preço
4. tela administrativa de planos
5. histórico por plano usando auditoria existente
6. migração do catálogo hardcoded para o banco
7. remoção da dependência operacional de `src/lib/billing/plans.ts`

### Fica fora desta iniciativa

- múltiplas moedas
- múltiplos providers
- sync bidirecional Stripe -> app como source of truth
- edição de quotas por usuários comuns
- meterização de eventos em tempo real
- engine promocional/cuponagem

## Arquitetura Alvo

### Schema

Em vez de manter `BillingPlan` como registro único com um único `stripePriceId`, o alvo deve ser:

```prisma
model BillingPlan {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  slug              String   @unique
  name              String
  description       String?
  isActive          Boolean  @default(true)
  displayOrder      Int      @default(0)
  isHighlighted     Boolean  @default(false)
  contactSalesOnly  Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  archivedAt        DateTime?

  versions          BillingPlanVersion[]

  @@index([isActive])
  @@map("billing_plans")
}

model BillingPlanVersion {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  planId                String   @db.Uuid
  versionNumber         Int
  isCurrent             Boolean  @default(true)

  monthlyPrice          Decimal  @db.Decimal(10, 2)
  currency              String   @default("BRL")
  trialDays             Int      @default(7)
  eventLimitPerMonth    Int
  overagePricePerEvent  Decimal  @db.Decimal(6, 2)

  maxWhatsAppNumbers    Int
  maxAdAccounts         Int
  maxTeamMembers        Int
  supportLevel          String

  stripeProductId       String?
  stripePriceId         String?
  syncStatus            String   @default("pending")
  syncError             String?
  syncedAt              DateTime?

  effectiveFrom         DateTime @default(now())
  archivedAt            DateTime?
  createdAt             DateTime @default(now())

  plan                  BillingPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  subscriptions         BillingSubscription[]

  @@unique([planId, versionNumber])
  @@index([planId, isCurrent])
  @@index([stripePriceId])
  @@map("billing_plan_versions")
}
```

Também será necessário ajustar `BillingSubscription` para apontar para a versão exata contratada, por exemplo:

- `planVersionId String?`

### API

Como esta é uma área administrativa global, as rotas devem seguir o namespace já existente de `system`:

```text
GET    /api/v1/system/billing-plans?page=1&pageSize=20&query=
GET    /api/v1/system/billing-plans/[id]
POST   /api/v1/system/billing-plans
PATCH  /api/v1/system/billing-plans/[id]
POST   /api/v1/system/billing-plans/[id]/archive
POST   /api/v1/system/billing-plans/[id]/sync-stripe
GET    /api/v1/system/billing-plans/[id]/history?page=1&pageSize=20
```

Regras obrigatórias:

- `GET` de listagem paginado
- sem Prisma direto nas routes
- sem schemas inline
- `requireSuperAdmin` ou permissão sistêmica equivalente

### Services

Estrutura alvo:

- `src/services/billing/billing-plan.service.ts`
- `src/services/billing/billing-plan-query.service.ts`
- `src/services/billing/billing-plan-stripe-sync.service.ts`

Responsabilidades:

- `billing-plan-query.service.ts`
  - leitura paginada
  - detalhe
  - histórico
- `billing-plan.service.ts`
  - criar plano
  - editar plano
  - arquivar plano
  - criar nova versão
- `billing-plan-stripe-sync.service.ts`
  - criar product/price na Stripe
  - sincronizar versão pendente
  - consolidar erro de sync

### Schemas

Criar em:

- `src/schemas/billing/billing-plan-schemas.ts`

Com pelo menos:

- schema de listagem paginada
- schema de create
- schema de update
- schema de archive
- schema de sync

### UI

A tela deve seguir a política `server-first` da skill.

Página alvo:

- `src/app/dashboard/settings/billing/page.tsx`

Estrutura recomendada:

- `page.tsx` como Server Component
- `loading.tsx` para skeleton estável
- leitura inicial agregada no servidor
- componentes client apenas para:
  - abrir formulário
  - salvar mutation
  - sincronizar com Stripe
  - paginação incremental/filtros

Componentes alvo:

- `src/components/dashboard/billing/billing-plan-list.tsx`
- `src/components/dashboard/billing/billing-plan-form-dialog.tsx`
- `src/components/dashboard/billing/billing-plan-history-sheet.tsx`
- `src/components/dashboard/billing/billing-plan-sync-badge.tsx`

## Fluxo de Uso

### Criar novo plano

1. super admin abre `/dashboard/settings/billing`
2. tela carrega primeira página no servidor
3. usuário abre diálogo `Novo plano`
4. preenche identidade e primeira versão comercial
5. salva
6. sistema cria `BillingPlan`
7. sistema cria `BillingPlanVersion` inicial
8. sistema registra auditoria em `OrgAuditLog`
9. opcionalmente sincroniza essa versão com Stripe

### Alterar preço

1. super admin abre um plano existente
2. edita dados comerciais
3. sistema não sobrescreve a versão vigente
4. sistema cria uma nova `BillingPlanVersion`
5. nova versão vira `isCurrent = true`
6. versões antigas continuam preservadas para assinaturas já vinculadas
7. sistema sincroniza a nova versão com Stripe

### Arquivar plano

1. super admin clica `Arquivar`
2. sistema marca `archivedAt`
3. plano deixa de aparecer como opção nova no checkout
4. assinaturas existentes permanecem válidas

## Mudanças Técnicas Necessárias

### 1. Refatorar schema existente

Em vez de “adicionar BillingPlan do zero”, o trabalho correto é:

- revisar `BillingPlan` atual
- remover ou substituir `BillingPlanHistory`
- decidir o papel de `BillingPlanTemplate`
- introduzir `BillingPlanVersion`
- adicionar vínculo de subscription com versão

### 2. Usar migration versionada

Não usar `db push`.

Fluxo esperado:

- `npx prisma migrate dev --name billing-plan-versioning`
- deploy com `npx prisma migrate deploy`

### 3. Migrar catálogo hardcoded

Criar migração operacional para:

- importar `starter`, `pro` e `agency` do catálogo atual
- gerar versão inicial no banco
- validar dados na Stripe
- depois remover a dependência operacional de `src/lib/billing/plans.ts`

### 4. Implementar CRUD

Com:

- listagem paginada
- detalhe
- criação
- edição com nova versão
- arquivamento
- sync Stripe
- histórico via audit log

### 5. Implementar tela administrativa

Com:

- leitura inicial server-side
- filtros e paginação
- formulário modal/dialog
- status de sincronização
- histórico

## Critérios de Aceite

- super admin consegue listar planos com paginação
- super admin consegue criar plano sem editar código
- editar preço cria nova versão, não sobrescreve versão antiga
- sync com Stripe cria ou atualiza product/price corretamente
- histórico de ações fica disponível via `OrgAuditLog`
- checkout passa a ler o catálogo do banco
- `src/lib/billing/plans.ts` deixa de ser a fonte de verdade do fluxo principal

## Riscos

- tentar manter catálogo hardcoded e catálogo em banco ao mesmo tempo gera dívida imediata
- manter `BillingPlanHistory` paralelo ao `OrgAuditLog` duplica auditoria sem necessidade
- modelar preço sem versão quebra assinaturas antigas na primeira alteração de preço
- colocar tudo em uma única página client-driven vai contra a arquitetura `server-first` do projeto

## Ordem de Execução Recomendada

1. refatorar schema para versionamento real
2. criar schemas Zod do domínio
3. implementar query service e mutation service
4. implementar sync service da Stripe
5. criar routes `system`
6. criar página server-first em `/dashboard/settings/billing`
7. migrar catálogo atual do código para o banco
8. trocar consumidores do checkout para ler do banco
9. remover dependência operacional do catálogo hardcoded

## Smoke Test Obrigatório

1. abrir `/dashboard/settings/billing`
2. listar planos existentes com paginação
3. criar um plano novo
4. sincronizar esse plano com Stripe
5. editar preço de um plano existente
6. confirmar criação de nova versão
7. confirmar que o histórico mostra a alteração
8. criar uma assinatura nova usando a versão atual
9. confirmar que uma assinatura antiga continua vinculada à versão anterior

## Definição de Done

- CRUD administrativo funcional
- listagem paginada e server-first
- sync Stripe operacional
- versionamento real de preço/limites
- auditoria integrada ao sistema existente
- catálogo do banco como source of truth
- catálogo hardcoded fora do caminho principal
