# Tasks: PRD-013 AI Studio Platform

**Data:** 2026-03-23 (v2.0)
**Status:** Draft
**Total:** 20
**Estimado:** 4 fases

---

## Pre-requisito Obrigatorio

**PRD-011, PRD-018 e PRD-012 devem estar concluidos antes de iniciar qualquer task deste PRD.**

---

## Ordem De Execucao

| Fase | Descricao | Tasks |
|------|-----------|-------|
| Fase 1 | Schema + services + APIs | T1-T6 |
| Fase 2 | Blueprint wizard + skills UI | T7-T12 |
| Fase 3 | Policies + AiEvent timeline + execution logs | T13-T17 |
| Fase 4 | Meta Ads Audit + finalizacao | T18-T20 |

---

## FASE 1 - Schema + Services + APIs

### T1: Adicionar TerminologyRule ao schema Prisma

**Files:**
- Modify: `prisma/schema.prisma`

**What to do:**
- Adicionar `model TerminologyRule` (ver CONTEXT.md para definicao completa)
- Adicionar relacoes em `Project` e `Organization`
- `npx prisma migrate dev --name add_terminology_rule`

**Verification:**
- `npx prisma validate` sem erros

---

### T2: Criar service de skill management

**Files:**
- Create: `src/services/ai/ai-skill-management.service.ts`

**What to do:**

```typescript
// Lista skills do projeto com versao publicada atual
listSkills(projectId: string): Promise<AiSkillWithVersion[]>

// Cria nova versao rascunho de uma skill
createDraftVersion(skillId: string, prompt: string): Promise<AiSkillVersion>

// Publica uma versao (irreversivel)
publishVersion(skillVersionId: string): Promise<AiSkillVersion>

// Retorna diff de prompt entre duas versoes
getVersionDiff(versionA: string, versionB: string): Promise<SkillVersionDiff>
```

**Verification:**
- `publishVersion` define `isPublished: true` e `publishedAt: now()`
- Nao existe `unpublish`

---

### T3: Criar service de policy management

**Files:**
- Create: `src/services/ai/ai-policy.service.ts`

**What to do:**

```typescript
// Crisis Keywords
listCrisisKeywords(projectId: string): Promise<AiCrisisKeyword[]>
createCrisisKeyword(projectId: string, data: CreateCrisisKeywordInput): Promise<AiCrisisKeyword>
deleteCrisisKeyword(id: string): Promise<void>

// Terminology Rules
listTerminologyRules(projectId: string): Promise<TerminologyRule[]>
upsertTerminologyRule(projectId: string, data: UpsertTerminologyRuleInput): Promise<TerminologyRule>
deleteTerminologyRule(id: string): Promise<void>
```

**Verification:**
- Todas as operacoes sao project-scoped

---

### T4: Criar service de blueprint wizard

**Files:**
- Create: `src/services/ai/ai-blueprint-wizard.service.ts`

**What to do:**

O wizard recebe respostas do usuario e retorna o blueprint recomendado:

```typescript
interface WizardAnswers {
  primaryGoal: 'convert_leads' | 'customer_service' | 'follow_up' | 'outbound'
  contactStyle: 'online' | 'human' | 'mixed'
  businessDescription: string
}

// Mapeia respostas para blueprintSlug
resolveBlueprintFromWizard(answers: WizardAnswers): BlueprintRecommendation

// Ativa o blueprint selecionado para o projeto
activateBlueprint(projectId: string, blueprintSlug: string): Promise<void>
// Internamente: atualiza AiAgentProjectConfig.config.blueprintSlug do agente 'whatsapp-inbound'
```

**Catalogo de blueprints (hardcoded no service):**
```typescript
const BLUEPRINTS = [
  {
    slug: 'whatsapp-commercial-agent',
    name: 'Agente Comercial',
    description: 'Converte leads: qualifica, apresenta produto e prepara o proximo passo.',
    goals: ['convert_leads', 'outbound'],
  },
  {
    slug: 'whatsapp-cs-agent',
    name: 'Agente de Atendimento',
    description: 'Atende clientes pos-compra, resolve problemas e coleta NPS.',
    goals: ['customer_service', 'follow_up'],
  },
]
```

**Verification:**
- `resolveBlueprintFromWizard` retorna blueprint correto para cada combinacao de respostas

---

### T5: Criar APIs do AI Studio

**Files:**
- Create: `src/app/api/v1/ai/blueprints/route.ts` — GET lista + POST wizard
- Create: `src/app/api/v1/ai/skills/route.ts` — GET lista
- Create: `src/app/api/v1/ai/skills/[id]/route.ts` — GET detalhe
- Create: `src/app/api/v1/ai/skills/[id]/versions/route.ts` — GET lista + POST nova versao
- Create: `src/app/api/v1/ai/skills/[id]/versions/[versionId]/publish/route.ts` — POST publicar
- Create: `src/app/api/v1/ai/policies/crisis-keywords/route.ts` — GET + POST + DELETE
- Create: `src/app/api/v1/ai/policies/terminology-rules/route.ts` — GET + POST + DELETE

Todas as rotas:
- Thin routes (delegam para services)
- Validacao Zod
- `ORGANIZATION_HEADER` para escopo de org
- Autorizacao: `manage:ai` para mutacoes

**Verification:**
- Todas as rotas respondem com dados reais do banco

---

### T6: Criar API de execution logs + AiEvent

**Files:**
- Expand: `src/app/api/v1/ai/execution-logs/route.ts`
- Create: `src/app/api/v1/ai/events/route.ts` — GET com filtros

**What to do:**

Execution logs (`AiSkillExecutionLog`):
- `GET /api/v1/ai/execution-logs?projectId=&skillId=&status=&from=&to=&page=&limit=`
- Inclui detalhe de `routingDecision`, `output`, `outboundResult`

AiEvent timeline:
- `GET /api/v1/ai/events?ticketId=&leadId=&projectId=&page=&limit=`
- Usado pelo inbox e pelo studio

**Verification:**
- Logs paginados com filtros funcionam
- Timeline de AiEvent acessivel por ticketId e leadId

---

## FASE 2 - Blueprint Wizard + Skills UI

### T7: Criar hub completo do AI Studio

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/page.tsx`

**What to do:**
- Substituir UI minima do PRD-012 por hub organizado
- Secoes: Agente, Skills, Policies, Logs
- Usar estrutura extensivel por tabs ou nav lateral — o PRD-022 adicionara a secao "Cadencias" a este mesmo hub sem refatoracao

**Verification:**
- Hub navega entre as 4 secoes e a estrutura suporta adicionar uma 5a (Cadencias) sem refatorar

---

### T8: Criar wizard de configuracao do agente

**Files:**
- Create: `src/components/dashboard/ai/agent-wizard.tsx`

**What to do:**
- 3 perguntas de negocio (primaryGoal, contactStyle, businessDescription)
- Ao confirmar: chama `POST /api/v1/ai/blueprints` com as respostas
- Backend mapeia para blueprint e atualiza `AiAgentProjectConfig`
- Usuario ve apenas: "Seu agente foi configurado como Agente Comercial"
- Nunca exibir o slug do blueprint para o usuario

**Verification:**
- Wizard configura blueprint sem o usuario ver slug tecnico

---

### T9: Criar tela de listagem de skills

**Files:**
- Create: `src/components/dashboard/ai/skills-content.tsx`

**What to do:**
- Tabela com: nome da skill, modo (llm/deterministic), versao publicada, status
- Acao de abrir detalhe

**Verification:**
- Tabela carrega skills reais do projeto

---

### T10: Criar tela de detalhe e edicao de skill

**Files:**
- Create: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/skills/[skillId]/page.tsx`
- Create: `src/components/dashboard/ai/skill-editor.tsx`

**What to do:**
- Exibir versao publicada atual
- Editor de prompt markdown para nova versao (rascunho)
- Botao "Ver diff com versao anterior" antes de publicar
- Botao "Publicar nova versao" com dialog de confirmacao

**Verification:**
- Fluxo de edicao + diff + publicacao funciona end-to-end

---

### T11: Adicionar guardrails de publicacao

**Files:**
- Modify: `src/components/dashboard/ai/skill-editor.tsx`

**What to do:**
- Dialog de confirmacao com texto da mudanca
- Avisar que publicacao e irreversivel
- Exibir quantas execucoes a versao anterior teve (para dar contexto do impacto)

**Verification:**
- Usuario nao pode publicar sem confirmacao explicita

---

### T12: Adicionar RBAC do studio

**Files:**
- Modify: APIs do studio e componentes de edicao

**What to do:**
- Verificar `manage:ai` em todas as rotas de mutacao
- Mostrar UI em modo read-only para usuarios sem `manage:ai`
- Botoes de publicar/editar ficam desabilitados (nao ocultos) para usuarios com `view:ai`

**Verification:**
- Usuario sem `manage:ai` ve o studio mas nao consegue mutar

---

## FASE 3 - Policies + AiEvent Timeline + Execution Logs

### T13: Criar UI de crisis keywords

**Files:**
- Create: `src/components/dashboard/ai/crisis-keywords-content.tsx`

**What to do:**
- Listagem com badge de status (ativo/inativo)
- Formulario inline para adicionar nova keyword
- Visualizar e editar `escalationResponse` de cada keyword
- Remover keyword

**Verification:**
- CRUD de keywords funcionando

---

### T14: Criar UI de terminology rules

**Files:**
- Create: `src/components/dashboard/ai/terminology-rules-content.tsx`

**What to do:**
- Tabela: termo proibido, substituto, contexto, ativo/inativo
- Formulario inline para adicionar/editar
- Remover regra

**Verification:**
- CRUD de regras funcionando

---

### T15: Adicionar timeline de AiEvent no inbox

**Files:**
- Modify: `src/components/dashboard/whatsapp/inbox/ticket-panel.tsx`
- Create: `src/components/dashboard/ai/ai-event-timeline-item.tsx`

**What to do:**
- O PRD-012 T17 ja adicionou a timeline basica (MESSAGE_SENT, SKILL_EXECUTED). Esta task **expande** o que foi entregue, nao substitui.
- Adicionar renderizacao rica para tipos adicionais:
  - CRISIS_DETECTED: badge vermelho com keyword detectada
  - LEAD_SCORED: badge com score antigo → novo
  - CADENCE_ENROLLED / CADENCE_STEP_EXECUTED / CADENCE_INTERRUPTED: linha de cadencia com nome
  - TRIAGE_COMPLETED: linha colapsavel com intencao detectada
- Criar `src/components/dashboard/ai/ai-event-timeline-item.tsx` como componente reutilizavel para cada tipo
- Garantir que novos tipos futuros (ex: cadencia) se encaixam sem alterar o componente base

**Verification:**
- Timeline do inbox exibe todos os tipos acima com renderizacao especifica por tipo
- Tipos desconhecidos caem em renderizacao generica sem erro

---

### T16: Criar dashboard de execution logs

**Files:**
- Create: `src/components/dashboard/ai/execution-logs-content.tsx`

**What to do:**
- Tabela paginada: data, skill, duracao, tokens, custo, status
- Filtros: skill, status (sucesso/erro), data range
- Linha expansivel com JSON de `routingDecision`, `output`, `outboundResult`

**Verification:**
- Time consegue investigar execucoes com detalhe

---

### T17: Criar API de AiEvent para uso no studio

**Files:**
- Expand: `src/app/api/v1/ai/events/route.ts`

**What to do:**
- Adicionar filtro por `projectId` e `type` (alem de ticketId/leadId)
- Adicionar endpoint de stats: total de eventos por tipo por periodo
- Usado pelo dashboard de logs

**Verification:**
- Studio exibe stats corretos por periodo

---

## FASE 4 - Meta Ads Audit + Finalizacao

### T18: Criar skill `meta-ads-audit` e migrar endpoint

**Files:**
- Create: `prisma/seeds/meta-ads-audit-skill.ts`
- Modify: `src/app/api/v1/meta-ads/audit/route.ts`

**What to do:**
- Seedar skill `meta-ads-audit` com prompt dedicado e modo `llm`
- Refatorar o endpoint para chamar `skill-runner.ts` com essa skill
- O resultado deve gerar `AiEvent(SKILL_EXECUTED)` (nao mais `AiInsight`)
- Manter quota enforcement existente
- Manter o drawer de resultados de audit na UI (sem mudanca na UX)

**Verification:**
- Endpoint nao usa mais `dispatchAiEventForAudit()`
- Custo e visivel no `AiEvent` gerado

---

### T19: Limpar superficies temporarias do PRD-012

**Files:**
- Modify: APIs e componentes que nasceram como versao minima na V1

**What to do:**
- Substituir a UI minima de config do agente pela UI completa do studio
- Remover endpoints e componentes duplicados ou sobrescritos pelo studio
- Consolidar naming e contratos publicos

**Verification:**
- Sem endpoints duplicados ou componentes orfaos da V1

---

### T20: Validacao final do studio

**What to do:**
- `npm run lint` → 0 erros
- `npm run build` → sucesso
- `npm run test` → novos testes passando
- Teste funcional manual: wizard → skill edit → publicar → ver no inbox
