# Tasks: PRD-013 AI Studio Platform

**Data:** 2026-03-21
**Status:** Draft
**Total:** 18
**Estimado:** 4 fases

---

## Ordem De Execucao

| Fase | Descricao | Tasks |
|---|---|---|
| Fase 1 | Services e APIs do studio | T1-T5 |
| Fase 2 | UI de blueprints e skills | T6-T10 |
| Fase 3 | Policies e observabilidade | T11-T14 |
| Fase 4 | Meta Ads Audit + finalizacao | T15-T18 |

---

## FASE 1 - Services E APIs Do Studio

### T1: Criar services de blueprint e skill management

**Files:**
- Create: `src/services/ai/ai-blueprint.service.ts`
- Create: `src/services/ai/ai-skill-management.service.ts`

**What to do:**
- listar blueprints disponiveis
- ativar blueprint por projeto
- listar skills e versoes
- publicar versao ativa

**Verification:**
- services funcionam sobre os modelos do PRD-012

### T2: Criar services de policy management

**Files:**
- Create: `src/services/ai/ai-policy.service.ts`

**What to do:**
- CRUD de keywords de crise
- CRUD de regras de terminologia

**Verification:**
- mutacoes e leituras project-scoped

### T3: Criar APIs do AI Studio

**Files:**
- Create: `src/app/api/v1/ai/blueprints/route.ts`
- Create: `src/app/api/v1/ai/blueprints/[slug]/activate/route.ts`
- Create: `src/app/api/v1/ai/skills/route.ts`
- Create: `src/app/api/v1/ai/skills/[id]/route.ts`
- Create: `src/app/api/v1/ai/policies/crisis-keywords/route.ts`
- Create: `src/app/api/v1/ai/policies/terminology-rules/route.ts`

**What to do:**
- routes thin
- validacao Zod
- escopo por projeto

**Verification:**
- rotas respondem no caminho feliz

### T4: Criar API completa de execution logs

**Files:**
- Expand: `src/app/api/v1/ai/execution-logs/route.ts`

**What to do:**
- paginação
- filtros
- detalhe de execucao

**Verification:**
- logs exploraveis pela UI

### T5: Revisar RBAC do AI Studio

**Files:**
- Modify: auth/permission surfaces relevantes

**What to do:**
- garantir que apenas `manage:ai` publique skills e altere policies
- permitir `view:ai` para leitura de logs, se fizer sentido

**Verification:**
- matrix minima de permissoes documentada e aplicada

---

## FASE 2 - UI De Blueprints E Skills

### T6: Criar hub do AI Studio

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/page.tsx`
- Create: componentes em `src/components/dashboard/ai/`

**What to do:**
- transformar a tela minima da V1 em hub do studio
- separar secoes de blueprints, skills, policies e logs

**Verification:**
- hub organiza as superficies principais

### T7: Criar tela de blueprints

**Files:**
- Create: `src/components/dashboard/ai/blueprints-content.tsx`

**What to do:**
- listar blueprints disponiveis
- mostrar ativo/inativo
- acao de ativar

**Verification:**
- usuario consegue alternar blueprint suportado

### T8: Criar tela de skills

**Files:**
- Create: `src/components/dashboard/ai/skills-content.tsx`

**What to do:**
- listar skills por projeto
- mostrar modo, categoria e versao ativa

**Verification:**
- tabela de skills carregando dados reais

### T9: Criar detalhe/publicacao de skill

**Files:**
- Create or Modify: pages em `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai/`

**What to do:**
- abrir skill
- editar conteudo de versao
- publicar nova versao ativa

**Verification:**
- fluxo de publicacao funciona

### T10: Adicionar guardrails de UX para publicacao

**Files:**
- Modify: componentes do studio

**What to do:**
- confirmar publicacao
- exibir diff ou resumo da mudanca
- evitar alteracao acidental da versao ativa

**Verification:**
- UX de publicacao segura

---

## FASE 3 - Policies E Observabilidade

### T11: Criar UI de crisis keywords

**Files:**
- Create: `src/components/dashboard/ai/crisis-keywords-content.tsx`

**What to do:**
- listar, criar e remover keywords

**Verification:**
- policy de crise administravel pelo projeto

### T12: Criar UI de terminology rules

**Files:**
- Create: `src/components/dashboard/ai/terminology-rules-content.tsx`

**What to do:**
- listar, criar e editar regras

**Verification:**
- terminologia administravel pela UI

### T13: Criar dashboard de execution logs

**Files:**
- Create: `src/components/dashboard/ai/execution-logs-content.tsx`

**What to do:**
- filtros por skill, data, sucesso, duracao
- drilldown de payload, routingDecision e outboundResult

**Verification:**
- time consegue investigar execucoes

### T14: Conectar inbox e AI Studio por logs

**Files:**
- Modify: surfaces read-only que exibem atividade de IA

**What to do:**
- unificar leitura da atividade com base em execution logs

**Verification:**
- inbox e studio leem a mesma fonte de observabilidade

---

## FASE 4 - Meta Ads Audit + Finalizacao

### T15: Criar skill `meta-ads-audit`

**Files:**
- Create: `src/mastra/skills/shared/meta-ads-audit/SKILL.md`
- Modify: seeds relevantes

**What to do:**
- modelar o audit como skill do runtime novo

**Verification:**
- skill seeded e versionada

### T16: Migrar endpoint de Meta Ads Audit

**Files:**
- Modify: `src/app/api/v1/meta-ads/audit/route.ts`

**What to do:**
- manter quota enforcement
- chamar a skill nova
- registrar via `AiSkillExecutionLog`

**Verification:**
- endpoint nao usa mais arquitetura paralela

### T17: Refatorar superficies temporarias da V1

**Files:**
- Modify: APIs, componentes, hooks e types que nasceram como versao minima no PRD-012

**What to do:**
- substituir implementacoes temporarias por surfaces finais do AI Studio
- consolidar naming e contratos publicos do studio

**Verification:**
- studio final nao depende de remendos da V1

### T18: Testes e validacao final do studio

**Files:**
- Create or Modify: testes do studio

**What to do:**
- testar publicacao de skill
- testar policy CRUD
- testar logs UI
- rodar test/build/lint

**Verification:**
- plataforma estavel sobre o runtime do PRD-012
