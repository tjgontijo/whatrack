# PRD - Adequacao Total as Skills (API v1)

**Status:** Em execucao (adequacao estrutural concluida)  
**Data:** 2026-02-26  
**Escopo:** `src/app/api/v1` + camadas `src/services`, `src/schemas`, `src/server` relacionadas

---

## 1. Objetivo

Concluir a adequacao de todos os dominios da API v1 ao padrao da skill `nextjs-execution-guardrails`, com foco em:

1. route handlers enxutos (`auth -> parse -> service -> response`);
2. zero Prisma direto em route;
3. zero schema Zod inline em route;
4. zero cache/manual state em route;
5. zero compatibilidade legada no `src/`;
6. teste criado/atualizado e executado antes de cada entrega.

---

## 2. Decisoes Nao Negociaveis

1. Projeto greenfield: proibido manter compatibilidade legada no `src/` (`legacy*`, `team*`, `x-team-id`, `teamId`, `teamType`, `manage:team_*`).
2. Schemas Zod ficam somente em `src/schemas/[dominio]/[recurso]-schemas.ts`.
3. Regras de negocio, queries Prisma e cache ficam em `src/services/*` (ou `src/server/*` apenas para auth/sessao/RBAC).
4. Cache manual nunca em route; Redis opcional somente em service com justificativa tecnica.
5. Toda tarefa com mudanca de comportamento deve ter teste criado/atualizado e teste executado antes da entrega.
6. `src/proxy.ts` e canonico para interceptacao; nao usar `src/middleware.ts`.

---

## 3. Baseline Tecnico Atual (medido em 2026-02-26)

### 3.1 Inventario

1. Total de routes em `src/app/api/v1`: **89**
2. Routes com Prisma direto: **27**
3. Routes com `z.object(...)` inline: **10**
4. Routes com `getRedis`/`Map` em route: **4**
5. Imports de `src/lib/validations/*` em routes: **0**
6. Ocorrencias de legado no `src` (`legacy|teamType|teamId|x-team-id|manage:team_`): **0**

### 3.2 Dominios ja aderentes no criterio estrutural principal

1. `sales`
2. `leads`
3. `tickets`
4. `ticket-stages`
5. `items`
6. `item-categories`
7. `organizations`
8. `me`
9. `invitations`

Todos os dominios acima estao com:

1. `prisma=0` em route
2. `inline_zod=0` em route
3. `cache_map=0` em route

### 3.3 Status de Execucao (medido em 2026-02-26, apos implementacao)

1. Total de routes em `src/app/api/v1`: **89**
2. Routes com Prisma direto: **0**
3. Routes com `z.object(...)` inline: **0**
4. Routes com `getRedis`/`Map` em route: **0**
5. Imports de `src/lib/validations/*` em routes: **0**
6. Ocorrencias de legado no `src` (`legacy|teamType|teamId|x-team-id|manage:team_`): **0**
7. Diretorios vazios em `src`: **0**

### 3.4 Entregas Concluidas nesta execucao

1. Refactor de routes API v1 para anatomia obrigatoria (`auth -> parse -> service -> response`).
2. Extracao de Prisma/cache/logica de negocio de routes para services por responsabilidade.
3. Remocao de Zod inline de routes e centralizacao em `src/schemas/`.
4. Migracao de `src/schemas` para padrao por dominio:
   - `src/schemas/ai/*`
   - `src/schemas/auth/*`
   - `src/schemas/company/*`
   - `src/schemas/contact/*`
   - `src/schemas/dashboard/*`
   - `src/schemas/items/*`
   - `src/schemas/leads/*`
   - `src/schemas/me/*`
   - `src/schemas/meta-ads/*`
   - `src/schemas/organizations/*`
   - `src/schemas/sales/*`
   - `src/schemas/system/*`
   - `src/schemas/tickets/*`
   - `src/schemas/whatsapp/*`
5. Atualizacao de imports para novos paths de schemas em API/services/server/components/pages.
6. Atualizacao da skill `nextjs-execution-guardrails` para reforcar:
   - estrutura transversal `src/<camada>/<dominio>/...` em todas as camadas aplicaveis;
   - proibicao de `useEffect`/`useLayoutEffect` no `src/`.

---

## 4. Gaps Restantes por Dominio (Status atual)

**Status atual dos gaps estruturais:** **zerado**.

1. Prisma direto em route: **0**
2. Schema inline em route: **0**
3. Cache/manual state em route: **0**

### 4.1 Pendencias nao estruturais (ainda faltam)

1. Executar suite completa de fase/programa (`npm run test`, `npm run build`) para fechamento do ciclo.
2. Hardening global restante (padronizacao de `apiError()`, auditoria final de `select` e revisao de handlers).
3. Consolidar cobertura de testes dos services extraidos por dominio.

---

## 5. Plano Restante (Fechamento)

### 5.1 Estabilizacao de Tipagem

1. Corrigida tipagem Prisma JSON em `src/services/ai/ai-agent.service.ts` (`triggers.conditions` e `schemaFields.options`).
2. Corrigido uso invalido de `as const` em `src/services/system/system-audit-log.service.ts`.
3. Removido `any` (implicito e explicito) dos pontos introduzidos neste ciclo.
4. Gate de tipagem validado: `npx tsc --noEmit` **verde**.

### 5.2 Fechamento de Validacao de Programa

1. Executar `npm run lint` (ja verde neste ciclo).
2. Executar `npm run test` completo.
3. Executar `npm run build`.
4. Reexecutar gates estruturais (Prisma/Zod/cache/legacy/diretorios vazios) para garantir regressao zero.

### 5.3 Hardening Final

1. Padronizar erros com `apiError()` nas routes que ainda retornam erro manual.
2. Revisar `select` explicito em services novos para evitar excesso de dados.
3. Revisar handlers para garantir ausencia de verificacao manual redundante de role/permissao quando guard ja cobre.
4. Consolidar cobertura de testes dos services extraidos por dominio.

---

## 6. Qualidade e Gates Obrigatorios

## 6.1 Gates por PR (obrigatorio)

1. criar/atualizar teste para o comportamento alterado;
2. executar o teste criado/atualizado antes de entregar;
3. executar `npm run lint`;
4. executar testes direcionados do dominio alterado.

## 6.2 Gates por fase (obrigatorio)

1. `npm run lint`
2. `npm run test`
3. `npm run build`

## 6.3 Gate final do programa (obrigatorio)

1. `npm run lint`
2. `npm run test`
3. `npm run build`
4. `npx tsc --noEmit`
5. `rg -n "from '@/lib/db/prisma'|\\bprisma\\." src/app/api/v1 --glob 'route.ts'` -> vazio
6. `rg -n "z\\.object\\(" src/app/api/v1 --glob 'route.ts'` -> vazio
7. `rg -n "getRedis|new Map\\(" src/app/api/v1 --glob 'route.ts'` -> vazio
8. `rg -n "from '@/lib/validations/'" src/app/api/v1 --glob 'route.ts'` -> vazio
9. `rg -n "legacy|teamType|teamId|x-team-id|manage:team_" src` -> vazio
10. `find src -type d -empty` -> vazio

---

## 7. Estrategia de Entrega (PRs)

1. PR estrutural ja executado: adequacao de routes, services e schemas por dominio.
2. PR de estabilizacao: fechar `tsc` + validar `test/build`.
3. PR de hardening final (se necessario): padronizacao de erro, auditoria de `select` e ajustes finais sem mudanca de contrato.
4. Preservar contrato HTTP (path/status/payload/mensagens) durante todo o programa.

---

## 8. Critérios de Aceite Globais

1. 100% das routes de `src/app/api/v1` no padrao da skill.
2. 0 Prisma em routes.
3. 0 schema inline em routes.
4. 0 cache/manual state em routes.
5. 0 compatibilidade legada no `src`.
6. teste criado/atualizado e executado antes de cada entrega.
7. pipeline final verde (`lint`, `test`, `build`, `tsc`).

---

## 9. Assuncoes

1. Projeto continua greenfield sem obrigacao de compatibilidade retroativa.
2. Contrato HTTP atual permanece inalterado.
3. Ajustes de infra/deploy nao fazem parte deste PRD, exceto o necessario para testes.
