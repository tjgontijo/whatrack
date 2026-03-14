# PRD: Adocao Segura da Skill Next.js no Whatrack

**Date:** 2026-03-14
**Status:** Draft
**Author:** Thiago + Codex

---

## 1. Overview

**One-liner:** Adequar o projeto `whatrack` gradualmente a uma skill Next.js mais rigorosa, preservando comportamento, contratos, configuracoes e UX existentes, com entrega por fases testaveis e milestones de baixo risco.

**Problem:** O projeto ja adotou varias boas praticas de arquitetura e de Next.js 16, mas ainda apresenta heterogeneidade entre modulos. Ha mutacoes client-side via `fetch`/`apiFetch`, algumas routes ainda acessam Prisma diretamente, varias telas do dashboard ainda nascem no client e nao existe uma estrategia de migracao segura para aproximar o codigo da skill sem provocar regressao funcional.

**Goal:** Definir um programa de adequacao incremental, com fases pequenas, milestones claras e gates de teste, para:

- reforcar boundaries arquiteturais;
- reduzir boilerplate e mutacao client-side desnecessaria;
- melhorar previsibilidade de data flow;
- aumentar observabilidade;
- preservar o comportamento atual do produto durante toda a migracao.

---

## 2. Principios Nao Negociaveis

1. **Sem regressao funcional intencional.**
   Toda fase deve preservar o comportamento atual, salvo mudanca explicitamente aprovada em outro PRD.

2. **Sem refactor estrutural amplo em lote.**
   Cada fase deve alterar apenas uma superficie limitada do sistema.

3. **Nao misturar reorganizacao e redesign funcional.**
   Mudar estrutura, fluxo e UX ao mesmo tempo aumenta drasticamente o risco.

4. **Contrato externo preservado por padrao.**
   Rotas, payloads, status codes, headers, copy funcional e semantica de auth devem permanecer estaveis, salvo decisao explicita.

5. **Migracao guiada por testes e caracterizacao.**
   Antes de mover um fluxo sensivel, capturar o comportamento atual em testes ou checklist manual reproduzivel.

6. **Adocao seletiva da skill.**
   Nem toda tela precisa virar server-first e nem toda mutacao precisa sair de route handler.

---

## 3. Objetivos e Nao Objetivos

### Objetivos

- Eliminar quebras claras de boundary, como Prisma direto em route.
- Introduzir Server Actions onde houver melhor ROI, especialmente em formularios administrativos.
- Tornar telas read-heavy mais server-first apenas quando houver ganho real.
- Reduzir `useEffect` usado como mecanismo de bootstrap, sincronizacao derivada ou redirect client-side evitavel.
- Introduzir observabilidade nativa do framework via `instrumentation.ts`.
- Padronizar invalidacao e refresh pos-mutacao.

### Nao Objetivos

- Reescrever o app inteiro para uma arquitetura nova.
- Substituir todas as API routes por Server Actions.
- Tornar toda pagina de dashboard server-first.
- Refatorar todos os dominios no mesmo ciclo.
- Reestruturar pastas do projeto apenas por estetica.

---

## 4. Escopo

### In Scope

- `src/app/api/**` para fechamento de boundaries arquiteturais.
- formularios administrativos e de settings com alta repeticao de `fetch` client-side.
- paginas dashboard read-heavy com potencial de melhoria clara no primeiro paint.
- mecanismos de invalidacao (`revalidateTag`, `revalidatePath`, `refresh`, `router.refresh()`).
- auth/redirects onde hoje o client esta fazendo trabalho que poderia ser decidido no servidor.
- observabilidade via entrypoints do framework.

### Out of Scope

- mudancas de pricing, billing model ou regras de negocio comerciais;
- redesign visual;
- migracao completa do inbox WhatsApp ou outras telas altamente interativas sem PRD especifico;
- remocao total de TanStack Query;
- troca da convencao estrutural dominante do projeto.

---

## 5. Invariantes de Compatibilidade

Durante este programa, os seguintes itens devem ser preservados:

| Invariante | Regra |
|---|---|
| Rotas HTTP | Nao mudar paths publicos existentes sem PRD proprio |
| Payload de resposta | Preservar shape atual por padrao |
| Status codes | Preservar semantica atual das rotas |
| Auth e guards | Nao relaxar protecao existente durante refactor |
| Headers de contexto | Preservar transporte atual onde ele ja e obrigatorio |
| Configuracoes e providers | Nao alterar inicializacao funcional sem necessidade |
| Comportamento de UI | Preservar submit, erro, sucesso, loading e refresh percebidos pelo usuario |
| Regras de dominio | Nao mudar validacao, billing, ownership ou side effects sem PRD separado |

### Regra pratica

Se uma alteracao exige mudar qualquer um dos invariantes acima, ela sai deste programa e entra em um PRD funcional separado.

---

## 6. Baseline Atual

Levantamento atual que justifica o programa:

| Metrica | Valor |
|---|---:|
| Route handlers em `src/app/api` | 105 |
| Routes com Prisma direto | 4 |
| `page.tsx` client-side | 16 |
| Ocorrencias de `useQuery/useInfiniteQuery/useMutation` | 76 |
| Ocorrencias de `useEffect/useLayoutEffect` | 26 |
| Server Actions | 0 |
| Chamadas `apiFetch()` | 79 |
| Chamadas `fetch()` em client code | 74 |
| `instrumentation.ts` / `instrumentation-client.ts` | 0 |

Principais exemplos de risco/ganho:

| Tipo | Arquivo | Leitura |
|---|---|---|
| route com boundary quebrado | `src/app/api/v1/projects/current/route.ts` | bom candidato a refactor seguro |
| route com boundary quebrado | `src/app/api/v1/billing/portal/route.ts` | bom candidato a refactor seguro |
| route com boundary quebrado | `src/app/api/v1/meta-ads/audit/route.ts` | refactor com mais cuidado por acoplamento de negocio |
| form client-side | `src/components/dashboard/projects/project-form-dialog.tsx` | bom candidato a Server Action |
| pagina client-heavy | `src/app/dashboard/whatsapp/inbox/page.tsx` | nao deve entrar cedo na migracao |
| pagina complexa de settings | `src/app/dashboard/settings/ai/[id]/page.tsx` | migracao posterior e fatiada |

---

## 7. Estrategia de Entrega por Fases

### Fase 0: Baseline, Caracterizacao e Gates

**Objetivo:** congelar o comportamento atual antes de refactors.

**Escopo:**

- mapear rotas e telas alvo por risco;
- criar checklist manual de smoke por fluxo sensivel;
- adicionar ou atualizar testes de caracterizacao nos modulos priorizados;
- formalizar gates minimos por milestone.

**Milestone 0.1: Baseline validado**

| Entrega | Criterio de saida |
|---|---|
| Inventario de modulos alvo | Lista de arquivos e fluxo por prioridade |
| Checklist manual | Roteiro de verificacao reproduzivel por modulo |
| Testes de caracterizacao minimos | Casos basicos cobrindo comportamento atual em rotas/formularios prioritarios |

**Teste obrigatorio da fase:**

- `npm run lint`
- testes direcionados dos modulos escolhidos
- smoke manual documentado para cada fluxo sensivel

---

### Fase 1: Boundary Hardening de Routes

**Objetivo:** corrigir o que tem melhor ROI e menor risco.

**Escopo:**

- remover Prisma direto de routes;
- mover logica de persistencia para services;
- preservar schema, payload e status code;
- manter cache/invalidacao atual enquanto a boundary e corrigida.

**Milestone 1.1: Routes seguras de baixo risco**

Arquivos alvo iniciais:

- `src/app/api/v1/projects/current/route.ts`
- `src/app/api/v1/billing/portal/route.ts`

**Milestone 1.2: Route sensivel com acoplamento maior**

Arquivo alvo:

- `src/app/api/v1/meta-ads/audit/route.ts`

**Beneficio esperado:**

| Ganho | Impacto |
|---|---|
| Melhor separacao HTTP -> service | review e manutencao mais previsiveis |
| Menor chance de regressao estrutural futura | facilita migracoes posteriores |
| Melhor testabilidade | services ficam mais isolados |

**Teste obrigatorio da fase:**

- testes de route e service dos modulos alterados
- validacao manual de payload, auth e mensagens de erro
- `npm run lint`

---

### Fase 2: Server Actions para Formularios de Alto ROI

**Objetivo:** reduzir boilerplate de mutacao client-side sem mexer em telas de alta complexidade.

**Escopo recomendado:**

- projetos
- categorias
- company/profile settings
- formularios administrativos pequenos e localizados

**Milestone 2.1: Primeiro formulario migrado**

Alvo sugerido:

- `src/components/dashboard/projects/project-form-dialog.tsx`

**Milestone 2.2: Segundo bloco administrativo**

Alvos sugeridos:

- formularios de categorias
- formularios de company/profile com submit simples

**Milestone 2.3: Padrao de submit consolidado**

| Entrega | Criterio de saida |
|---|---|
| Action + form padrao | submit, erro e sucesso preservados |
| Invalidacao explicita | sem dependencia excessiva de `router.refresh()` |
| Documentacao do padrao | equipe consegue repetir o modelo com baixo risco |

**Beneficio esperado:**

| Ganho | Impacto |
|---|---|
| Menos `fetch` manual no client | menos boilerplate e menos estados de submit dispersos |
| Validacao mais proxima do servidor | menor risco de drift entre UI e backend |
| Melhor previsibilidade pos-save | menos refetch manual incidental |

**Teste obrigatorio da fase:**

- teste do action/input quando aplicavel
- teste do fluxo de submit do componente
- smoke manual de criacao/edicao/cancelamento/erro
- `npm run lint`

---

### Fase 3: Invalidacao, Redirects e Observabilidade

**Objetivo:** padronizar comportamento transversal sem mexer no dominio de negocio.

**Escopo:**

- adicionar `instrumentation.ts` e `instrumentation-client.ts` quando fizer sentido;
- reduzir redirects client-side evitaveis em auth e guards;
- revisar uso de `router.refresh()` e preferir invalidacao explicita;
- consolidar guidelines de `updateTag`, `revalidateTag`, `revalidatePath` e `refresh`.

**Milestone 3.1: Observabilidade base**

**Milestone 3.2: Redirects server-side priorizados**

**Milestone 3.3: Guia operacional de invalidacao**

**Beneficio esperado:**

| Ganho | Impacto |
|---|---|
| Melhor diagnostico de erro/performance | incidentes mais baratos |
| Menos logica de navegacao no client | menos efeitos para auth/redirect |
| Menor refresh global desnecessario | comportamento pos-save mais previsivel |

**Teste obrigatorio da fase:**

- validacao manual de auth redirects
- smoke dos fluxos pos-mutacao afetados
- `npm run lint`

---

### Fase 4: Server-First Seletivo em Telas Read-Heavy

**Objetivo:** mover apenas os casos com melhor relacao ganho/risco.

**Escopo recomendado:**

- tickets
- settings por recurso
- dashboards com leitura inicial predominante

**Escopo explicitamente adiado por padrao:**

- inbox WhatsApp
- telas altamente interativas com estado local complexo

**Milestone 4.1: Uma tela read-heavy convertida com sucesso**

Alvos sugeridos:

- uma tela de settings com query inicial simples

**Milestone 4.2: Um fluxo dashboard com payload inicial no servidor**

Alvos sugeridos:

- tickets ou lista administrativa com filtros previsiveis

**Beneficio esperado:**

| Ganho | Impacto |
|---|---|
| Melhor first paint | menos loading fragmentado |
| Menos bootstrap client-side | menos risco de waterfall |
| Melhor separacao entre leitura inicial e interacao | telas mais previsiveis |

**Teste obrigatorio da fase:**

- teste de render/server query onde aplicavel
- smoke manual de filtros, loading, empty state e erro
- `npm run lint`

---

## 8. Sequencia Recomendada de Modulos

| Prioridade | Modulo | Risco | Motivo |
|---|---|---:|---|
| 1 | `projects/current` route | Baixo | ganho arquitetural claro |
| 2 | `billing/portal` route | Baixo | boundary facil de endurecer |
| 3 | `projects` form dialog | Medio-baixo | bom piloto de Server Action |
| 4 | company/profile forms | Medio | formulários com ROI alto |
| 5 | `meta-ads/audit` route | Medio | maior acoplamento de negocio |
| 6 | settings por `phoneId` | Medio | bom alvo para server-first seletivo |
| 7 | tickets | Medio-alto | alto ganho, mas maior risco |
| 8 | inbox WhatsApp | Alto | manter fora do inicio do programa |

---

## 9. Estrategia de Teste por Milestone

Cada milestone so fecha se os tres niveis abaixo forem atendidos:

### 9.1 Teste automatizado

- teste do service quando houver extracao de regra;
- teste da route/action quando houver mudanca na boundary;
- teste de componente para formularios e UX de submit quando aplicavel.

### 9.2 Smoke manual

Checklist minimo por fluxo alterado:

1. carregar tela/endpoint
2. validar permissao e auth
3. executar caminho feliz
4. validar erro esperado
5. validar estado final na UI
6. validar refresh/invalidation

### 9.3 Gate de programa

| Gate | Obrigatorio por milestone |
|---|---|
| `npm run lint` | Sim |
| testes direcionados do modulo | Sim |
| smoke manual do fluxo alterado | Sim |
| `npm run test` completo | Recomendado por fase, obrigatorio em marcos maiores |
| `npm run build` | Recomendado ao fim de fases maiores |

---

## 10. Riscos e Mitigacoes

| Risco | Onde pode ocorrer | Mitigacao |
|---|---|---|
| Regressao de UX em submit | migracao para Server Actions | caracterizar loading/sucesso/erro antes de mudar |
| Quebra de contrato HTTP | refactor de routes | preservar payload/status e validar com testes |
| Refresh inconsistente | troca de invalidacao | introduzir invalidacao explicita por modulo |
| Regressao em auth/redirect | mover decisao para servidor | validar caminhos autenticado/nao autenticado |
| Over-refactor | misturar fases | limitar escopo de cada milestone |
| Queda de produtividade | migracao ampla demais | atacar primeiro o que tem melhor ROI |

---

## 11. Critérios de Aceite Globais

O programa sera considerado bem-sucedido quando:

1. as routes com Prisma direto tiverem sido eliminadas sem regressao funcional;
2. existir pelo menos um padrao replicavel de Server Action em formularios administrativos;
3. a equipe tiver um padrao claro de invalidacao pos-mutacao;
4. `instrumentation.ts` estiver disponivel para observabilidade base;
5. pelo menos uma tela read-heavy tiver sido convertida com sucesso para um modelo mais server-first;
6. nenhuma fase tiver exigido rollback por regressao estrutural grave;
7. a adocao da skill tiver reduzido boilerplate e aumentado previsibilidade sem reescrever o app.

---

## 12. Assuncoes

1. O projeto mantera a convencao estrutural dominante atual, sem migracao global de pastas.
2. A equipe prefere seguranca e previsibilidade a velocidade maxima de refactor.
3. Rotas e fluxos de negocio continuarao sendo tratados como contratos estaveis.
4. Telas altamente interativas podem continuar hibridas por mais tempo sem violar o objetivo do programa.

---

## 13. Success Metric

| Metrica | Sinal de sucesso |
|---|---|
| Routes com Prisma direto | 0 |
| Server Actions em fluxos administrativos prioritarios | >= 1 padrao consolidado e reutilizado |
| Regressao funcional relevante por milestone | 0 |
| Fluxos com smoke manual documentado | 100% dos milestones |
| Uso de `router.refresh()` como fallback generico | reduzido nos modulos migrados |
| Tempo de review de mudancas estruturais | tende a cair por melhor previsibilidade de camada |

