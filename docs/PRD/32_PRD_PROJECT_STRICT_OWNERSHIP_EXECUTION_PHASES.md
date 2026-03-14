# PRD: Fases de Execucao para Ownership Forte de Integracoes por Project

**Date:** 2026-03-14
**Status:** Draft
**Author:** Thiago + Codex
**Parent PRD:** `docs/PRD/29_PRD_PROJECT_STRICT_OWNERSHIP_FOR_INTEGRATIONS.md`

---

## 1. Overview

**One-liner:** Executar o PRD 29 em fases pequenas, testaveis e reversiveis, reduzindo o risco de regressao funcional durante a migracao do ownership de integracoes para `Project`.

**Problem:** O PRD 29 define uma mudanca de ownership ampla, envolvendo schema, callbacks, servicos, reads, writes, delete/archive e backfill. Se tudo isso for implementado como entrega unica, o risco de quebra e alto porque a mudanca atravessa autenticacao, fluxos de onboarding, leitura operacional e dados existentes.

**Goal:** Transformar o PRD 29 em um programa executavel, com:

- fases pequenas e verificaveis;
- milestones com criterio claro de saida;
- preservacao do metodo atual de conexao com providers;
- validacao forte de writes, reads, callbacks e backfill;
- dependencia explicita do PRD 30 apenas onde billing/IA forem necessarios.

---

## 2. Invariantes de Compatibilidade

Durante toda a execucao deste programa:

| Invariante | Regra |
|---|---|
| Conexao Meta Ads | mesma mecanica externa de OAuth |
| Conexao WhatsApp | mesmo metodo externo de onboarding/callback |
| Auth | continua organization-based |
| Contratos de API | path, status code e payload preservados por padrao |
| Ownership | nenhum asset novo nasce org-scoped apos o cutover de writes |
| Fallback indevido | proibido fallback para outro projeto ou pool da organizacao depois do cutover de reads |
| Delete | sem mass de-association silenciosa no estado final |

---

## 3. Sequencia de Fases

### Fase 0: Baseline e Caracterizacao

**Objetivo:** congelar comportamento atual antes da migracao.

**Escopo:**

- mapear os fluxos de Meta Ads, WhatsApp, CAPI, enrichment e delete de project;
- documentar smoke manual por fluxo;
- criar testes de caracterizacao para os pontos mais sensiveis;
- identificar organizacoes com legacy data ambigua para backfill.

**Milestone 0.1: Baseline fechado**

| Entrega | Criterio de saida |
|---|---|
| Inventario de fluxos | Lista de rotas, callbacks e services afetados |
| Checklist de smoke | Roteiro manual por fluxo critico |
| Mapa de dados legados | Casos auto-mapeaveis vs casos ambíguos |

**Teste obrigatorio:**

- `npm run lint`
- testes direcionados dos modulos tocados
- smoke manual documentado dos fluxos atuais

---

### Fase 1: Schema Expansion Sem Cutover

**Objetivo:** preparar o banco para ownership por `projectId` sem mudar o comportamento de leitura ainda.

**Escopo:**

- adicionar campos `projectId` necessarios;
- criar indices e relacoes novas de forma migration-safe;
- manter compatibilidade temporaria para dados legados;
- nao endurecer `NOT NULL` nesta fase.

**Milestone 1.1: Schema expandido**

| Entrega | Criterio de saida |
|---|---|
| Campos novos adicionados | migration aplicada com sucesso |
| Indices e relacoes novas | sem quebrar writes existentes |
| Leitura atual preservada | nenhuma regressao funcional observada |

**Teste obrigatorio:**

- testes de schema e services tocados
- validacao de migration em ambiente local
- `npm run lint`

---

### Fase 2: Write Path Cutover

**Objetivo:** garantir que todo asset novo ja nasca com `projectId`.

**Escopo:**

- Meta OAuth state passa a carregar `projectId`;
- callback Meta persiste ownership por projeto;
- onboarding WhatsApp passa a persistir `projectId`;
- callback WhatsApp cria `WhatsAppConnection`/`WhatsAppConfig` no projeto correto;
- writes novos deixam de criar ativos org-scoped.

**Milestone 2.1: Meta write path**

| Entrega | Criterio de saida |
|---|---|
| OAuth state com `projectId` | callback cria conexao no projeto certo |
| Sync de contas importadas | herda ownership da conexao |

**Milestone 2.2: WhatsApp write path**

| Entrega | Criterio de saida |
|---|---|
| Onboarding com `projectId` | callback cria registros no projeto certo |
| Multiplos numeros por projeto | fluxo continua permitido |

**Teste obrigatorio:**

- testes de callback/state recovery
- smoke manual de conexao Meta Ads
- smoke manual de conexao WhatsApp
- `npm run lint`

---

### Fase 3: Backfill de Dados Legados

**Objetivo:** migrar ativos existentes para ownership por projeto antes do cutover de reads.

**Escopo:**

- auto-mapear organizacoes com apenas um projeto;
- exigir mapeamento explicito para organizacoes multi-project com ambiguidade;
- registrar erros e excecoes de backfill;
- nao endurecer leitura ainda onde houver ambiguidade nao resolvida.

**Milestone 3.1: Backfill automatico seguro**

**Milestone 3.2: Backfill assistido para casos ambiguos**

| Entrega | Criterio de saida |
|---|---|
| Casos simples migrados | ativos antigos com `projectId` preenchido |
| Casos ambiguos isolados | lista explicita para acao manual |

**Teste obrigatorio:**

- validacao por query dos registros backfillados
- smoke manual em organizacoes exemplo
- `npm run lint`

---

### Fase 4: Read Path Cutover

**Objetivo:** trocar os reads operacionais para ancorar em `projectId`.

**Escopo:**

- Meta Ads reads por projeto;
- WhatsApp reads por projeto;
- CAPI resolve pixels pelo projeto do ticket;
- enrichment resolve conexao/ativos pelo projeto do ticket;
- proibido fallback para pool da organizacao.

**Milestone 4.1: Reads de integracao**

**Milestone 4.2: CAPI e enrichment**

| Entrega | Criterio de saida |
|---|---|
| Reads project-scoped | respostas corretas por projeto |
| Sem fallback org-scoped | erro seguro quando projeto nao tiver asset valido |

**Teste obrigatorio:**

- testes de query builder e ownership helper
- testes de integracao para 404/mismatch
- smoke de leitura operacional por projeto
- `npm run lint`

---

### Fase 5: Hardening de Delete e Archive

**Objetivo:** fechar a semantica de ownership no lifecycle de project.

**Escopo:**

- remover force delete com mass de-association;
- permitir delete apenas quando o projeto estiver vazio;
- introduzir archive como caminho operacional padrao quando necessario;
- alinhar UX de delete/archive com ownership forte.

**Milestone 5.1: Delete protegido**

**Milestone 5.2: Archive como fluxo padrao**

**Teste obrigatorio:**

- testes de guard de delete
- smoke manual de projeto vazio vs projeto com assets
- `npm run lint`

---

### Fase 6: Schema Hardening Final

**Objetivo:** endurecer o modelo depois que writes, backfill e reads estiverem estaveis.

**Escopo:**

- aplicar `NOT NULL` onde couber;
- endurecer relacoes e constraints finais;
- remover fallbacks org-scoped obsoletos;
- validar que nenhum asset operacional fica sem `projectId`.

**Milestone 6.1: Hardening concluido**

| Entrega | Criterio de saida |
|---|---|
| `projectId` obrigatorio nos ativos alvo | schema final endurecido |
| Fallbacks removidos | codigo operacional alinhado ao ownership forte |

**Teste obrigatorio:**

- migration final validada
- testes direcionados
- `npm run lint`
- `npm run test` recomendado como gate da fase

---

## 4. Dependencia com PRD 30

Este PRD nao implementa billing/IA como entrega principal.

Dependencias:

| Tema | Relacao com PRD 29 | Dono principal |
|---|---|---|
| adicional de projetos | ownership deve ser compativel | PRD 30 |
| multiplos numeros WhatsApp billaveis | ownership permite, billing contabiliza | PRD 30 |
| allowance de IA por projeto | ownership viabiliza atribuicao | PRD 30 |
| overage de IA por projeto | ownership viabiliza medicao | PRD 30 |

Regra pratica:

- ownership cutover nao deve esperar toda a UX de billing;
- mas nao pode fechar schema/runtime de forma que inviabilize PRD 30.

---

## 5. Sequencia Recomendada de Arquivos/Modulos

| Prioridade | Alvo | Risco | Motivo |
|---|---|---:|---|
| 1 | estado/callback Meta | Medio | write path critico e bem delimitado |
| 2 | onboarding/callback WhatsApp | Medio | write path critico e bem delimitado |
| 3 | ownership helpers | Baixo | funda a validacao central |
| 4 | reads de Meta/WhatsApp | Medio | cutover controlado |
| 5 | CAPI/enrichment | Medio-alto | risco funcional alto, precisa vir depois do read cutover |
| 6 | delete/archive | Medio | depende do ownership estar estavel |
| 7 | hardening final de schema | Alto | so no final do programa |

---

## 6. Riscos e Mitigacoes

| Risco | Onde | Mitigacao |
|---|---|---|
| Callback criar asset no projeto errado | Fase 2 | validar state/onboarding server-side com testes |
| Backfill incorreto | Fase 3 | separar auto-map de casos ambiguos |
| CAPI/enrichment usarem asset errado | Fase 4 | abortar sem fallback org-scoped |
| Delete quebrar dados operacionais | Fase 5 | bloquear delete e usar archive |
| Hardening cedo demais | Fase 6 | so endurecer schema apos writes + backfill + reads |

---

## 7. Gates Globais do Programa

Por milestone:

- `npm run lint`
- testes direcionados do modulo
- smoke manual documentado do fluxo alterado

Por fase maior:

- `npm run test` recomendado
- `npm run build` recomendado quando houver mudanca ampla em callbacks/read path

Gate final do programa:

1. writes novos nao criam mais ativos org-scoped
2. reads operacionais usam `projectId`
3. `delete` nao mass-nullifica ownership
4. ativos alvo nao ficam sem `projectId`
5. fluxo externo de conexao Meta/WhatsApp permanece o mesmo

---

## 8. Critérios de Aceite

Este programa sera aceito quando:

1. `MetaConnection`, `MetaAdAccount`, `MetaPixel`, `WhatsAppConnection`, `WhatsAppConfig` e `WhatsAppOnboarding` tiverem ownership forte por `Project`;
2. nenhum fluxo novo de conexao criar ativo org-scoped;
3. CAPI e enrichment deixarem de usar fallback por organizacao;
4. delete de projeto com assets for bloqueado;
5. a migracao tiver sido executada sem regressao grave dos fluxos de conexao;
6. a equipe conseguir validar cada etapa isoladamente, sem precisar de big bang rollout.
