# Project Implementation Review

Data: 2026-03-14

## Objetivo

Documentar a implementacao atual do dominio `project` no app, com foco em:

- logica de negocio
- relacionamentos de dados
- fluxo entre schema, service, route e UI
- regras explicitas e implicitas
- inconsistencias arquiteturais
- riscos funcionais e de seguranca

Este documento consolida a depuracao feita sobre a implementacao atual, sem propor compatibilidade legada e sem alterar o comportamento do sistema neste momento.

## Escopo Analisado

Arquivos centrais do dominio:

- `prisma/schema.prisma`
- `src/schemas/projects/project-schemas.ts`
- `src/services/projects/project.service.ts`
- `src/server/project/get-current-project-id.ts`
- `src/server/project/project-scope.ts`
- `src/app/api/v1/projects/route.ts`
- `src/app/api/v1/projects/[projectId]/route.ts`
- `src/app/api/v1/projects/current/route.ts`
- `src/app/dashboard/projects/page.tsx`
- `src/app/dashboard/projects/[projectId]/page.tsx`
- `src/components/dashboard/projects/project-list.tsx`
- `src/components/dashboard/projects/project-form-dialog.tsx`
- `src/components/dashboard/projects/project-selector.tsx`
- `src/components/dashboard/projects/project-detail.tsx`

Arquivos correlatos revisados para validar impacto lateral:

- `src/components/dashboard/sidebar/sidebar-client.tsx`
- `src/hooks/ui/use-crud-infinite-query.ts`
- `src/lib/api-client.ts`
- `src/server/auth/validate-organization-access.ts`
- `src/server/auth/require-workspace-page-access.ts`
- `src/services/billing/billing-subscription.service.ts`
- `src/services/whatsapp/whatsapp-config.service.ts`
- `src/services/meta-ads/ad-account.service.ts`
- `src/services/meta-ads/meta-account-query.service.ts`
- `src/services/onboarding/welcome-query.service.ts`

## Resumo Executivo

O dominio `project` ja existe como um modulo completo, com modelagem Prisma, validacao Zod, service CRUD, rotas HTTP, pagina de listagem, pagina de detalhe e integracao com outros dominios.

Hoje ele cumpre tres papeis ao mesmo tempo:

1. entidade organizacional para representar um cliente operacional da agencia
2. escopo ativo do dashboard para filtrar dados em outros dominios
3. unidade de contabilizacao para billing e limites do trial

O problema principal nao e ausencia de implementacao. O problema principal e que o dominio ficou estrutural demais para continuar tratado como um CRUD simples. O acoplamento com billing, integracoes e escopo de leitura ja exige garantias de autorizacao, consistencia transacional e invalidacao de estado que a implementacao atual ainda nao entrega.

## Mapa Atual do Dominio

## 1. Modelagem de Dados

O modelo Prisma e o seguinte:

- `Project` pertence a uma `Organization`
- `Project` possui `name`
- existe `@@unique([organizationId, name])`
- existe `@@index([organizationId])`

Relacoes diretas do projeto:

- `leads`
- `tickets`
- `sales`
- `items`
- `itemCategories`
- `whatsappConfigs`
- `metaAdAccounts`

Observacoes importantes:

- as relacoes usam `projectId` nas tabelas filhas
- varias dessas relacoes estao configuradas com `onDelete: SetNull`
- isso significa que projeto nao e raiz forte de consistencia; ele e um eixo de agrupamento opcional para outros registros

Conclusao:

`Project` funciona mais como um "workspace operacional por cliente" do que como um agregado de dominio forte. O sistema aceita desassociar dados do projeto sem remover os dados filhos.

## 2. Schemas e Contratos

O dominio possui schemas Zod bem definidos em `src/schemas/projects/project-schemas.ts`.

Contratos identificados:

- listagem paginada com `page`, `pageSize` e `query`
- criacao com `name`
- atualizacao parcial com `name`
- exclusao com `force`
- atualizacao do projeto atual com `projectId`
- resposta de listagem com `items`, `total`, `page`, `pageSize`, `totalPages`
- resposta detalhada com contadores agregados e integracoes associadas

Pontos positivos:

- os schemas estao centralizados corretamente
- a listagem e paginada
- o service devolve formato consistente com o schema

Pontos de atencao:

- `pageSize` maximo no schema e `50`
- alguns consumidores client-side nao respeitam esse limite

## 3. Service Layer

O modulo `src/services/projects/project.service.ts` concentra:

- listagem
- criacao
- detalhe
- atualizacao
- exclusao

### 3.1 Listagem

`listProjects`:

- constroi `where` por `organizationId` e busca textual por nome
- executa `findMany` e `count` em paralelo
- usa `select` minimo
- mapeia `_count` para contadores de associacoes

Esse trecho esta alinhado com o padrao esperado de CRUD paginado.

### 3.2 Criacao

`createProject`:

- valida limite de trial via `assertProjectCreationAllowed`
- verifica unicidade de nome via leitura previa
- cria projeto
- chama `syncOrganizationSubscriptionItems`
- retorna objeto mapeado

Aqui aparece o primeiro acoplamento forte do dominio: criar projeto impacta billing.

### 3.3 Detalhe

`getProjectById`:

- busca projeto por `organizationId + projectId`
- carrega contadores, instancias de WhatsApp e contas Meta Ads
- calcula `conversionCount` contando eventos de conversao a partir dos tickets do projeto
- calcula `aiCreditsUsed` agregando `aiInsightCost`

Esse metodo e funcionalmente rico, mas mistura:

- leitura do projeto
- leitura de CRM
- leitura de marketing
- leitura de custo de IA

Ou seja, o detalhe do projeto ja virou uma tela composta de varios subdominios.

### 3.4 Atualizacao

`updateProject`:

- valida existencia do projeto na organizacao
- verifica unicidade do nome
- atualiza somente campos enviados
- retorna resumo do projeto

Fluxo simples, mas com a mesma fragilidade de unicidade por leitura previa.

### 3.5 Exclusao

`deleteProject`:

- verifica existencia
- calcula se existem associacoes
- se houver associacoes e `force` nao estiver ativo, retorna conflito
- se `force` estiver ativo, faz `updateMany` em todos os dominios filhos e depois apaga o projeto
- chama `syncOrganizationSubscriptionItems`

Essa e a operacao mais sensivel do dominio:

- afeta billing
- afeta CRM
- afeta catalogo
- afeta WhatsApp
- afeta Meta Ads

Na pratica, excluir um projeto e uma operacao administrativa de alto impacto, nao uma mutacao simples de CRUD.

## 4. Escopo Ativo de Projeto

O projeto tambem funciona como "escopo ativo" do dashboard.

Arquivos envolvidos:

- `src/server/project/get-current-project-id.ts`
- `src/server/project/project-scope.ts`
- `src/app/api/v1/projects/current/route.ts`

### 4.1 Resolucao do projeto atual

`getCurrentProjectId` tenta resolver o projeto por esta ordem:

1. header `x-project-id`
2. cookie `x-project-id`
3. fallback `null`

Em ambos os casos ele valida se o projeto realmente pertence a `organizationId`.

### 4.2 Uso desse escopo

`resolveProjectScope`:

- se receber `projectId` explicito, valida pertencimento e usa esse valor
- se nao receber, tenta usar o projeto atual do cookie/header

Outros dominios reutilizam isso para filtrar dados ou validar associacoes:

- leads
- tickets
- sales
- items
- item-categories

Conclusao:

`project` nao e apenas uma entidade de gestao. Ele ja funciona como uma dimensao global de contexto do produto.

## 5. UI Atual

## 5.1 Pagina de Listagem

`/dashboard/projects`:

- nasce em `src/app/dashboard/projects/page.tsx`
- renderiza `ProjectList` dentro de `Suspense`
- `ProjectList` e um client component
- a listagem inicial vem de `useCrudInfiniteQuery`

Isso significa que a rota depende de bootstrap client-side para o primeiro payload relevante.

### 5.2 Pagina de Detalhe

`/dashboard/projects/[projectId]`:

- e server component
- usa `getProjectById` no servidor
- entrega um `ProjectDetailView` client

Esse fluxo esta mais alinhado com o padrao server-first do projeto.

### 5.3 Modal/Drawer de formulario

`ProjectFormDialog`:

- usa `react-hook-form`
- usa `projectCreateSchema` como resolver
- reseta o form via `useEffect`
- envia `POST` ou `PATCH` para a API

Funciona, mas entra em conflito com a regra local que proibe `useEffect` para sincronizar form state derivado.

### 5.4 Selector reutilizavel

`ProjectSelector`:

- pode receber projetos por props
- se nao receber, busca `/api/v1/projects`
- e reutilizado no sidebar, Meta Ads e WhatsApp

Esse componente e um ponto de acoplamento importante porque ele liga o dominio `project` a fluxos de integracao e navegacao.

## 6. Regras de Negocio Identificadas

Regras explicitas e implicitas encontradas:

1. nome do projeto deve ser unico por organizacao
2. projeto pertence sempre a uma organizacao
3. trial local so permite 1 projeto ativo
4. trial local so permite 1 numero de WhatsApp conectado por projeto
5. trial local so permite 1 conta Meta Ads ativa por projeto
6. projeto pode ser excluido sem apagar registros filhos, desde que eles sejam desassociados
7. projeto atual do usuario e persistido em cookie
8. varios modulos usam projeto atual como filtro implicito
9. dashboard usa projeto como representacao de cliente operacional

## 7. Achados Detalhados

## Achado 1. Mutacoes de projeto podem concluir no banco e mesmo assim responder erro

Severidade: critica

Arquivos:

- `src/services/projects/project.service.ts`
- `src/services/billing/billing-subscription.service.ts`
- `src/app/api/v1/projects/route.ts`
- `src/app/api/v1/projects/[projectId]/route.ts`

### O que acontece

Em `createProject`, o projeto e persistido antes da sincronizacao com billing.

Em `deleteProject`, a exclusao real acontece antes da sincronizacao com billing.

Se `syncOrganizationSubscriptionItems` falhar:

- o banco ja foi alterado
- a route captura a excecao
- o usuario recebe `500`

### Impacto

- o frontend pode informar falha mesmo quando a operacao ja aconteceu
- o usuario pode tentar repetir a acao e gerar comportamento confuso
- billing e UI podem ficar momentaneamente inconsistentes
- a confianca do operador na tela cai, porque a resposta HTTP nao representa o estado real

### Causa raiz

O dominio `project` esta acoplado a uma sincronizacao secundaria, mas sem estrategia transacional clara entre:

- persistencia local
- recalc de itens de assinatura
- eventual sincronizacao com provider

### Recomendacao

Separar persistencia local de sincronizacao de billing. O minimo aceitavel seria:

- tratar erro de regra de trial como erro de negocio, nao `500`
- decidir se sincronizacao de billing e bloqueante ou assicrona
- impedir resposta de erro generica quando a mutacao principal ja foi concluida

## Achado 2. O CRUD de projeto esta sem protecao RBAC granular

Severidade: alta

Arquivos:

- `src/app/api/v1/projects/route.ts`
- `src/app/api/v1/projects/[projectId]/route.ts`
- `src/app/dashboard/projects/page.tsx`
- `src/app/dashboard/projects/[projectId]/page.tsx`
- `src/components/dashboard/sidebar/sidebar-client.tsx`

### O que acontece

As rotas de projeto usam `validateFullAccess`, que so valida:

- autenticacao
- membership na organizacao

Elas nao exigem permissao especifica para:

- listar projetos
- criar projeto
- editar projeto
- excluir projeto

As paginas tambem nao usam `requireWorkspacePageAccess`.

Ao mesmo tempo, o sidebar tenta esconder `/dashboard/projects` com base em `view:leads`, o que mostra que existe uma expectativa de autorizacao no frontend.

### Impacto

Qualquer membro autenticado pode:

- criar projetos
- alterar nomes
- trocar contexto operacional do workspace
- excluir projetos
- forcar desassociacao de dados operacionais

Isso e especialmente grave porque excluir projeto mexe em varios dominios.

### Causa raiz

O dominio foi implementado como CRUD administrativo, mas a camada de autorizacao nao acompanhou sua importancia sistemica.

### Recomendacao

Definir explicitamente o contrato de permissao para `project`.

Exemplos possiveis:

- `view:projects` e `manage:projects`
- ou reaproveitar uma permissao existente de forma consistente em API, page e sidebar

O que nao pode continuar:

- sidebar com uma regra
- page sem regra
- API sem regra

## Achado 3. O seletor de projetos esta chamando a API com contrato invalido

Severidade: alta

Arquivos:

- `src/components/dashboard/projects/project-selector.tsx`
- `src/schemas/projects/project-schemas.ts`
- `src/components/dashboard/meta-ads/settings/meta-ads-settings-content.tsx`
- `src/components/dashboard/whatsapp/settings/overview-view.tsx`

### O que acontece

O `ProjectSelector` faz:

- `GET /api/v1/projects?page=1&pageSize=100`

Mas o schema da API aceita no maximo:

- `pageSize <= 50`

Em telas onde o componente nao recebe `projects` por props, ele depende desse fetch.

### Impacto

O seletor pode falhar silenciosamente nas telas de:

- Meta Ads
- WhatsApp

Resultado pratico:

- lista vazia
- impossibilidade de associar projeto
- fluxo quebrado de integracao

### Causa raiz

O componente reutilizavel foi implementado assumindo que "carregar tudo" era aceitavel, mas a API do proprio dominio impoe paginacao defensiva.

### Recomendacao

Corrigir o consumidor para obedecer o contrato da API.

Opcoes seguras:

- usar `pageSize=50`
- ou trocar o componente para receber lista pre-carregada do servidor quando for contexto read-heavy

## Achado 4. A listagem pode ficar stale depois de criar, editar ou excluir

Severidade: media/alta

Arquivos:

- `src/components/dashboard/projects/project-list.tsx`
- `src/hooks/ui/use-crud-infinite-query.ts`

### O que acontece

A listagem usa React Query via `useCrudInfiniteQuery`.

Depois das mutacoes, o codigo chama:

- `router.refresh()`

Mas nao chama:

- `queryClient.invalidateQueries(...)`

Como a rota de listagem nasce toda no client e o dado vem da query client-side, `router.refresh()` nao garante que a cache da query seja invalidada.

### Impacto

O usuario pode:

- criar projeto e nao ver na lista
- editar projeto e continuar vendo o nome antigo
- excluir projeto e continuar vendo o item ate novo refetch

### Causa raiz

Foi misturado:

- invalidacao de server components
- cache client-side via React Query

Sem uma estrategia unica.

### Recomendacao

Mutacoes desse modulo devem invalidar a query de `projects` explicitamente.

`router.refresh()` pode continuar existindo se houver partes server-side relevantes, mas nao deve ser o unico mecanismo.

## Achado 5. A rota de listagem de projetos foge do padrao server-first adotado pelo repo

Severidade: media

Arquivos:

- `src/app/dashboard/projects/page.tsx`
- `src/components/dashboard/projects/project-list.tsx`

### O que acontece

A pagina principal de projetos:

- nao entrega payload inicial do servidor
- depende de bootstrap client-side
- usa `Suspense` para um componente client que ainda vai iniciar a query depois

No contexto deste repo, isso entra em conflito com a diretriz local para dashboard read-heavy.

### Impacto

- pior primeiro paint funcional
- mais acoplamento com cache client-side
- mais dificuldade para tornar a tela consistente apos mutacoes

### Causa raiz

O modulo `projects` foi implementado como tela client-heavy, enquanto a convencao do projeto evoluiu para server-first.

### Recomendacao

Refatorar a rota para:

- carregar a primeira pagina no servidor
- usar client apenas para interacao local, mutacao e carregamento incremental

## Achado 6. O formulario usa `useEffect` para sincronizar estado derivado

Severidade: media

Arquivos:

- `src/components/dashboard/projects/project-form-dialog.tsx`

### O que acontece

O formulario faz reset do estado quando `project` ou `open` mudam, usando `useEffect`.

### Impacto

- viola a regra local do projeto
- aumenta risco de sobrescrever estado do usuario
- dificulta previsibilidade da abertura/fechamento do drawer

### Causa raiz

O componente foi construido no padrao classico de formulario client-side, sem adaptar para a convencao local de usar `key` para resincronizar formularios.

### Recomendacao

Trocar a resincronizacao baseada em effect por estrategia declarativa com `key`.

## Achado 7. A regra de unicidade do nome esta incompleta

Severidade: media

Arquivos:

- `src/services/projects/project.service.ts`
- `prisma/schema.prisma`

### O que acontece

A validacao de unicidade hoje e feita por leitura previa:

- busca `findFirst`
- se nao encontrar, tenta gravar

Isso deixa duas lacunas:

1. corrida concorrente entre requests
2. ambiguidade de case, porque a regra atual nao normaliza `Cliente Acme` e `cliente acme`

### Impacto

- mensagens erradas para usuario em concorrencia
- potencial `500` vindo do banco em vez de `409`
- duplicidade semantica de projetos

### Causa raiz

Existe regra de negocio de unicidade, mas a implementacao depende de pre-check aplicativo sem fechamento transacional ou tratamento do erro de constraint.

### Recomendacao

Tratar o erro de unique constraint do banco e decidir explicitamente se a unicidade deve ser case-insensitive.

## Achado 8. Existem regras inconsistentes sobre projeto ativo

Severidade: media

Arquivos:

- `src/server/project/get-current-project-id.ts`
- `src/services/onboarding/welcome-query.service.ts`
- `src/app/dashboard/layout.tsx`

### O que acontece

Em alguns fluxos, quando nao ha projeto ativo valido:

- o sistema fica com `null`

Em outros:

- faz fallback para o primeiro projeto da organizacao

Exemplo:

- `welcome-query.service` usa fallback para o primeiro projeto
- `dashboard/layout.tsx` nao faz esse fallback

### Impacto

- comportamento inconsistente entre telas
- dificuldade para entender se "sem projeto ativo" e estado valido do produto ou apenas ausencia de inicializacao

### Causa raiz

Nao existe uma regra unica e documentada para resolucao do projeto ativo.

### Recomendacao

Definir uma politica unica:

- ou sempre aceitar `null`
- ou sempre escolher um projeto padrao quando houver ao menos um projeto disponivel

## 8. Cobertura de Testes Atual

Testes encontrados para o dominio:

- `src/services/projects/__tests__/project.service.test.ts`
- `src/schemas/projects/__tests__/project-schemas.test.ts`

Cobertura atual:

- listagem paginada
- criacao basica
- conflito de exclusao sem `force`
- exclusao forcada
- rename com conflito
- parse de schemas

Lacunas importantes:

- nenhuma cobertura de route
- nenhuma cobertura de RBAC
- nenhuma cobertura do projeto ativo
- nenhuma cobertura de `ProjectSelector`
- nenhuma cobertura de falha em billing sync
- nenhuma cobertura de comportamento client apos mutation

Conclusao:

Os testes atuais validam o service isolado, mas nao cobrem os pontos mais arriscados da implementacao real.

## 9. Diagnostico Arquitetural

O dominio `project` esta num ponto intermediario:

- mais complexo que um CRUD administrativo
- ainda nao tratado como modulo estrutural de contexto

Sinais claros disso:

- participa de billing
- participa de navegacao
- participa de filtragem global
- participa de integracoes
- participa de regras de trial

Enquanto isso, a implementacao ainda assume padroes de CRUD simples em pontos criticos:

- autorizacao
- invalidacao de cache
- sincronizacao lateral
- comportamento de fallback

## 10. Ordem Recomendada de Correcao

### Fase 1. Confiabilidade e seguranca

1. fechar contrato de permissao do dominio `project`
2. aplicar guard consistente em page, API e sidebar
3. corrigir o fluxo de erro nas mutacoes acopladas a billing
4. corrigir `ProjectSelector` para obedecer o schema da API

### Fase 2. Consistencia funcional

1. invalidar React Query corretamente apos mutacoes
2. definir regra unica para projeto ativo
3. tratar unicidade de nome no nivel certo

### Fase 3. Alinhamento arquitetural

1. mover listagem para estrategia server-first
2. remover `useEffect` do formulario
3. revisar bootstrap da tela para seguir o pacote de performance do projeto

## 11. Conclusao

O modulo `project` nao esta "faltando implementacao". Ele esta implementado, mas com maturidade desigual entre as camadas.

O modelo de dados e o service base estao razoavelmente claros. O que esta errado hoje nao e o conceito do dominio, e sim a falta de endurecimento nas bordas:

- autorizacao
- consistencia de mutacao
- contrato entre API e consumidores
- sincronizacao com billing
- alinhamento com o padrao arquitetural do repo

Em resumo:

- a base existe
- a direcao funcional faz sentido
- os maiores problemas estao nas garantias, nao no CRUD em si

## 12. Validacao Executada

Comando executado:

```bash
npm exec vitest run src/services/projects/__tests__/project.service.test.ts src/schemas/projects/__tests__/project-schemas.test.ts
```

Resultado:

- 2 arquivos de teste passaram
- 10 testes passaram

