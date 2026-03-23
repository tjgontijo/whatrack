# Diagnostic: AI Studio Platform

**Data:** 2026-03-23
**Status:** Draft revisado

---

## Resumo Executivo

- O PRD-012 resolve o runtime, mas nao a operacao do sistema.
- O principal risco desta fase e abrir edicao e publicacao sem tenancy, RBAC e guardrails corretos.
- O impacto esperado e transformar a nova IA em plataforma usavel pelo time sem criar uma segunda arquitetura paralela.

---

## Problemas Encontrados

### 1. Runtime Sem Camada De Operacao

**Problema:** o core runtime sozinho nao oferece gestao segura de skills, blueprints e policies.

**Impacto:**
- dependencia de alteracao manual em banco ou codigo
- baixa operabilidade do sistema

**Solucao Necessaria:**
1. criar surfaces de AI Studio por projeto
2. expor APIs dedicadas de leitura e mutacao controlada

### 2. Skills Precisam De Override Por Projeto

**Problema:** as skills seedadas hoje sao globais de sistema. Edita-las diretamente pelo studio afetaria todos os projetos.

**Impacto:**
- risco alto de regressao cross-project
- quebra do isolamento por cliente

**Solucao Necessaria:**
1. listar skill efetiva por projeto
2. criar override project-scoped na primeira edicao
3. publicar explicitamente apenas no escopo do projeto

### 3. Policies Ainda Sem Governanca

**Problema:** safety e terminologia precisam ser administraveis no contexto do projeto.

**Impacto:**
- dependencia de seed ou alteracao direta no banco

**Solucao Necessaria:**
1. criar CRUD de policies
2. manter aplicacao server-side

### 4. Permissao Read-Only Ainda Nao Existe

**Problema:** o runtime atual possui `manage:ai`, mas nao possui `view:ai`.

**Impacto:**
- impossibilidade de abrir studio e logs para usuarios sem poder de mutacao
- mistura indevida entre leitura e edicao

**Solucao Necessaria:**
1. reintroduzir `view:ai` no RBAC
2. permitir leitura com `view:ai` ou `manage:ai`
3. manter mutacoes exclusivas de `manage:ai`

### 5. Observabilidade Ainda E Insuficiente Para Operacao

**Problema:** a V1 tem logs tecnicos, mas nao uma experiencia completa de investigacao.

**Impacto:**
- investigacao operacional lenta
- dificuldade para auditar erro, custo e decisao

**Solucao Necessaria:**
1. criar dashboard de execution logs
2. adicionar filtros, stats e drilldown
3. renderizar `AiEvent` no inbox

### 6. O PRD Nao Pode Depender De Endpoints Inexistentes

**Problema:** uma versao anterior deste PRD assumia um endpoint externo de audit que nao existe no estado atual do repo.

**Impacto:**
- task inexequivel
- risco de planejar implementacao fora da realidade do codebase

**Solucao Necessaria:**
1. focar este PRD no studio e nas surfaces reais de IA
2. deixar consumidores externos futuros apenas como padrao de integracao

### 7. Frontend Pode Divergir Do Shell Canonico

**Problema:** sem detalhar `HeaderPageShell`, `HeaderTabs` e composicao interna, a implementacao pode criar um AI Studio visualmente novo.

**Impacto:**
- quebra do ritmo visual do dashboard
- duplicacao de cascas e navegacao
- maior custo de manutencao de UX

**Solucao Necessaria:**
1. travar `HeaderPageShell` como shell obrigatorio do hub
2. travar `HeaderTabs` como selector unico
3. reutilizar `SettingsGroup`, `SettingsRow`, `Card`, tabelas e componentes existentes

---

## O Que Ja Esta Bom

| Item | Status | Evidencia |
|------|--------|-----------|
| PRD-012 separa runtime de plataforma | ✅ | Permite evoluir o studio sem reescrever o inbound |
| Runtime novo ja opera por `organizationId + projectId` | ✅ | Boa base para AI Studio project-scoped |
| Models novos suportam versionamento e eventos | ✅ | `AiSkill`, `AiSkillVersion`, `AiSkillExecutionLog` e `AiEvent` cobrem o nucleo |

---

## Matriz De Risco

| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
| Editar skill global sem override de projeto | Alto | Alta | Alto | 4h |
| Permissao read-only ausente no studio | Alto | Media | Alto | 2h |
| AI Studio implementado fora do shell canonico | Alto | Media | Alto | 2h |
| Timeline de IA no inbox sem query/index adequados | Medio | Media | Medio | 3h |
| Dashboard de logs sem filtros/statistics | Medio | Media | Medio | 3h |
| Cleanup parcial de surfaces minimas da V1 | Medio | Baixa | Medio | 2h |

---

## Ordem Recomendada

1. Schema, services, queries, APIs e RBAC
2. Hub do studio, wizard e skills
3. Policies, timeline e observabilidade
4. Consolidacao final das surfaces da V1
