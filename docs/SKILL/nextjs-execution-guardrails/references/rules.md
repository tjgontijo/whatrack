# Regras

## Escopo e diffs

- Manter diff minimo e focado no pedido.
- Evitar refatoracao ampla sem necessidade objetiva.
- Preservar padroes existentes de estrutura e nomenclatura.

## Arquitetura

- Priorizar componentes server por padrao; usar `"use client"` somente quando necessario.
- Handlers de API devem ser enxutos: autenticar, validar, delegar, responder. Nada mais.
- Toda logica de negocio, query Prisma e cache pertencem a `src/services/` ou `src/server/`.
- Reutilizar utilitarios existentes em `src/lib/`, `src/hooks/`, `src/schemas/` antes de criar novos.
- Schemas Zod novos sempre em `src/schemas/[dominio]-schemas.ts` — unico local permitido.
- Evitar duplicacao de regras de negocio; centralizar em servicos.

## Compartilhamento entre dominios (anti-gambiarra)

- Proibido criar wrapper/alias entre dominios apenas para reaproveitar regra (ex: `team-*` chamando `organization-*`).
- Quando a regra for comum a 2+ dominios, extrair para modulo neutro em `src/lib/` (utilitario puro) ou `src/services/shared/` (regra de negocio).
- Consumidores devem depender do modulo neutro diretamente; evitar camadas intermediarias sem valor funcional.
- Antes de entregar, verificar se a nomenclatura do modulo compartilhado e generica (nao acoplada a um dominio especifico).

## Higiene de codigo (anti-lixo)

- Entrega bloqueada se restarem arquivos obsoletos apos refactor (modulos antigos, wrappers temporarios, testes antigos sem uso).
- Entrega bloqueada se restarem diretorios vazios apos mover/remover arquivos.
- Proibido manter codigo morto comentado ou aliases de compatibilidade sem consumidor real.
- Em mudanca estrutural, executar checagem de higiene antes da entrega:
  - referencias antigas removidas via `rg` nos caminhos afetados.
  - diretorios vazios removidos via `find src -type d -empty`.

## Anatomia de Route (regra critica)

Cada handler de route deve seguir exatamente esta estrutura, nesta ordem:

```
1. Autenticacao/autorizacao  → validatePermissionAccess() ou validateFullAccess()
2. Parse de parametros       → schema.safeParse() com schema importado de src/schemas/
3. Delegacao ao servico      → await recursoService.metodo(params)
4. Resposta HTTP             → NextResponse.json() | apiError()
```

**O que NUNCA deve estar dentro de uma route:**
- Schemas Zod declarados inline (definir em `src/schemas/`)
- Queries Prisma diretas (delegar para service, exceto acesso trivial de 1 campo sem logica)
- Funcoes helper (datas, filtros, formatacao) — mover para `src/lib/`
- Logica de cache (mover para o service)
- Verificacoes de role manual apos `validatePermissionAccess` (confiar no guard)
- `serialize()`, `Map` de cache ou qualquer estado compartilhado entre requests

**Tamanho esperado por handler:** ~30-50 linhas. Se ultrapassar, ha logica fora do lugar.

## Convencao de Nomenclatura

### Arquivos

| Tipo                    | Padrao                        | Exemplo                          |
|-------------------------|-------------------------------|----------------------------------|
| Route handler           | `route.ts`                    | `src/app/api/v1/leads/route.ts`  |
| Service                 | `[dominio].service.ts`        | `lead.service.ts`                |
| Scheduler               | `[dominio].scheduler.ts`      | `ai-classifier.scheduler.ts`     |
| Handler (webhook/event) | `[tipo].handler.ts`           | `message.handler.ts`             |
| Schema Zod              | `[dominio]-schemas.ts`        | `ticket-schemas.ts`              |
| Hook React              | `use-[dominio].ts`            | `use-organization.ts`            |
| Componente de pagina    | `kebab-case.tsx`              | `client-leads-table.tsx`         |
| Componente landing      | `PascalCase.tsx`              | `LandingHero.tsx`                |
| Utilitario puro         | `[funcao].ts`                 | `date-range.ts`                  |
| Constante               | `[dominio].ts`                | `ticket-statuses.ts`             |

### Diretorios e co-localizacao

- Componentes de dashboard: sempre em `src/components/dashboard/[dominio]/`.
- Componentes co-localizados na page (especificos de rota): aceitos em `src/app/dashboard/[rota]/components/` apenas se o componente nao for reutilizado em outro lugar.
- Tipos compartilhados de dominio: `src/types/[dominio].ts`.
- Schemas de validacao: `src/schemas/[dominio]-schemas.ts`.

## Convencao Next.js

- Usar `src/proxy.ts` para interceptacao de requests no lugar de middleware.
- Nunca criar `src/middleware.ts` neste projeto.
- Se o pedido mencionar "middleware", interpretar como alteracao em `src/proxy.ts`.

## Tipagem e validacao

- TypeScript estrito: proibido `any` em services e funcoes de dominio critico.
- Schemas Zod obrigatorios para todo input de API (body e query params).
- Declarar tipos de retorno explicitamente em funcoes de service.
- Inferir tipos de schemas Zod com `z.infer<typeof schema>` ao inves de redeclarar manualmente.
- Schemas Zod ficam exclusivamente em `src/schemas/[dominio]-schemas.ts` — nunca inline em routes, services ou componentes.
- Nao implementar OpenAPI/Swagger neste projeto Next.js — a API publica migrara para Fastify (monorepo futuro), que tem suporte nativo via `@fastify/swagger`. Os schemas Zod em `src/schemas/` serao reaproveitados na migracao.

## Dados e Prisma

- Queries Prisma pertencem exclusivamente a services (`src/services/`) ou server utils (`src/server/`).
- Nunca query inline em route handler (exceto acesso de 1 campo sem logica condicional).
- Usar `prisma.$transaction` quando multiplas operacoes precisam ser atomicas.
- Evitar `include` aberto; sempre usar `select` para limitar campos retornados.
- Quando tocar em persistencia, validar tambem cenarios de erro e dados vazios.

## Cache

- Padrao global: nao implementar cache manual em route.
- Cache Redis: implementar no service, nunca na route, e apenas quando houver evidencia de gargalo.
- Cache em memoria (Map): proibido em routes e em modulo de escopo global de server (risco de leak entre requests em serverless).
- Em listagens novas, o padrao inicial e sem cache manual; adicionar cache somente com justificativa tecnica.
- Usar `revalidateTag` no route apos mutacoes, nunca dentro do service.

## Autorizacao

- Usar sempre `validatePermissionAccess(req, 'permissao:recurso')` para rotas com RBAC granular.
- Usar `validateFullAccess(req)` para rotas que exigem apenas autenticacao + membership.
- Usar `validateAdminAccess(req)` para rotas restritas a owner/admin — nao redeclarar essa logica no handler.
- Nao adicionar verificacoes de role manual apos o guard: confiar no retorno `hasAccess`.

## UI e UX

- Preservar design system e componentes compartilhados existentes.
- Evitar regressao visual em estados: loading, vazio, erro e sucesso.
- Tratar acessibilidade basica (labels, foco, aria quando aplicavel).

## Testes e validacao

- Regra obrigatoria de entrega: toda tarefa que altera comportamento deve criar ou atualizar pelo menos um teste automatizado.
- O teste criado/atualizado deve ser executado antes da entrega (entrega bloqueada sem execucao de teste).
- Priorizar testes direcionados aos modulos impactados.
- Rodar validacoes proporcionais ao risco:
  - Mudanca pequena: testes direcionados.
  - Mudanca media: `npm run lint` + testes direcionados.
  - Mudanca ampla/estrutural: `npm run lint`, `npm run test`, `npm run build`.
  - Mudanca com impacto em Prisma: adicionar `npm run test:prisma` (complementar, nao substituto).
- Se nao rodar algum comando relevante, explicitar motivo no resultado final.

## Resposta final

- Informar o que foi alterado e por que.
- Listar arquivos alterados.
- Informar comandos executados e resultado.
- Registrar riscos pendentes ou suposicoes.
