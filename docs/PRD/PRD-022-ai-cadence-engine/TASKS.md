# Tasks: PRD-022 AI Cadence Engine

**Data:** 2026-03-23
**Status:** Draft
**Total:** 18
**Estimado:** 3 fases

---

## Pre-requisito Obrigatorio

**PRD-018 e PRD-012 devem estar concluidos antes de iniciar qualquer task deste PRD.**

PRD-018 entrega: modelos de cadencia no schema, `AiEventService`, `LeadAiContextService`, Inngest configurado.
PRD-012 entrega: `skill-runner.ts`, `whatsapp-ai-send.service.ts`, `AiConversationState`.

---

## Ordem De Execucao

| Fase | Descricao | Tasks |
|------|-----------|-------|
| Fase 1 | Worker de steps + interrupcao | T1-T6 |
| Fase 2 | CRUD de cadencias + APIs | T7-T12 |
| Fase 3 | UI + testes | T13-T18 |

---

## FASE 1 - Worker de Steps + Interrupcao

### T1: Criar `ai-cadence-runner.service.ts`

**Files:**
- Create: `src/services/ai/ai-cadence-runner.service.ts`

**What to do:**

Implementar a execucao de cada tipo de step:

```typescript
interface RunStepInput {
  enrollmentId: string
  stepOrder: number
}

interface RunStepResult {
  status: 'executed' | 'skipped' | 'deferred' | 'failed'
  deferUntil?: Date  // se 'deferred'
  reason?: string
}

export async function runCadenceStep(input: RunStepInput): Promise<RunStepResult>
```

**Logica de execucao por `actionType`:**

**send_skill:**
```typescript
// 1. Verificar windowMode
// 2. Se OPEN e janela fechada: aplicar fallback (skip | fallback_template | wait)
// 3. Se CLOSED e janela aberta: defer por 2h
// 4. Se ANY: usar skill se janela aberta, template se fechada
// 5. Chamar skill-runner.ts com skillSlug do actionConfig
// 6. Chamar whatsapp-ai-send.service.ts
// 7. Registrar AiEvent(SKILL_EXECUTED) + AiEvent(CADENCE_STEP_EXECUTED)
```

**send_template:**
```typescript
// 1. Verificar se template existe e esta APPROVED
// 2. Chamar whatsapp-ai-send.service.ts com template
// 3. Registrar AiEvent(TEMPLATE_SENT) + AiEvent(CADENCE_STEP_EXECUTED)
```

**update_stage:**
```typescript
// 1. Buscar ticket aberto do lead no projeto
// 2. Mover para targetStageId
// 3. Registrar AiEvent(CADENCE_STEP_EXECUTED)
```

**score_lead:**
```typescript
// 1. Buscar LeadAiContext
// 2. Ajustar aiScore (soma scoreAdjustment, clampar entre 0-100)
// 3. Registrar AiEvent(LEAD_SCORED) + AiEvent(CADENCE_STEP_EXECUTED)
```

**wait_reply:**
```typescript
// 1. Verificar se o lead respondeu depois do step anterior
// (buscar Message do lead mais recente no ticket com direction = 'inbound')
// 2. Se respondeu: considerar step concluido e avancar
// 3. Se nao respondeu e timeout nao expirou: retornar 'deferred' com nextCheck
// 4. Se timeout expirou: considerar step concluido por timeout e avancar
```

**Verification:**
- Cada `actionType` e testavel isoladamente
- `runCadenceStep` retorna `RunStepResult` sem throw

---

### T2: Criar `ai-cadence-enrollment.service.ts`

**Files:**
- Create: `src/services/ai/ai-cadence-enrollment.service.ts`

**What to do:**

```typescript
// Inscreve um lead em uma cadencia (verifica pre-requisitos)
enroll(cadenceId: string, leadId: string, opts?: EnrollOptions): Promise<AiCadenceEnrollment>
// - verificar maxEnrollmentsPerLead
// - verificar se ja existe enrollment ativo
// - criar enrollment com nextStepAt = now + delayHours[step1]
// - registrar AiEvent(CADENCE_ENROLLED)

// Avanca para o proximo step apos execucao bem-sucedida
advanceStep(enrollmentId: string): Promise<void>
// - se ultimo step: status = 'completed', AiEvent(CADENCE_COMPLETED)
// - se nao: currentStep++, nextStepAt = now + delayHours[proximo step]

// Interrompe o enrollment
interrupt(enrollmentId: string, reason: InterruptReason): Promise<void>
// - status = 'interrupted', interruptedAt, interruptReason
// - AiEvent(CADENCE_INTERRUPTED)

// Pausa o enrollment (congela nextStepAt)
pause(enrollmentId: string): Promise<void>

// Retoma o enrollment pausado (redefine nextStepAt)
resume(enrollmentId: string): Promise<void>

// Lista enrollments de um lead
getLeadEnrollments(leadId: string): Promise<AiCadenceEnrollment[]>

// Lista enrollments de uma cadencia (para admin)
getCadenceEnrollments(cadenceId: string, opts: PaginationOpts): Promise<PaginatedResult<AiCadenceEnrollment>>
```

**Verification:**
- `enroll` e idempotente: se ja existe enrollment ativo, retorna o existente sem criar outro
- `interrupt` nao falha se o enrollment ja esta interrompido

---

### T3: Criar function Inngest `process-cadence-step`

**Files:**
- Create: `src/lib/inngest/functions/cadence-step.ts`

**What to do:**

```typescript
export const processCadenceStep = inngest.createFunction(
  {
    id: 'process-cadence-step',
    concurrency: { limit: 1, key: 'event.data.enrollmentId' },
    retries: 3,
  },
  { event: 'ai/cadence.step.due' },
  async ({ event, step }) => {
    const result = await step.run('run-step', () =>
      runCadenceStep({
        enrollmentId: event.data.enrollmentId,
        stepOrder: event.data.stepOrder,
      })
    )

    if (result.status === 'executed') {
      await step.run('advance', () =>
        advanceStep(event.data.enrollmentId)
      )
    }

    if (result.status === 'deferred') {
      // reagendar para deferUntil
    }
  }
)
```

- Registrar esta function no handler `/api/inngest/route.ts`

**Verification:**
- Function aparece no dashboard do Inngest
- Retry automatico em caso de erro de rede

---

### T4: Criar cron Inngest para polling de cadencias

**Files:**
- Create: `src/lib/inngest/functions/cadence-cron.ts`

**What to do:**

```typescript
export const cadenceCron = inngest.createFunction(
  { id: 'cadence-cron' },
  { cron: 'TZ=UTC */5 * * * *' },  // a cada 5 minutos
  async ({ step }) => {
    const dueEnrollments = await step.run('fetch-due', () =>
      prisma.aiCadenceEnrollment.findMany({
        where: {
          status: 'active',
          nextStepAt: { lte: new Date() },
        },
        select: { id: true, currentStep: true },
        take: 50,  // processar em batches
      })
    )

    // Emitir evento por enrollment
    await step.sendEvent('dispatch-steps', dueEnrollments.map(e => ({
      name: 'ai/cadence.step.due',
      data: {
        enrollmentId: e.id,
        stepOrder: e.currentStep + 1,
      }
    })))

    return { processed: dueEnrollments.length }
  }
)
```

- Registrar no handler `/api/inngest/route.ts`

**Verification:**
- Cron aparece no dashboard do Inngest
- Emite eventos para os enrollments corretos

---

### T5: Integrar interrupcao no messageHandler

**Files:**
- Modify: `src/services/whatsapp/handlers/message.handler.ts`

**What to do:**
- Apos persistir a mensagem inbound no CRM (dentro da transaction existente)
- Chamar `interruptLeadCadences(leadId)` — que busca todos os enrollments ativos do lead e chama `interrupt('customer_replied')` em cada um
- Esta operacao e sincrona e acontece antes do `inngest.send()` do agente reativo

```typescript
async function interruptLeadCadences(leadId: string): Promise<void> {
  const activeEnrollments = await prisma.aiCadenceEnrollment.findMany({
    where: { leadId, status: 'active' }
  })
  await Promise.all(
    activeEnrollments.map(e => interrupt(e.id, 'customer_replied'))
  )
}
```

**Verification:**
- Ao receber mensagem inbound, enrollments ativos do lead sao interrompidos antes do workflow de resposta

---

### T6: Integrar interrupcao na desativacao de cadencia

**Files:**
- Modify: `src/services/ai/ai-cadence.service.ts` (a ser criado no T7)

**What to do:**
- Ao chamar `deactivateCadence(cadenceId)`:
  - Setar `AiCadence.isActive = false`
  - Buscar todos os enrollments ativos dessa cadencia
  - Chamar `interrupt(enrollmentId, 'cadence_deactivated')` em cada um
- Fazer em batch, nao em N+1

**Verification:**
- Desativar uma cadencia interrompe todos os enrollments ativos

---

## FASE 2 - CRUD de Cadencias + APIs

### T7: Criar `ai-cadence.service.ts`

**Files:**
- Create: `src/services/ai/ai-cadence.service.ts`

**What to do:**

```typescript
listCadences(projectId: string): Promise<AiCadenceWithSteps[]>
getCadence(id: string): Promise<AiCadenceWithSteps | null>
createCadence(projectId: string, data: CreateCadenceInput): Promise<AiCadence>
updateCadence(id: string, data: UpdateCadenceInput): Promise<AiCadence>
activateCadence(id: string): Promise<void>
deactivateCadence(id: string): Promise<void>  // tambem interrompe enrollments ativos (T6)

// Steps
addStep(cadenceId: string, data: CreateStepInput): Promise<AiCadenceStep>
updateStep(stepId: string, data: UpdateStepInput): Promise<AiCadenceStep>
removeStep(stepId: string): Promise<void>
reorderSteps(cadenceId: string, orderedIds: string[]): Promise<void>
```

**Verification:**
- CRUD completo e project-scoped

---

### T8: Criar seed de cadencias exemplo

**Files:**
- Create: `prisma/seeds/ai-cadences.ts`

**What to do:**
Criar 2 cadencias de exemplo para ambiente local:

```typescript
const exampleCadences = [
  {
    name: 'Follow-up de Proposta (3 dias)',
    slug: 'proposal-followup-3d',
    trigger: 'manual',
    steps: [
      { order: 1, delayHours: 0, windowMode: 'ANY', actionType: 'send_skill',
        actionConfig: { skillSlug: 'collect-lead-qualification', fallbackTemplateName: 'followup_d1' } },
      { order: 2, delayHours: 24, windowMode: 'CLOSED', actionType: 'send_template',
        actionConfig: { templateName: 'followup_d2', templateLang: 'pt_BR' } },
      { order: 3, delayHours: 48, windowMode: 'ANY', actionType: 'send_skill',
        actionConfig: { skillSlug: 'human-handoff', fallbackTemplateName: 'followup_d3' } },
    ]
  },
  {
    name: 'Reengajamento de Lead Inativo',
    slug: 'lead-reengagement',
    trigger: 'inactivity',
    config: { inactivityDays: 14, targetLifecycleStages: ['engaged', 'qualified'] },
    steps: [
      { order: 1, delayHours: 0, windowMode: 'CLOSED', actionType: 'send_template',
        actionConfig: { templateName: 'reengagement_v1', templateLang: 'pt_BR' } },
      { order: 2, delayHours: 72, windowMode: 'CLOSED', actionType: 'send_template',
        actionConfig: { templateName: 'reengagement_v2', templateLang: 'pt_BR' } },
    ]
  },
]
```

**Verification:**
- Cadencias de exemplo existem no banco apos seed

---

### T9: Criar schemas Zod para cadencias

**Files:**
- Create: `src/schemas/ai/ai-cadence.schema.ts`

**What to do:**
- `CreateCadenceSchema`: nome, slug, trigger, config, isActive
- `CreateStepSchema`: order, delayHours, windowMode, actionType, actionConfig (discriminated union por actionType)
- `EnrollLeadSchema`: leadId, ticketId? (opcional)

**Verification:**
- `actionConfig` e validado corretamente para cada `actionType`

---

### T10: Criar APIs de CRUD de cadencias

**Files:**
- Create: `src/app/api/v1/ai/cadences/route.ts` — GET lista + POST criar
- Create: `src/app/api/v1/ai/cadences/[cadenceId]/route.ts` — GET + PUT + DELETE
- Create: `src/app/api/v1/ai/cadences/[cadenceId]/activate/route.ts` — POST
- Create: `src/app/api/v1/ai/cadences/[cadenceId]/steps/route.ts` — GET + POST
- Create: `src/app/api/v1/ai/cadences/[cadenceId]/steps/[stepId]/route.ts` — PUT + DELETE

Todas as rotas:
- `ORGANIZATION_HEADER` para escopo
- Autorizacao: `manage:ai`
- Delegar para `ai-cadence.service.ts`

**Verification:**
- CRUD completo funcionando com dados reais

---

### T11: Criar APIs de enrollment

**Files:**
- Create: `src/app/api/v1/ai/cadences/[cadenceId]/enroll/route.ts` — POST (enrollment manual)
- Create: `src/app/api/v1/ai/cadences/[cadenceId]/enrollments/route.ts` — GET lista
- Create: `src/app/api/v1/ai/enrollments/[enrollmentId]/pause/route.ts` — POST
- Create: `src/app/api/v1/ai/enrollments/[enrollmentId]/resume/route.ts` — POST
- Create: `src/app/api/v1/ai/enrollments/[enrollmentId]/interrupt/route.ts` — POST

**Verification:**
- Operador consegue inscrever, pausar, retomar e interromper via API

---

### T12: Criar API de leads em cadencia

**Files:**
- Create: `src/app/api/v1/ai/leads/[leadId]/enrollments/route.ts` — GET

**What to do:**
- Retornar todos os enrollments de um lead (ativos e historicos)
- Incluir nome da cadencia, step atual, status e nextStepAt

**Verification:**
- Endpoint retorna dados corretos para o lead

---

## FASE 3 - UI + Testes

### T13: Criar hub de cadencias no AI Studio

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/page.tsx`
- Create: `src/components/dashboard/ai/cadences/cadences-content.tsx`

**What to do:**
- Adicionar secao "Cadencias" no AI Studio
- Listagem de cadencias com: nome, trigger, steps count, status (ativo/inativo), enrollments ativos
- Botoes: criar, ativar/desativar, abrir detalhe

**Verification:**
- Listagem carrega cadencias reais do projeto

---

### T14: Criar editor de cadencia

**Files:**
- Create: `src/components/dashboard/ai/cadences/cadence-editor.tsx`
- Create: `src/components/dashboard/ai/cadences/cadence-step-form.tsx`

**What to do:**
- Formulario de criacao/edicao de cadencia (nome, trigger, configuracoes)
- Lista de steps com drag-and-drop para reordenar
- Formulario de step com seletor de `actionType` que adapta o `actionConfig`:
  - `send_skill`: campo para skillSlug + optional fallbackTemplateName
  - `send_template`: campo para templateName + templateLang
  - `update_stage`: seletor de stage do projeto
  - `score_lead`: campo numerico para scoreAdjustment
  - `wait_reply`: campo de timeoutHours
- Seletor de `windowMode` com explicacao de cada opcao

**Verification:**
- Operador consegue criar cadencia com steps via UI

---

### T15: Criar UI de enrollment no ticket panel

**Files:**
- Modify: `src/components/dashboard/whatsapp/inbox/ticket-panel.tsx`

**What to do:**
- Adicionar secao "Cadencias" no painel lateral do ticket
- Mostrar enrollments ativos do lead
- Botao "Inscrever em cadencia" → dropdown com cadencias disponiveis do projeto
- Status de cada enrollment: passo atual, proximo passo em X horas, status
- Botoes: pausar, retomar, interromper

**Verification:**
- Operador consegue inscrever e gerenciar cadencias pelo inbox

---

### T16: Criar UI de enrollment no detalhe do lead

**Files:**
- Modify: `src/components/dashboard/leads/new-lead-drawer.tsx`

**What to do:**
- Adicionar tab ou secao "Cadencias" no detalhe do lead
- Mesmo controle do ticket panel: lista de enrollments + acao de inscrever

**Verification:**
- Operador consegue ver e gerenciar cadencias pelo detalhe do lead

---

### T17: Testes unitarios do runtime de cadencias

**Files:**
- Create: `src/services/ai/ai-cadence-runner.service.spec.ts`
- Create: `src/services/ai/ai-cadence-enrollment.service.spec.ts`

**What to do:**
- Testar cada `actionType` do runner
- Testar window-aware: OPEN com janela fechada → fallback
- Testar interrupcao de cadencia quando cliente responde
- Testar idempotencia do `enroll`
- Testar `wait_reply` com timeout expirado vs resposta do cliente

**Verification:**
- Cobertura dos casos de borda do window-aware

---

### T18: Validacao final

**What to do:**
- `npm run lint` → 0 erros
- `npm run build` → sucesso
- `npm run test` → todos os novos testes passando
- Smoke test manual: criar cadencia com 2 steps, inscrever lead, verificar `AiEvent` e execucao do step 1, aguardar step 2
