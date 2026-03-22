# Diagnostic: AI Studio Platform

**Data:** 2026-03-21
**Status:** Draft

---

## Resumo Executivo

- O PRD-012 resolve o runtime, mas nao a operacao do sistema.
- O principal risco desta fase e abrir poder demais sem controles de publicacao.
- O impacto esperado e transformar a nova IA em plataforma usavel pelo time.

---

## Problemas Encontrados

### 1. Runtime Sem Camada De Operacao

**Problema:** o core runtime sozinho nao oferece gestao segura de skills, blueprints e policies.

**Impacto:**
- dependencia de alteracao manual em codigo ou banco
- baixa operabilidade do sistema

**Solucao Necessaria:**
1. criar surfaces de AI Studio por projeto
2. expor APIs dedicadas de leitura e mutacao controlada

### 2. Skills Sem Fluxo De Publicacao Pela UI

**Problema:** mesmo com `AiSkillVersion`, sem UI o versionamento nao vira capability real.

**Impacto:**
- custo operacional alto
- risco de alteracoes fora do fluxo desejado

**Solucao Necessaria:**
1. listar versoes
2. editar draft
3. publicar explicitamente

### 3. Policies Ainda Sem Governanca

**Problema:** safety e terminologia precisam ser administraveis no contexto do projeto.

**Impacto:**
- dependencia de seed ou alteracao direta no banco

**Solucao Necessaria:**
1. criar CRUD de policies
2. manter aplicacao server-side

### 4. Logs Ainda Sao Minimos Para Investigacao

**Problema:** a V1 deve ter logs minimos, mas nao uma experiencia completa de observabilidade.

**Impacto:**
- investigacao operacional lenta
- dificuldade para auditar erro, custo e decisao

**Solucao Necessaria:**
1. criar dashboard de execution logs
2. adicionar filtros e drilldown

### 5. Meta Ads Audit Continuaria Fora Da Nova Arquitetura

**Problema:** sem migrar o audit, a plataforma de IA continua fragmentada.

**Impacto:**
- duas arquiteturas de IA coexistindo

**Solucao Necessaria:**
1. transformar audit em skill
2. mover observabilidade para `AiSkillExecutionLog`

---

## O Que Ja Esta Bom

| Item | Status | Evidencia |
|------|--------|-----------|
| PRD-012 isola o caminho critico | ✅ | Permite separar runtime de plataforma |
| Runtime novo ja deve operar por projeto | ✅ | Boa base para AI Studio project-scoped |
| Models novos suportam versionamento | ✅ | `AiSkill` e `AiSkillVersion` ja apontam para a plataforma |

---

## Matriz De Risco

| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
| Publicacao de skill sem guardrails | Alto | Media | Alto | 3h |
| Permissions insuficientes no AI Studio | Alto | Media | Alto | 2h |
| Cleanup parcial do legado | Medio | Alta | Alto | 3h |
| Migracao do Meta Ads Audit | Medio | Media | Medio | 2h |

---

## Ordem Recomendada

1. Services e APIs do AI Studio
2. UI de blueprints e skills
3. Policies e logs
4. Meta Ads Audit
5. Cleanup final do legado
