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
