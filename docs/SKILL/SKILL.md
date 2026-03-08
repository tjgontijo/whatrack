---
name: nextjs-execution-guardrails
description: Entregar tarefas em projetos Next.js + TypeScript + Prisma com qualidade previsivel e baixa supervisao. Usar quando implementar feature, corrigir bug, criar ou alterar endpoint, refatorar modulos, ajustar validacoes, ou escrever testes em `src/` para manter padroes de arquitetura, regras de codigo e workflow de entrega.
---

# Next.js Execution Guardrails

Executar tarefas com processo consistente e baixo retrabalho.

## Politica Anti-Legado (Inegociavel)

- O projeto e greenfield: nao implementar compatibilidade legada.
- Proibido criar ou manter aliases/fallbacks de contratos antigos no `src/`.
- Em mudancas estruturais, a entrega so e aceita com ausencia de compatibilidade legada ativa no `src/`.

## Convencao Estrutural (Transversal)

- Para codigo de dominio, usar sempre `src/<camada>/<dominio>/...`.
- Esta regra vale para `app/api/`, `services`, `server`, `schemas`, `hooks`, `types` e `components/dashboard`.
- Componentes de feature do dashboard devem ficar sempre em `src/components/dashboard/[dominio]/...`.
- `src/components/` na raiz deve conter apenas componentes compartilhados/transversais (`ui`, `data-table`, `landing`, `onboarding` e utilitarios globais).
- Proibido criar novo diretorio de dominio de dashboard fora de `src/components/dashboard/`.
- Arquivo flat na raiz da camada e permitido apenas para codigo compartilhado/transversal.

## Politica React (Inegociavel)

- Proibido introduzir `useEffect` ou `useLayoutEffect` no `src/` para fluxo de dados.
- Nao usar effects para fetch, sincronizacao de estado derivado, bootstrap de tela ou orquestracao de fluxo.
- Preferir Server Components, Server Actions, props derivadas e handlers explicitos de evento.
- Unico uso permitido de `useEffect`: sincronizacao com APIs externas do browser (event listeners DOM, observers, focus management, libs externas).

## Politica Client-Side Data Fetching (Inegociavel)

- Todo fetch client-side DEVE usar TanStack Query. Proibido fetch avulso em useEffect.
- Proibido `cache: 'no-store'` em fetch client-side (so valido em Server Components).
- Todo fetch client-side para endpoint com contexto de org DEVE incluir `ORGANIZATION_HEADER`.
- QueryKeys DEVEM conter todas as variaveis usadas em queryFn (incluindo `organizationId`).
- Proibido `setInterval` para polling — usar `refetchInterval` do TanStack Query.
- Proibido `setInterval` para detectar popup fechado — usar `window.addEventListener('focus', ...)`.
- Para debounce de input, usar `useDeferredValue` (React 19) em vez de `setTimeout`.
- Para sincronizar form com dados de query, usar `key` prop em vez de `useEffect`.
- Proibido `console.log` em codigo de producao.
- Consultar `references/rules.md` secoes "Client-Side Data Fetching", "useEffect — Usos Permitidos vs Proibidos" e "Polling e Timers" para regras detalhadas e exemplos.

## Fluxo Obrigatorio

1. Ler `references/rules.md` antes de editar qualquer arquivo.
2. Ler `references/directory-map.md` para localizar onde criar ou editar arquivos.
3. Ler apenas os blocos relevantes de `references/workflows.md` conforme o tipo da tarefa.
4. Mapear arquivos impactados e planejar diff minimo.
5. Implementar seguindo as regras desta skill.
6. Validar com comandos proporcionais ao impacto.
7. Responder com resumo objetivo, arquivos alterados, validacoes executadas e riscos pendentes.

## Selecao de Workflow

- Feature nova: usar `workflows.md` -> "Workflow: Nova Feature".
- Correcao de bug: usar `workflows.md` -> "Workflow: Bugfix".
- Endpoint/API: usar `workflows.md` -> "Workflow: Endpoint/API".
- Mudanca de schema Prisma: usar `workflows.md` -> "Workflow: Prisma e Dados".
- Refatoracao: usar `workflows.md` -> "Workflow: Refactor Seguro".

## Criterio de Conclusao

Concluir somente quando:

- Regras tecnicas foram seguidas.
- Nenhuma logica de negocio, query Prisma ou schema Zod foi adicionado dentro de uma route.
- Regras compartilhadas entre dominios foram centralizadas em modulo neutro (sem alias entre dominios).
- Nao restaram arquivos obsoletos, codigo morto ou diretorios vazios apos o refactor.
- Nao existe compatibilidade legada ativa no `src/` (sem alias/fallback de contratos antigos).
- Existe teste novo ou atualizado para o comportamento alterado.
- O teste criado/atualizado foi executado antes da entrega e o comando foi reportado no resumo final.
- Nao existem TODOs temporarios sem alinhamento.
- Resultado final permite review sem instrucoes adicionais.
