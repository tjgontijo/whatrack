# Regras

## Escopo e diffs

- Manter diff minimo e focado no pedido.
- Evitar refatoracao ampla sem necessidade objetiva.
- Preservar padroes existentes de estrutura e nomenclatura.

## Arquitetura

- Priorizar componentes server por padrao; usar `"use client"` somente quando necessario.
- Proibido introduzir `useEffect`/`useLayoutEffect` para fluxo de dados, orquestracao de tela ou sincronizacao de estado derivado.
- Para efeitos de dados/fluxo, usar Server Components, Server Actions e composicao de props.
- Handlers de API devem ser enxutos: autenticar, validar, delegar, responder. Nada mais.
- Toda logica de negocio, query Prisma e cache pertencem a `src/services/` ou `src/server/`.
- Padrao estrutural global: para codigo de dominio, usar sempre `src/<camada>/<dominio>/...` em todas as camadas aplicaveis.
- Proibido criar arquivo de dominio em formato flat na raiz da camada (ex: `src/services/foo.service.ts`).
- Em componentes React, feature de dashboard deve viver em `src/components/dashboard/[dominio]/...`.
- Proibido criar pasta de dominio de dashboard direto em `src/components/<dominio>/...`.
- Reutilizar utilitarios existentes em `src/lib/`, `src/hooks/`, `src/schemas/` antes de criar novos.
- Schemas Zod novos sempre em `src/schemas/[dominio]/` — unico local permitido.
- Evitar duplicacao de regras de negocio; centralizar em servicos.

## Dashboard Read-Heavy: Regra Server-First

- Paginas de dashboard com leitura inicial predominante e interacoes pontuais DEVEM ser implementadas como `Server Component` por padrao.
- O primeiro render dessas paginas nao deve depender de multiplas `useQuery` client-side para compor o layout principal.
- Quando a tela precisar de varios blocos de dados para o primeiro paint, agregar a leitura em um service server-side e passar o resultado por props.
- Componentes client nessas paginas devem cuidar de:
  - formularios locais;
  - mutations;
  - refresh localizado;
  - estados efemeros de UI.
- Para loading inicial, preferir `app/.../loading.tsx` com skeleton estavel da rota.
- `TanStack Query` continua obrigatorio no client, mas nao deve ser usado para bootstrapar pagina read-heavy que pode nascer pronta do servidor.

## Client-Side Data Fetching (Inegociavel)

### TanStack Query — Regras de Uso

- **Todo fetch client-side DEVE usar TanStack Query** (`useQuery`, `useInfiniteQuery`, `useMutation`).
- Proibido `fetch()` avulso dentro de `useEffect` — sempre encapsular em `queryFn`.
- Proibido `cache: 'no-store'` em fetch client-side. Essa opcao so tem efeito no fetch do Next.js em Server Components. Em client components, a freshness e controlada exclusivamente por `staleTime` e `gcTime` do TanStack Query.
- Proibido `setInterval`/`setTimeout` para polling de dados. Usar `refetchInterval` do TanStack Query.

### QueryKey — Regras de Composicao

- Toda variavel usada dentro de `queryFn` DEVE estar representada na `queryKey`.
- `organizationId` DEVE estar presente na `queryKey` de toda query que depende de contexto de org.
- Estrutura padrao: `[dominio, { ...filtros, organizationId }]`.
- Queries que dependem de valores async (ex: `organizationId`) DEVEM usar `enabled: !!valor`.

```typescript
// CORRETO
queryKey: ['ticket-stages', { organizationId }],
queryFn: () => fetch(`/api/v1/ticket-stages`, { headers: { [ORGANIZATION_HEADER]: organizationId } }),
enabled: !!organizationId,

// ERRADO — organizationId ausente da queryKey
queryKey: ['ticket-stages'],
queryFn: () => fetch(`/api/v1/ticket-stages`, { headers: { [ORGANIZATION_HEADER]: organizationId } }),
```

### ORGANIZATION_HEADER — Regra de Transporte

- Todo fetch client-side para endpoint que exige contexto de organizacao DEVE incluir `[ORGANIZATION_HEADER]: organizationId` nos headers.
- Importar de `@/lib/constants/http-headers`.
- Nunca depender de cookie ou session implicita no client — sempre explicitar o header.

### Configuracao Padrao de Queries

- `refetchOnWindowFocus: false` — ja configurado globalmente no QueryClient. Nao sobrescrever com `true`.
- `staleTime` — definir valor adequado ao dominio:
  - Dados de referencia (stages, roles, plans): `5 * 60 * 1000` (5 min)
  - Dados operacionais (tickets, messages): `30 * 1000` (30 seg)
  - Dados em tempo real (sync status): `5 * 1000` (5 seg)
  - Dados de sessao (auth, org): `Infinity` (invalida manualmente)
- `refetchInterval` — usar apenas para dados que mudam sem acao do usuario (ex: sync status). Preferir invalidacao explicita via `queryClient.invalidateQueries()` apos mutations.

## Pacote de Performance (Dashboard e CRUD)

### GET de listagem

- Toda rota GET de listagem DEVE expor paginacao explicita:
  - pagina numerada: `page` + `pageSize`
  - ou cursor: `cursor` + `limit`
- Proibido endpoint de listagem retornar dataset inteiro sem controle.
- Padrao recomendado de retorno:
  - pagina numerada: `{ items, total, page, pageSize }`
  - cursor: `{ items, nextCursor }`
- Definir limites de pagina no schema Zod (`pageSize`/`limit` com maximo defensivo).
- Em service, usar `select` minimo e evitar `include` amplo.
- Para pagina numerada, executar `findMany` e `count` em paralelo quando necessario.

### Auth e leitura (read-only)

- Caminho de leitura (GET e guard de autorizacao para leitura) deve ser read-only.
- Proibido qualquer escrita em banco no caminho critico de leitura (ex: sincronizacao de role, update de perfil, lastSeen implicito).
- Se sincronizacao for necessaria, mover para fluxo dedicado fora de GET.

### Client de dashboard

- Listagens de dashboard/CRUD devem usar `useInfiniteQuery` por padrao.
- Proibido loop sequencial de prefetch para carregar "tudo" no mount.
- Para volume medio/alto, usar virtualizacao com `react-virtuoso` (ou componente equivalente ja padronizado no projeto).
- Busca textual deve usar `useDeferredValue` com threshold minimo de 3 caracteres, salvo requisito funcional explicito.
- Query keys devem incluir todos os filtros que impactam o resultado (incluindo busca e ordenacao).

### QueryClient (defaults de performance)

- Para dashboard/admin, manter defaults:
  - `staleTime: 5 * 60 * 1000`
  - `gcTime: 10 * 60 * 1000`
  - `refetchOnWindowFocus: false`
  - `refetchOnMount: false`
  - `refetchOnReconnect: false`
- Evitar sobrescrever esses defaults sem justificativa tecnica.

### Observabilidade minima

- Em endpoint de lista critico, registrar metrica de latencia (P50/P95) no monitoramento disponivel.
- Antes/depois de otimizar, comparar TTFR do client e latencia do GET para comprovar ganho.

## useEffect — Usos Permitidos vs Proibidos

### Proibido (alternativa obrigatoria)

| Padrao Proibido | Alternativa |
|----------------|-------------|
| `useEffect` para fetch de dados | `useQuery` / `useInfiniteQuery` |
| `useEffect` para sincronizar form state de query | `key` prop no form/componente (ex: `key={item?.id ?? 'new'}`) |
| `useEffect` para computar estado derivado | Calcular inline no render: `const x = data?.field ?? fallback` |
| `useEffect` para redirect condicional | `src/proxy.ts` (server-side) ou callback em `onSuccess` |
| `useEffect` + `setInterval` para polling | `refetchInterval` do TanStack Query |
| `useEffect` + `setInterval` para popup closed | `window.addEventListener('focus', ...)` |
| `useEffect` para debounce de input | `useDeferredValue` (React 19) |
| `useEffect` para limpar estado apos mutation | Callback `onSuccess` / `onSettled` da mutation |

### Permitido (sincronizacao com APIs externas do browser)

| Padrao Permitido | Motivo |
|-----------------|--------|
| Event listeners DOM (`keydown`, `scroll`, `resize`) | Sincronizacao com browser API |
| `MediaQuery` listeners | Sincronizacao com browser API |
| `IntersectionObserver` / `ResizeObserver` | Sincronizacao com browser API |
| Scroll programatico (`scrollIntoView`) | Imperativo DOM |
| Focus management (`element.focus()`) | Imperativo DOM |
| Integracao com lib externa (Embla, etc) | API de terceiro |
| Hydration guard (`mounted` state) | Necessidade tecnica React |

### Regra de Decisao

Antes de escrever `useEffect`, perguntar:
1. Estou buscando dados? → `useQuery`
2. Estou derivando estado de outro estado? → Computar inline
3. Estou sincronizando form com dados de query? → `key` prop
4. Estou reagindo a mudanca para redirecionar? → `proxy.ts` ou `onSuccess`
5. Estou ouvindo evento do browser? → **Unico caso permitido para useEffect**

## Polling e Timers

- Proibido `setInterval` para polling de dados. Usar `refetchInterval` do TanStack Query.
- Proibido `setInterval` para detectar popup fechado. Usar `window.addEventListener('focus', ...)`:

```typescript
// CORRETO — popup close detection
const onFocus = () => {
  if (popupRef.current?.closed) {
    window.removeEventListener('focus', onFocus)
    onComplete()
  }
}
window.addEventListener('focus', onFocus)

// ERRADO
const interval = setInterval(() => {
  if (popup.closed) { clearInterval(interval); onComplete() }
}, 500)
```

- `setTimeout` para UX intencional (ex: delay de redirect, reset de erro) e aceitavel com justificativa.
- Para debounce de input, usar `useDeferredValue` (React 19) em vez de `setTimeout` manual:

```typescript
// CORRETO
const [search, setSearch] = useState('')
const deferredSearch = useDeferredValue(search)
// usar deferredSearch nas queryKeys

// ERRADO
useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(search), 400)
  return () => clearTimeout(timer)
}, [search])
```

## Console.log em Producao

- Proibido `console.log` em codigo de producao. Remover antes da entrega.
- `console.error` em error boundaries e aceitavel.
- Para debug temporario, usar comentario `// TODO: remove debug log` e garantir remocao antes do commit.

## Compartilhamento entre dominios

- Proibido criar wrappers/aliases entre dominios apenas para reaproveitar regra.
- Quando a logica for comum a 2+ dominios, extrair para modulo neutro em `src/lib/` (utilitario puro) ou `src/services/shared/` (regra de negocio).
- Consumidores devem depender do modulo neutro diretamente; evitar camadas intermediarias sem valor funcional.
- Proibido criar wrappers sem valor funcional sobre utilitarios existentes (ex: funcao que apenas encapsula `NextResponse.json()` sem adicionar logica).

## Higiene de codigo

- Entrega bloqueada se restarem arquivos obsoletos apos refactor (modulos antigos, wrappers sem consumidor real, testes sem uso).
- Entrega bloqueada se restarem diretorios vazios apos mover/remover arquivos.
- Proibido manter codigo morto comentado sem justificativa.
- Em mudanca estrutural, verificar antes da entrega:
  - referencias antigas removidas nos caminhos afetados.
  - diretorios vazios removidos via `find src -type d -empty`.

## Anatomia de Route (regra critica)

Cada handler de route deve seguir exatamente esta estrutura, nesta ordem:

```
1. Autenticacao/autorizacao  → guard de acesso importado de src/server/
2. Parse de parametros       → schema.safeParse() com schema importado de src/schemas/
3. Delegacao ao servico      → await recursoService.metodo(params)
4. Resposta HTTP             → NextResponse.json() | apiError()
```

**O que NUNCA deve estar dentro de uma route:**
- Schemas Zod declarados inline (definir em `src/schemas/`)
- Queries Prisma diretas (delegar para service)
- Funcoes helper (datas, filtros, formatacao) — mover para `src/lib/`
- Logica de cache (mover para o service)
- Verificacoes de role manual apos o guard de acesso
- Estado compartilhado entre requests (Map, filas, variaveis de modulo)

**Tamanho esperado por handler:** ~30-50 linhas. Se ultrapassar, ha logica fora do lugar.

## Convencao de Nomenclatura

### Arquivos

| Tipo                      | Padrao                   | Exemplo                                              |
|---------------------------|--------------------------|------------------------------------------------------|
| Route handler             | `route.ts`               | `src/app/api/v1/leads/route.ts`                      |
| Service                   | `[recurso].service.ts`   | `src/services/leads/lead.service.ts`                 |
| Scheduler                 | `[recurso].scheduler.ts` | `src/services/ai/ai.scheduler.ts`                    |
| Handler (webhook/evento)  | `[tipo].handler.ts`      | `src/services/whatsapp/handlers/message.handler.ts`  |
| Schema Zod                | `[recurso]-schemas.ts`   | `src/schemas/tickets/ticket-schemas.ts`              |
| Hook React                | `use-[recurso].ts`       | `src/hooks/organizations/use-organization.ts`        |
| Componente dashboard      | `kebab-case.tsx`         | `client-leads-table.tsx`                             |
| Componente landing        | `PascalCase.tsx`         | `LandingHero.tsx`                                    |
| Utilitario puro           | `[funcao].ts`            | `src/lib/date/date-range.ts`                         |
| Tipo TypeScript           | `[recurso].ts`           | `src/types/tickets/ticket.ts`                        |

### Diretorios e co-localizacao

- Componentes de dashboard: sempre em `src/components/dashboard/[dominio]/`.
- Nao criar `src/components/<dominio>/` para dominio do dashboard; mover para `src/components/dashboard/[dominio]/`.
- `src/components/` raiz deve ser reservado para compartilhados/transversais (ex: `ui`, `data-table`, `landing`, `onboarding` e utilitarios globais).
- Componentes exclusivos de uma rota: aceitos em `src/app/dashboard/[rota]/components/` se nao reutilizados.
- Tipos compartilhados: `src/types/[dominio]/[recurso].ts`.
- Schemas Zod: `src/schemas/[dominio]/[recurso]-schemas.ts`.

## Convencao Next.js

- Usar `src/proxy.ts` para interceptacao de requests no nivel de framework.
- Nunca criar `src/middleware.ts` neste projeto.
- Se o pedido mencionar "middleware", interpretar como alteracao em `src/proxy.ts`.

## Tipagem e validacao

- TypeScript estrito: proibido `any` em services e funcoes de dominio critico.
- Schemas Zod obrigatorios para todo input de API (body e query params).
- Declarar tipos de retorno explicitamente em funcoes de service.
- Inferir tipos de schemas Zod com `z.infer<typeof schema>` ao inves de redeclarar manualmente.
- Schemas Zod ficam exclusivamente em `src/schemas/[dominio]/` — nunca inline em routes, services ou componentes.
- Nao implementar OpenAPI/Swagger neste projeto Next.js — a API publica migrara para Fastify (monorepo futuro), que tem suporte nativo via `@fastify/swagger`. Os schemas Zod em `src/schemas/` serao reaproveitados na migracao.

## Dados e Prisma

- Queries Prisma pertencem exclusivamente a `src/services/` ou `src/server/`.
- Nunca query inline em route handler.
- Usar `prisma.$transaction` quando multiplas operacoes precisam ser atomicas.
- Evitar `include` aberto; sempre usar `select` para limitar campos retornados.
- Quando tocar em persistencia, validar tambem cenarios de erro e dados vazios.

## Cache

- Padrao global: nao implementar cache manual em route.
- Cache (Redis ou similar): implementar no service, nunca na route, apenas quando houver evidencia de necessidade.
- Cache em memoria (Map, variaveis de modulo): proibido em routes e em escopo global de server.
- Usar `revalidateTag` na route apos mutacoes, nunca dentro do service.

## Autorizacao

- Usar guards de acesso importados de `src/server/auth/` — nunca replicar logica de verificacao inline.
- Usar guard com permissao granular (RBAC) para rotas que exigem permissao especifica.
- Usar guard de membership simples para rotas abertas a qualquer membro autenticado.
- Usar guard de admin/owner para rotas administrativas — nao redeclarar essa logica no handler.
- Nao adicionar verificacoes de role manual apos o guard: confiar no retorno de acesso.

## UI e UX

- Preservar design system e componentes compartilhados existentes.
- Evitar regressao visual em estados: loading, vazio, erro e sucesso.
- Tratar acessibilidade basica (labels, foco, aria quando aplicavel).

## Testes e validacao

- Regra obrigatoria: toda tarefa que altera comportamento deve criar ou atualizar pelo menos um teste.
- O teste criado/atualizado deve ser executado antes da entrega.
- Priorizar testes direcionados aos modulos impactados.
- Rodar validacoes proporcionais ao risco:
  - Mudanca pequena: testes direcionados.
  - Mudanca media: `npm run lint` + testes direcionados.
  - Mudanca ampla/estrutural: `npm run lint`, `npm run test`, `npm run build`.
  - Mudanca com impacto em Prisma: adicionar `npm run test:prisma`.
- Se nao rodar algum comando relevante, explicitar motivo no resultado final.

## Resposta final

- Informar o que foi alterado e por que.
- Listar arquivos alterados.
- Informar comandos executados e resultado.
- Registrar riscos pendentes ou suposicoes.
