# Tasks: PRD-012 Core Runtime WhatsApp AI

**Data:** 2026-03-23 (v2.0)
**Status:** Draft
**Total:** 19
**Estimado:** 3 fases

---

## Pre-requisito Obrigatorio

**PRD-018 deve estar concluido antes de iniciar qualquer task deste PRD.**

O PRD-018 entrega: Mastra setup, Inngest client, `executePrompt`, `AiEventService`, `LeadAiContextService`, `AiAgentRegistryService`, seed de agentes. Nao duplicar nada disso aqui.

---

## Ordem De Execucao

| Fase | Descricao | Tasks |
|------|-----------|-------|
| Fase 1 | Schema + provisioning do runtime | T1-T5 |
| Fase 2 | Buffer + transporte + workflow | T6-T14 |
| Fase 3 | UI minima + testes + cutover | T15-T19 |

---

## FASE 1 - Schema e Provisioning do Runtime

### T1: Adicionar modelos especificos do runtime ao schema Prisma

**Files:**
- Modify: `prisma/schema.prisma`

**What to do:**

Adicionar os seguintes modelos (ver definicoes completas no CONTEXT.md):

- `AiProjectConfig` (unique por projectId)
- `AiConversationState` (unique por conversationId)
- `AiSkill` com slug + projectId
- `AiSkillVersion` com isPublished
- `AiSkillExecutionLog` com executionKey unico + FK para AiEvent
- `AiCrisisKeyword` com escalationResponse

Adicionar relacoes inversas nos modelos existentes:
- `Project` → `aiProjectConfig AiProjectConfig?`
- `Conversation` → `aiConversationState AiConversationState?`
- `Ticket` → `aiSkillExecutionLogs AiSkillExecutionLog[]`

**Nao adicionar:** `LeadAiContext`, `AiEvent`, `AiAgent`, `AiCadence` — esses pertencem ao PRD-018.

**Relacao inversa obrigatoria em AiEvent (do PRD-018):**

`AiSkillExecutionLog` referencia `AiEvent` via `aiEventId`. Ao adicionar esse modelo, tambem adicionar a relacao inversa no modelo `AiEvent` ja existente:

```prisma
// Em model AiEvent (ja existente, PRD-018):
executionLog AiSkillExecutionLog?
```

**Verification:**
- `npx prisma validate` sem erros
- `npx prisma migrate dev --name add_ai_runtime` sem erros

---

### T2: Seed das skills minimas da V1

**Files:**
- Modify: `prisma/seeds/ai-skills.ts` (criar se nao existir)
- Modify: `prisma/seed.ts`

**What to do:**
Fazer upsert das 6 skills minimas com versao publicada:

```typescript
const v1Skills = [
  { slug: 'send-welcome', mode: 'deterministic', prompt: '...' },
  { slug: 'collect-lead-qualification', mode: 'llm', prompt: '...' },
  { slug: 'explain-product-service', mode: 'llm', prompt: '...' },
  { slug: 'send-pricing', mode: 'deterministic', prompt: '...' },
  { slug: 'human-handoff', mode: 'deterministic', prompt: '...' },
  { slug: 'out-of-hours-reply', mode: 'deterministic', prompt: '...' },
]
```

Cada skill deve ter uma `AiSkillVersion` com `isPublished: true`.

**Verification:**
- `npx prisma db seed` sem erros
- 6 skills e 6 versoes publicadas existem no banco

---

### T3: Seed de crisis keywords default

**Files:**
- Modify: `prisma/seeds/ai-crisis-keywords.ts` (criar se nao existir)

**What to do:**
Seed de palavras de crise default (ex: "suicidio", "emergencia", "acidente", "socorro").
Cada keyword tem uma `escalationResponse` padrao.

**Verification:**
- Keywords existem na tabela apos seed

---

### T4: Criar `ensureAiProjectDefaults()`

**Files:**
- Create: `src/services/ai/ai-project-defaults.service.ts`

**What to do:**
- Criar `AiProjectConfig` com dados vazios (businessName, etc.) se nao existir
- Chamar `AiAgentRegistryService.provisionDefaults()` do PRD-018 para criar configs de agente
- Tornar idempotente (upsert)

```typescript
export async function ensureAiProjectDefaults(projectId: string, orgId: string): Promise<void>
```

**Verification:**
- Chamadas repetidas nao duplicam registros

---

### T5: Integrar provisioning no ciclo de projeto

**Files:**
- Modify: `src/services/projects/project.service.ts`
- Modify: `src/services/onboarding/welcome-onboarding.service.ts`

**What to do:**
- Chamar `ensureAiProjectDefaults(projectId, orgId)` ao criar projeto
- Chamar no projeto inicial do onboarding

**Verification:**
- Projeto novo tem `AiProjectConfig` e `AiAgentProjectConfig` criados automaticamente

---

## FASE 2 - Buffer + Transporte + Workflow

### T6: Criar `ai-conversation-state.service.ts`

**Files:**
- Create: `src/services/ai/ai-conversation-state.service.ts`

**What to do:**

```typescript
getConversationState(conversationId: string): Promise<AiConversationState | null>
appendPendingMessage(conversationId: string, message: PendingMessage): Promise<void>
clearPendingMessagesIfSnapshotMatches(conversationId: string, fingerprint: string): Promise<boolean>
markProcessedFingerprint(conversationId: string, fingerprint: string): Promise<void>
generateFingerprint(messages: PendingMessage[]): string  // hash SHA-256
```

**Verification:**
- Append e clear sao seguros com concorrencia (usar transacao Prisma)

---

### T7: Adicionar envio de texto livre na camada WhatsApp

**Files:**
- Modify: `src/services/whatsapp/meta-cloud.service.ts`

**What to do:**
- Criar `sendTextMessage({ phoneId, to, text, accessToken? })`
- Manter `sendTemplate()` intacto

**Verification:**
- Texto livre e templates coexistem sem conflito

---

### T8: Criar `whatsapp-ai-send.service.ts`

**Files:**
- Create: `src/services/ai/whatsapp-ai-send.service.ts`

**What to do:**
- Resolver `WhatsAppConfig` por `instanceId`
- Enviar texto livre (janela aberta) ou template (janela fechada)
- Retornar `wamid` e resultado por mensagem
- Nao persistir `Message` local — isso e feito pelo webhook echo

**Verification:**
- Service retorna `{ wamid, success }` para cada mensagem

---

### T9: Criar function Inngest de debounce

**Files:**
- Create: `src/lib/inngest/functions/whatsapp-message.ts`

**What to do:**

```typescript
export const processWhatsAppMessage = inngest.createFunction(
  {
    id: 'process-whatsapp-message',
    debounce: { key: 'event.data.conversationId', period: '8s' },
    concurrency: { limit: 1, key: 'event.data.conversationId' },
  },
  { event: 'whatsapp/message.received' },
  async ({ event, step }) => {
    await step.run('execute-workflow', () =>
      runInboundMessageWorkflow(event.data)
    )
  }
)
```

- Modificar (nao criar) `src/app/api/inngest/route.ts` — a rota ja existe do PRD-018.
- Adicionar `processWhatsAppMessage` ao array de functions do handler existente.

**Verification:**
- Function aparece no dashboard do Inngest local

---

### T10: Integrar append + evento no webhook de inbound

**Files:**
- Modify: `src/services/whatsapp/handlers/message.handler.ts`

**What to do:**
- Dentro da transaction CRM existente: chamar `appendPendingMessage()`
- Apos commit: chamar `inngest.send('whatsapp/message.received', { conversationId, orgId, messageId })`
- Remover chamada legada para `enqueueForClassification()` ou `dispatchAiEvent()`

**Verification:**
- Inbound nao usa mais cron ou fila legada
- `AiConversationState.pendingMessages` cresce a cada inbound

---

### T11: Criar `skill-runner.ts`

**Files:**
- Create: `src/services/ai/skill-runner.ts`

**What to do:**

```typescript
interface SkillRunnerInput {
  skillSlug: string
  context: SkillContext  // { projectConfig, leadContext, pendingMessages, ticketInfo }
}

interface SkillOutput {
  text: string
  messageParts: string[]
  stateUpdates?: Partial<LeadAiContext>
  nextSkillSlug?: string  // para chaining simples
}

export async function runSkill(input: SkillRunnerInput): Promise<Result<SkillOutput>>
```

Modo `deterministic`: interpolar variaveis do template com dados do contexto.
Modo `llm`: chamar `executePrompt()` com o prompt da skill + contexto serializado.
Fallback: se skill nao encontrada ou erro, executar `human-handoff`.

**Verification:**
- Modo deterministic funciona sem chamar LLM
- Modo llm chama `executePrompt`
- Fallback e testavel

---

### T12: Criar workflow `inbound-message`

**Files:**
- Create: `src/mastra/workflows/inbound-message.ts`

**What to do:**
Implementar os 13 passos descritos no CONTEXT.md usando Mastra Workflow steps.

Cada passo que executa IA deve:
1. Chamar `AiEventService.record()` com o tipo correspondente
2. Retornar dados para o proximo passo

**Verification:**
- Workflow exportado sem erros de compilacao
- Todos os 13 passos implementados

---

### T13: Implementar idempotencia de outbound

**Files:**
- Modify: `src/mastra/workflows/inbound-message.ts`
- Create: `src/services/ai/ai-skill-execution-log.service.ts`

**What to do:**
- Antes de enviar: gerar `executionKey = hash(conversationId + fingerprint)`
- Verificar se ja existe `AiSkillExecutionLog` com esse `executionKey` e `success: true`
- Se ja existe: pular envio e registrar `AiEvent(SKIPPED)`
- Se nao existe: enviar e salvar `AiSkillExecutionLog` com resultado

**Verification:**
- Retry do Inngest nao duplica resposta no WhatsApp

---

### T14: Criar `ai-project-config.service.ts`

**Files:**
- Create: `src/services/ai/ai-project-config.service.ts`

**What to do:**

```typescript
getProjectConfig(projectId: string): Promise<AiProjectConfig | null>
upsertProjectConfig(projectId: string, data: AiProjectConfigInput): Promise<AiProjectConfig>
```

**Verification:**
- Service funciona para leitura e escrita

---

## FASE 3 - UI Minima + Testes + Cutover

### T15: Criar API minima de configuracao do agente

**Files:**
- Create: `src/app/api/v1/ai/config/route.ts`
- Create: `src/schemas/ai/ai-project-config.schema.ts`

**What to do:**
- `GET /api/v1/ai/config` — retorna `AiProjectConfig` + `AiAgentProjectConfig` do agente inbound
- `PUT /api/v1/ai/config` — atualiza campos de configuracao
- Autorizacao: `manage:ai`

**Verification:**
- Rota responde corretamente com dados do projeto

---

### T16: Criar UI minima do agente

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/page.tsx`
- Create: `src/components/dashboard/ai/agent-config-form.tsx`

**What to do:**
- Toggle de ativar/pausar agente (via `AiAgentProjectConfig.enabled` e `.paused`)
- Campos de configuracao: `businessName`, `assistantName`, `escalationContact`
- Seletor de horario comercial simplificado
- Toggle de testing mode + campo de whitelist de phones
- Salvar via `PUT /api/v1/ai/config`

**Verification:**
- Usuario consegue ativar, pausar e configurar o agente

---

### T17: Adicionar timeline de AiEvent no inbox

**Files:**
- Modify: `src/components/dashboard/whatsapp/inbox/ticket-panel.tsx`

**What to do:**
- Remover leitura de `AiInsight` (legado)
- Adicionar leitura de `AiEvent` via `GET /api/v1/ai/events?ticketId=...`
- Exibir eventos de IA inline no timeline do ticket (SKILL_EXECUTED, MESSAGE_SENT, CRISIS_DETECTED, etc.)

**Verification:**
- Inbox nao chama mais endpoint de AiInsight
- Timeline mostra acoes do agente junto com mensagens

---

### T18: Testes unitarios do runtime

**Files:**
- Create: `src/services/ai/ai-conversation-state.service.spec.ts`
- Create: `src/services/ai/skill-runner.spec.ts`
- Create: `src/services/ai/whatsapp-ai-send.service.spec.ts`

**What to do:**
- Testar append/clear seguro do buffer
- Testar skill-runner modo deterministic e llm
- Testar idempotencia de outbound
- Testar kill switch e out-of-hours

**Verification:**
- Todos os novos testes passam

---

### T19: Validacao final

**What to do:**
- `npm run lint` → 0 erros
- `npm run build` → sucesso
- `npm run test` → todos os novos testes passando
- Smoke test manual: enviar mensagem inbound real, verificar outbound, verificar `AiEvent` no banco
