# PRD 19 — Gestao de Projetos (Agencia: Clientes como Projetos)

## Status

Proposto. Pre-requisito para `20_PRD_CUSTOMER_ONBOARDING_CONVERSION.md`.

## Regra de Execucao

Este PRD deve ser executado como mudanca greenfield.

- nao introduzir compatibilidade legada ativa no `src/`
- nao criar aliases, wrappers temporarios ou contratos paralelos para o modelo anterior
- se a migracao de dados atrapalhar a execucao em ambiente de desenvolvimento, o reset destrutivo do banco e aceitavel

## Contexto

O ICP do WhaTrack e a agencia de performance que roda Meta Ads com destino direto ao WhatsApp para seus clientes. Uma agencia gerencia N clientes, cada um com seu proprio numero de WhatsApp e conta de Meta Ads.

O sistema atual nao tem conceito de agrupamento por cliente. Instancias de WhatsApp e contas de Meta Ads ficam todas numa mesma visao flat dentro da organizacao. Para agencias com 5+ clientes, isso vira bagunca operacional.

Cada cliente gerenciado pela agencia sera representado como um **Projeto** dentro da organizacao no WhaTrack.

## Por que "Projeto" e nao "Cliente"

- Evita ambiguidade com o conceito de "cliente" do sistema (quem paga o WhaTrack)
- Uma agencia pode ter projetos internos proprios alem de clientes externos
- O termo e familiar para agencias: "projeto do cliente X", "projeto de lancamento Y"
- Permite expansao futura para outros casos de uso alem de gestao de clientes de agencia

## Problema

Hoje uma agencia com 3 clientes ve no dashboard:

- 3 numeros de WhatsApp sem contexto de qual e de quem
- 3 contas de Meta Ads sem agrupamento por projeto
- Dados de conversas, leads e conversoes misturados sem filtro por projeto

Resultado:

- agencia nao consegue ver performance por cliente/projeto
- nao ha como gerar relatorio por projeto
- onboarding de um novo cliente e implicito (so conecta o WhatsApp e Meta Ads e sabe mentalmente que e do cliente X)

## Decisao de Produto

Implementar uma entidade `Project` como **workspace operacional do cliente da agencia** dentro da organizacao:

- `Organization` representa a agencia/gestor que paga o WhaTrack
- `Project` representa um cliente dessa agencia
- cada `Project` concentra seus proprios dados operacionais
- cada `Project` passa a ser tambem a unidade de franquia operacional do modelo comercial
- sem auth propria para o cliente final neste momento
- sem isolamento de permissao por projeto nesta primeira fase
- o dashboard e os modulos internos passam a operar com contexto de projeto

`Project` deixa de ser apenas um agrupador visual e passa a ser a unidade de trabalho do cliente da agencia dentro do produto.

## Regra de Entitlement por Projeto

No modelo comercial definido no `21_PRD_PRICING_INSTANCE_MODEL.md`, cada `Project` representa um cliente ativo da agencia e carrega a franquia operacional desse cliente:

- 1 numero de WhatsApp incluido
- 1 conta de Meta Ads incluida
- 300 conversoes rastreadas por mes
- 10.000 creditos de IA por mes

Regras complementares:

- add-ons de WhatsApp e Meta Ads extras pertencem ao mesmo `Project`
- esses add-ons compartilham a mesma franquia de conversoes e creditos do projeto
- um `Project` adicional cria uma nova franquia completa
- billing continua na `Organization`, mas a leitura de uso e limites acontece por `Project`

## Schema

### Novo modelo: Project

```prisma
model Project {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  name           String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization    Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  whatsappConfigs WhatsAppConfig[]
  metaAdAccounts  MetaAdAccount[]

  @@index([organizationId])
  @@map("project")
}
```

### Alteracoes em modelos existentes

**WhatsAppConfig:**

```prisma
projectId String? @db.Uuid
project   Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
```

**MetaAdAccount:**

```prisma
projectId String? @db.Uuid
project   Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
```

Ambos os campos sao opcionais (`?`). Instancias sem projeto associado continuam funcionando normalmente.

**Organization:**

```prisma
projects Project[]
```

### Entidades operacionais que passam a pertencer a um Project

`projectId` deve existir diretamente nas entidades operacionais principais:

- `WhatsAppConfig`
- `MetaAdAccount`
- `Lead`
- `Ticket`
- `Sale`
- `Item`
- `ItemCategory`

Entidades de suporte podem continuar derivadas nesta primeira fase:

- `Conversation`
- `Message`
- `MetaConversionEvent`

Regra de produto:

- tudo o que a agencia enxerga como “dados do cliente” deve existir dentro de um `Project`
- filtros, dashboards e listagens devem operar sobre `projectId` direto nas entidades principais
- `Conversation` e `Message` podem continuar derivadas do `WhatsAppConfig.instanceId` no curto prazo, porque sao entidades mais quentes e de maior volume

## Requisitos Funcionais

### RF1. CRUD de Projetos

A agencia pode:

- criar um projeto com nome
- editar o nome do projeto
- arquivar/deletar um projeto (com confirmacao se houver instancias associadas)
- listar todos os projetos da organizacao

### RF2. Associar instancia WhatsApp a projeto

Ao conectar ou editar uma instancia de WhatsApp, a agencia pode:

- selecionar um projeto existente
- deixar sem projeto (instancia generica)

### RF3. Associar conta de Meta Ads a projeto

Ao conectar ou editar uma conta de Meta Ads, a agencia pode:

- selecionar um projeto existente
- deixar sem projeto (conta generica)

### RF4. Project como workspace operacional

Cada projeto deve ter sua propria visao operacional de:

- instancias de WhatsApp
- contas de Meta Ads
- leads
- tickets
- vendas
- itens
- categorias

Isso significa:

- `Lead`, `Ticket`, `Sale`, `Item` e `ItemCategory` passam a receber `projectId` direto
- o dashboard principal e as listagens de CRM devem filtrar por `projectId` nativo
- o contexto ativo do usuario no produto deve ser “qual projeto estou operando agora”

### RF5. Conversas e mensagens derivadas

Para a primeira fase, `Conversation` e `Message` podem continuar sem `projectId` direto, derivando o contexto via `Conversation.instanceId -> WhatsAppConfig.projectId`.

Motivo:

- reduz impacto imediato em tabelas quentes
- preserva rollout incremental
- mantem a regra de negocio correta, porque cada conversa nasce de uma instancia vinculada a um projeto

Semantica operacional:

- `Lead`, `Ticket`, `Sale`, `Item` e `ItemCategory` pertencem diretamente a um projeto
- `Conversation` e `Message` pertencem indiretamente ao projeto via instância
- dashboards e telas principais devem preferir sempre o `projectId` direto quando existir

### RF6. Visao por projeto

Tela de detalhe do projeto mostrando:

- instancias de WhatsApp associadas
- contas de Meta Ads associadas
- resumo de leads, tickets, vendas e conversoes rastreadas
- consumo e franquia do projeto:
  - quantidade de numeros de WhatsApp ativos
  - quantidade de contas Meta Ads conectadas
  - conversoes do ciclo
  - creditos de IA consumidos

## Requisitos Tecnicos

### Arquitetura

Seguir a estrutura de dominio do projeto:

```
src/services/projects/
  project.service.ts          # CRUD e queries
src/schemas/projects/
  project-schemas.ts          # Zod schemas
src/app/api/v1/projects/
  route.ts                    # GET (list) + POST (create)
  [projectId]/
    route.ts                  # GET + PATCH + DELETE
src/components/dashboard/projects/
  project-list.tsx
  project-form.tsx
  project-selector.tsx        # Dropdown reutilizavel para associar
src/types/projects/
  project.ts
```

### Contratos de API

**GET /api/v1/projects?page=1&limit=20**

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Cliente A",
      "whatsappCount": 1,
      "metaAdsCount": 2,
      "createdAt": "iso"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

Paginacao obrigatoria. Agencias podem ter dezenas de projetos.

**POST /api/v1/projects**

Body:
```json
{ "name": "Cliente A" }
```

**PATCH /api/v1/projects/:projectId**

Body:
```json
{ "name": "Cliente A Renomeado" }
```

**DELETE /api/v1/projects/:projectId**

Regras:
- Se projeto tem instancias associadas, retornar `409` com contagem
- Deletar apenas se confirmado via query param `?force=true`
- On delete: setar `projectId = null` nas instancias associadas (SetNull)

**PATCH /api/v1/whatsapp/instances/:instanceId**

Adicionar campo opcional:
```json
{ "projectId": "uuid | null" }
```

**PATCH /api/v1/meta-ads/ad-accounts/:accountId**

Adicionar campo opcional:
```json
{ "projectId": "uuid | null" }
```

### Regras de implementacao

- Todas as queries de Project devem ser scoped por `organizationId`
- `projectId` sera nullable apenas como estrategia de migracao segura
- todo create path novo de entidades operacionais deve preencher `projectId`
- Sem `useEffect` para orquestrar UI
- `project-selector.tsx` e um Combobox reutilizavel (lista projetos da org via TanStack Query)
- `/dashboard/projects` e `/dashboard/projects/[projectId]` devem nascer em `Server Component`
- criar `loading.tsx` com skeleton estavel para as rotas read-heavy de projeto
- o primeiro payload das telas de projeto deve vir de service server-side agregado
- listagem de projetos no dashboard deve expor paginação explicita
- se a tela de listagem tiver interacao incremental no client, usar `useInfiniteQuery`
- se houver volume suficiente para tabela/lista longa, aplicar virtualizacao

## Migracao de Dados

Ha migracao de schema e rollout progressivo de dados, mas sem convivencia legada ativa no `src`.

Fase inicial:

- adicionar `projectId` nullable nas entidades operacionais
- instancias e registros existentes continuam validos

Regra de rollout:

1. novos projetos passam a ser criados explicitamente
2. novas instancias de WhatsApp e contas Meta Ads ja nascem com `projectId`
3. novos leads, tickets, vendas, itens e categorias passam a nascer com `projectId`
4. dados historicos podem continuar sem `projectId` durante a transicao

Opcional para fase futura:

- backfill de registros historicos com base na instância de origem
- endurecer `projectId` para `NOT NULL` nas entidades operacionais mais importantes

Regra adicional:

- em ambiente de desenvolvimento, se o rollout parcial comprometer a consistencia, priorizar reset de banco e reseed em vez de manter compatibilidade temporaria

## Fora de Escopo

- Login/acesso proprio para o cliente da agencia
- Isolamento de permissao por projeto (quem pode ver o que por projeto)
- Relatorio por projeto (analytics avancado — PRD futuro)
- Billing por projeto (cobranca separada por projeto — PRD futuro)
- Limite de projetos por plano (pode ser adicionado depois no metering)

## Criterios de Aceite

- agencia consegue criar, editar e deletar projetos
- agencia consegue associar uma instancia de WhatsApp a um projeto
- agencia consegue associar uma conta de Meta Ads a um projeto
- dashboard permite filtrar por projeto
- instancias sem projeto associado continuam funcionando normalmente
- delete de projeto com instancias associadas retorna erro claro ou exige confirmacao

## Metricas de Sucesso

- `project_created` (evento analitico)
- `whatsapp_instance_associated_to_project`
- `meta_account_associated_to_project`
- % de instancias com projeto associado (indica adocao do conceito)

## Dependencias

- Nenhuma. Este PRD nao depende de outros PRDs abertos.
- E pre-requisito para `20_PRD_CUSTOMER_ONBOARDING_CONVERSION.md` (onboarding leve inclui criacao do primeiro Projeto)

## Fases de Implementacao

### Fase 1. Schema e servicos

- Adicionar modelo `Project` ao schema Prisma
- Adicionar `projectId?` em `WhatsAppConfig` e `MetaAdAccount`
- Criar migration
- Implementar `project.service.ts` com CRUD
- Implementar rotas de API

### Fase 2. UI de gestao

- Tela de listagem de projetos (`/dashboard/projects`) em `Server Component`
- `loading.tsx` com skeleton estavel
- Formulario de criacao/edicao
- Associacao de instancias ao projeto (editar instancia existente)
- listagem paginada desde o primeiro contrato
- `useInfiniteQuery` apenas para interacao incremental do client, nao para bootstrap inicial da pagina

### Fase 3. Integracao com dashboard

- Adicionar `project-selector.tsx` como filtro nas telas principais
- Tela de detalhe do projeto com instancias e resumo em `Server Component`
- leitura agregada por service server-side

## Riscos e Trade-offs

- Nao introduzir isolamento de acesso por projeto neste PRD — manter simples
- `projectId` vai tocar varias entidades operacionais; exige revisao cuidadosa de create paths e filtros
- `Conversation` e `Message` continuarem derivados na fase 1 reduz impacto, mas mantem parte da complexidade de join
- Delete com SetNull e mais seguro que Cascade para nao perder dados historicos
