# Tasks: PRD-013 AI Studio Platform

**Data:** 2026-03-23 (v2.2)
**Status:** Draft
**Total:** 19
**Estimado:** 4 fases

---

## Pre-requisito Obrigatorio

**PRD-018 e PRD-012 devem estar concluidos antes de iniciar este PRD.**

`PRD-011` pode ser lido como referencia historica, mas nao bloqueia a execucao.

---

## Ordem De Execucao

| Fase | Descricao | Tasks |
|------|-----------|-------|
| Fase 1 | Schema + services + queries + APIs | T1-T6 |
| Fase 2 | RBAC + AI Studio hub + skills UI | T7-T12 |
| Fase 3 | Policies + AiEvent timeline + execution logs | T13-T17 |
| Fase 4 | Consolidacao final | T18-T19 |

---

## FASE 1 - Schema + Services + Queries + APIs

### T1: Adicionar TerminologyRule ao schema Prisma

**Files:**
- Modify: `prisma/schema.prisma`

**What to do:**
- Adicionar `model TerminologyRule` usando `organizationId` e `projectId`
- Adicionar relacoes em `Project` e `Organization`
- Criar indexes para consultas por projeto e status
- Gerar migration

**Verification:**
- `npx prisma validate` sem erros
- `TerminologyRule` fica alinhado ao padrao `organizationId + projectId`

---

### T2: Criar service de skill management

**Files:**
- Create: `src/lib/ai/services/ai-skill-management.service.ts`
- Create: `src/lib/ai/queries/list-ai-skills.ts`

**What to do:**

```typescript
listSkills(input: { organizationId: string; projectId: string }): Promise<AiSkillListItem[]>
getSkillDetail(input: { organizationId: string; projectId: string; skillId: string }): Promise<AiSkillDetail>
createDraftVersion(input: {
  organizationId: string
  projectId: string
  skillId: string
  prompt: string
}): Promise<AiSkillVersion>
publishVersion(input: {
  organizationId: string
  projectId: string
  skillVersionId: string
}): Promise<AiSkillVersion>
getVersionDiff(versionA: string, versionB: string): Promise<SkillVersionDiff>
```

Regras obrigatorias:
- listar a skill efetiva do projeto
- se a skill for global de sistema, a primeira edicao cria override project-scoped
- publicar uma versao e irreversivel
- nao existe `unpublish`

**Verification:**
- editar uma skill global em um projeto nao altera a skill global seedada
- `publishVersion` define `isPublished: true` e `publishedAt: now()`

---

### T3: Criar service de policy management

**Files:**
- Create: `src/lib/ai/services/ai-policy.service.ts`
- Create: `src/lib/ai/schemas/ai-terminology-rule.ts`

**What to do:**

```typescript
listCrisisKeywords(input: { organizationId: string; projectId: string }): Promise<AiCrisisKeyword[]>
createCrisisKeyword(input: {
  organizationId: string
  projectId: string
  data: CreateCrisisKeywordInput
}): Promise<AiCrisisKeyword>
deleteCrisisKeyword(input: {
  organizationId: string
  projectId: string
  id: string
}): Promise<void>

listTerminologyRules(input: { organizationId: string; projectId: string }): Promise<TerminologyRule[]>
upsertTerminologyRule(input: {
  organizationId: string
  projectId: string
  data: UpsertTerminologyRuleInput
}): Promise<TerminologyRule>
deleteTerminologyRule(input: {
  organizationId: string
  projectId: string
  id: string
}): Promise<void>
```

**Verification:**
- todas as operacoes sao estritamente project-scoped
- uma organizacao nao consegue mutar policy de outro projeto

---

### T4: Criar service de blueprint wizard

**Files:**
- Create: `src/lib/ai/services/ai-blueprint-wizard.service.ts`
- Modify: `src/lib/ai/services/ai-project-config.service.ts`

**What to do:**

O wizard recebe respostas do usuario e retorna o blueprint recomendado:

```typescript
interface WizardAnswers {
  primaryGoal: 'convert_leads' | 'customer_service' | 'follow_up' | 'outbound'
  contactStyle: 'online' | 'human' | 'mixed'
  businessDescription: string
}

resolveBlueprintFromWizard(answers: WizardAnswers): BlueprintRecommendation
activateBlueprint(input: {
  organizationId: string
  projectId: string
  blueprintSlug: string
}): Promise<void>
```

Regras obrigatorias:
- o catalogo de blueprints pode ser hardcoded nesta V1
- `activateBlueprint` deve atualizar `AiProjectConfig.blueprintSlug`
- o usuario nao ve o slug tecnico

**Verification:**
- `resolveBlueprintFromWizard` retorna o blueprint correto para cada combinacao de respostas
- `AiProjectConfig.blueprintSlug` e atualizado no projeto certo

---

### T5: Criar APIs do AI Studio

**Files:**
- Create: `src/app/api/v1/ai/blueprints/route.ts`
- Create: `src/app/api/v1/ai/skills/route.ts`
- Create: `src/app/api/v1/ai/skills/[id]/route.ts`
- Create: `src/app/api/v1/ai/skills/[id]/versions/route.ts`
- Create: `src/app/api/v1/ai/skills/[id]/versions/[versionId]/publish/route.ts`
- Create: `src/app/api/v1/ai/policies/crisis-keywords/route.ts`
- Create: `src/app/api/v1/ai/policies/terminology-rules/route.ts`

**What to do:**
- criar thin routes que delegam para services
- validar payloads com Zod
- resolver escopo via `validatePermissionAccess` + `resolveProjectScope`
- permitir leitura com `view:ai` ou `manage:ai`
- exigir `manage:ai` em mutacoes

**Verification:**
- todas as rotas respondem com dados reais do banco
- mutacoes falham para usuarios sem `manage:ai`

---

### T6: Criar APIs e queries de execution logs + AiEvent

**Files:**
- Create: `src/lib/ai/queries/list-ai-execution-logs.ts`
- Expand: `src/lib/ai/queries/list-ai-events.ts`
- Create: `src/app/api/v1/ai/execution-logs/route.ts`
- Create: `src/app/api/v1/ai/events/route.ts`

**What to do:**

Execution logs (`AiSkillExecutionLog`):
- `GET /api/v1/ai/execution-logs?projectId=&skillId=&status=&from=&to=&page=&limit=`
- incluir detalhe de `routingDecision`, `output`, `outboundResult`

AiEvent timeline:
- `GET /api/v1/ai/events?ticketId=&leadId=&projectId=&type=&page=&limit=`
- usado pelo inbox e pelo studio

**Verification:**
- logs paginados com filtros funcionam
- timeline de `AiEvent` acessivel por `ticketId`, `leadId` e `projectId`

---

## FASE 2 - RBAC + AI Studio Hub + Skills UI

### T7: Criar hub completo do AI Studio

**Files:**
- Create: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/page.tsx`
- Create: `src/components/dashboard/ai/ai-studio-shell.tsx`

**What to do:**
- criar o hub principal do AI Studio usando `HeaderPageShell`
- usar `HeaderTabs` como selector unico com 4 tabs: `Agente`, `Skills`, `Policies`, `Logs`
- conectar `searchValue`, `primaryAction`, `filters` e `onRefresh` do shell conforme a tab ativa
- nao criar navegacao lateral nova ou shell paralelo
- preparar a estrutura para receber `Cadencias` como nova tab sem refatorar a casca

**Verification:**
- hub navega entre as 4 tabs dentro de `HeaderPageShell`
- existe apenas um selector visual no header
- a estrutura suporta adicionar uma 5a tab sem refatorar o layout base

---

### T8: Criar wizard de configuracao do agente

**Files:**
- Create: `src/components/dashboard/ai/agent-content.tsx`
- Create: `src/components/dashboard/ai/agent-wizard.tsx`

**What to do:**
- 3 perguntas de negocio (`primaryGoal`, `contactStyle`, `businessDescription`)
- ao confirmar, chamar `POST /api/v1/ai/blueprints`
- backend mapeia para blueprint e atualiza `AiProjectConfig.blueprintSlug`
- usuario ve apenas a descricao amigavel do resultado
- renderizar a tab `Agente` com `SettingsGroup` + `SettingsRow`
- usar cards leves apenas para resumo do estado atual do agente

**Verification:**
- wizard configura o blueprint sem expor o slug tecnico ao usuario
- a tab segue o padrao visual de settings ja existente

---

### T9: Criar tela de listagem de skills

**Files:**
- Create: `src/components/dashboard/ai/skills-content.tsx`

**What to do:**
- tabela com nome da skill, modo, versao publicada, origem (`system` ou `project override`) e status
- acao de abrir detalhe
- busca e refresh da tab usam os slots do `HeaderPageShell`
- lista usa tabela/card existente do projeto, sem shell proprio

**Verification:**
- tabela carrega skills efetivas do projeto
- overrides do projeto aparecem corretamente sem esconder a skill de origem
- a tab `Skills` nao cria segundo header

---

### T10: Criar tela de detalhe e edicao de skill

**Files:**
- Create: `src/components/dashboard/ai/skill-editor-view.tsx`
- Create: `src/components/dashboard/ai/skill-editor.tsx`

**What to do:**
- exibir versao publicada atual
- editor de prompt markdown para nova versao rascunho
- botao "Ver diff com versao anterior" antes de publicar
- botao "Publicar nova versao" com dialog de confirmacao
- manter o fluxo dentro do mesmo hub do AI Studio via conteudo condicional, `Sheet` ou `Dialog`
- nao abrir nova sub-rota para a V1

**Verification:**
- fluxo de edicao, diff e publicacao funciona end-to-end
- a primeira edicao de skill global cria override do projeto
- o usuario continua dentro do contexto visual do hub

---

### T11: Adicionar guardrails de publicacao

**Files:**
- Modify: `src/components/dashboard/ai/skill-editor.tsx`
- Modify: `src/components/dashboard/ai/skill-editor-view.tsx`

**What to do:**
- dialog de confirmacao com resumo da mudanca
- aviso de que publicacao e irreversivel
- exibir quantas execucoes a versao anterior teve para dar contexto do impacto

**Verification:**
- usuario nao pode publicar sem confirmacao explicita

---

### T12: Adicionar RBAC do studio

**Files:**
- Modify: `src/lib/auth/rbac/roles.ts`
- Modify: `src/server/organization/permission-delegation-policy.ts`
- Modify: APIs e componentes do studio

**What to do:**
- introduzir permissao `view:ai`
- permitir leitura do studio com `view:ai` ou `manage:ai`
- manter todas as rotas de mutacao protegidas por `manage:ai`
- mostrar UI em modo read-only para usuarios sem poder de mutacao

**Verification:**
- usuario com `view:ai` ve o studio, mas nao consegue mutar
- usuario com `manage:ai` consegue ler e mutar

---

## FASE 3 - Policies + AiEvent Timeline + Execution Logs

### T13: Criar UI de crisis keywords

**Files:**
- Create: `src/components/dashboard/ai/crisis-keywords-content.tsx`

**What to do:**
- listagem com badge de status (`ativo`/`inativo`)
- formulario inline para adicionar nova keyword
- visualizar e editar `escalationResponse`
- remover keyword
- compor o formulario com `SettingsGroup` + `SettingsRow` ou tabela/card no padrao atual

**Verification:**
- CRUD de keywords funcionando

---

### T14: Criar UI de terminology rules

**Files:**
- Create: `src/components/dashboard/ai/terminology-rules-content.tsx`

**What to do:**
- tabela com termo, substituto, contexto e status
- formulario inline para adicionar e editar
- remover regra
- compor a tab `Policies` com componentes existentes do projeto, sem inventar shell novo

**Verification:**
- CRUD de regras funcionando

---

### T15: Adicionar timeline de AiEvent no inbox

**Files:**
- Modify: `src/components/dashboard/whatsapp/inbox/ticket-panel.tsx`
- Create: `src/components/dashboard/ai/ai-event-timeline-item.tsx`

**What to do:**
- carregar `AiEvent` do ticket junto do painel
- renderizar tipos principais:
  - `MESSAGE_SENT` / `TEMPLATE_SENT`
  - `SKILL_EXECUTED`
  - `TRIAGE_COMPLETED`
  - `CRISIS_DETECTED`
  - `LEAD_SCORED`
- garantir fallback generico para tipos desconhecidos
- por ser componente interno do inbox, nao usar `HeaderPageShell`

**Verification:**
- timeline do inbox exibe eventos de IA com renderizacao especifica por tipo
- tipos desconhecidos nao quebram o componente

---

### T16: Criar dashboard de execution logs

**Files:**
- Create: `src/components/dashboard/ai/execution-logs-content.tsx`

**What to do:**
- tabela paginada com data, skill, duracao, tokens, custo e status
- filtros por skill, status e data range
- linha expansivel com JSON de `routingDecision`, `output` e `outboundResult`
- a tab `Logs` usa busca, filtros e refresh do `HeaderPageShell`
- o conteudo nao cria shell proprio; ele consome a casca do hub

**Verification:**
- time consegue investigar execucoes com detalhe
- a tab segue o mesmo ritmo visual de hubs existentes

---

### T17: Expandir API de AiEvent para stats do studio

**Files:**
- Modify: `src/app/api/v1/ai/events/route.ts`

**What to do:**
- adicionar filtro por `projectId` e `type`
- adicionar endpoint ou modo de stats por periodo
- expor total de eventos por tipo

**Verification:**
- studio exibe stats corretos por periodo

---

## FASE 4 - Consolidacao Final

### T18: Consolidar surfaces minimas da V1

**Files:**
- Modify: `src/app/api/v1/ai/config/route.ts`
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/page.tsx`

**What to do:**
- manter `/api/v1/ai/config` como superficie tecnica de runtime
- fazer o studio consumir as APIs novas sem duplicar contratos
- remover ou aposentar componentes temporarios da V1 caso existam
- consolidar naming e contratos publicos

**Verification:**
- existe um unico caminho canonico para cada mutacao do studio
- sem componentes orfaos ou contratos duplicados

---

### T19: Validacao final do studio

**Files:**
- Modify: `docs/PRD/PRD-013-ai-studio-platform/QUICK_START.md`

**What to do:**
- `npm run lint` → 0 erros
- `npm run build` → sucesso
- `npm run test` → novos testes passando
- teste funcional manual: wizard → skill edit → publicar → ver no inbox

**Verification:**
- AI Studio operavel em modo leitura e modo edicao
- PRD sincronizado com a implementacao final
