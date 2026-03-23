# Tasks: PRD-018 AI Foundation Layer

**Data:** 2026-03-23
**Status:** Draft
**Total:** 18
**Estimado:** 3 fases

---

## Fase 1: Shared Foundation + Schema

### T1: Ajustar dependencias de runtime da fundacao

**Files:**
- Modify: `package.json`

**What to do:**
- Adicionar `@mastra/pg`
- Adicionar `inngest`
- Manter `@mastra/core` como dependencia existente
- Nao adicionar Jest; os testes deste PRD devem seguir Vitest

**Verification:**
- `package.json` contem `@mastra/core`, `@mastra/pg` e `inngest`

**Depends on:** -

---

### T2: Criar helper compartilhado `Result<T>`

**Files:**
- Create: `src/lib/shared/result.ts`

**What to do:**
- Definir `Result<T>` como uniao `{ success: true, data: T } | { success: false, error: string }`
- Exportar helpers `ok()` e `fail()`
- Padronizar este helper para todos os novos servicos de IA

**Verification:**
- O helper e importavel por qualquer modulo em `src/lib/ai/services/*`

**Depends on:** T1

---

### T3: Criar tipos e schemas base do dominio AI

**Files:**
- Create: `src/lib/ai/types/event-types.ts`
- Create: `src/lib/ai/types/lead-ai-context.ts`
- Create: `src/lib/ai/types/execute-prompt.ts`
- Create: `src/lib/ai/schemas/long-memory.ts`
- Create: `src/lib/ai/schemas/record-ai-event.ts`

**What to do:**
- Definir o union de tipos de `AiEvent`
- Definir os contratos compartilhados de `LongMemory`, `LeadAiContextUpdate`, `RecordAiEventInput` e `ExecutePromptInput`
- Garantir que os contratos operacionais relevantes aceitem `organizationId` e `projectId`
- Validar `history_summary` com maximo de 500 chars, `facts` com maximo de 20 itens e `preferences` com maximo de 10 itens

**Verification:**
- Os schemas cobrem os limites de `longMemory`
- `RecordAiEventInput` usa discriminated union por `type`

**Depends on:** T2

---

### T4: Atualizar `env.ts` para a infraestrutura de IA

**Files:**
- Modify: `src/lib/env/env.ts`

**What to do:**
- Incluir variaveis de ambiente necessarias para a nova infraestrutura
- Manter `DATABASE_URL` como fonte para Prisma e Mastra
- Adicionar as chaves do Inngest no schema de ambiente com estrategia compativel com desenvolvimento local

**Verification:**
- O projeto compila com o schema de ambiente atualizado
- Nao existem leituras novas de `process.env` fora do modulo de env

**Depends on:** T1

---

### T5: Adicionar os modelos project-aware ao Prisma

**Files:**
- Modify: `prisma/schema.prisma`

**What to do:**
- Adicionar `LeadAiContext`, `AiEvent`, `AiAgent`, `AiAgentProjectConfig`, `AiCadence`, `AiCadenceStep` e `AiCadenceEnrollment`
- Usar `organizationId` como padrao de naming, nao `orgId`
- Tornar `projectId` explicito em `LeadAiContext`, `AiEvent`, `AiAgentProjectConfig`, `AiCadence` e `AiCadenceEnrollment`
- Adicionar relacoes inversas em `Lead`, `Ticket`, `Project` e `Organization`
- Nao criar `@@unique([cadenceId, leadId])` em `AiCadenceEnrollment`
- Adicionar indices orientados a consultas por projeto, incluindo `(organizationId, projectId)` e `(organizationId, projectId, status, nextStepAt)` quando fizer sentido

**Verification:**
- `npx prisma validate` executa sem erros
- O schema permite re-enrollment historico em `AiCadenceEnrollment`

**Depends on:** T3

---

### T6: Gerar migracao Prisma da fundacao

**Files:**
- Create: `prisma/migrations/[timestamp]_add_ai_foundation/migration.sql`

**What to do:**
- Rodar `npx prisma migrate dev --name add_ai_foundation`
- Revisar o SQL gerado para garantir que so os novos objetos deste PRD foram introduzidos
- Confirmar que nao existe qualquer passo de migracao de legado neste PRD

**Verification:**
- `npx prisma migrate status` mostra a migracao aplicada
- O SQL nao tenta recriar ou remover estruturas do PRD-011

**Depends on:** T5

---

### T7: Criar seed idempotente dos agentes de sistema

**Files:**
- Create: `prisma/seeds/seed_ai_agents.ts`
- Modify: `prisma/seeds/index.ts`

**What to do:**
- Criar o seed com upsert dos agentes `whatsapp-inbound`, `whatsapp-cadence`, `audience-intelligence`, `crm-intelligence` e `campaign-intelligence`
- Referenciar o novo seed em `runSeed()`
- Garantir configuracoes default minimas e seguras

**Verification:**
- `npx prisma db seed` roda sem erros
- Os 5 agentes existem em `ai_agents`

**Depends on:** T6

---

## Fase 2: Infraestrutura de Execucao

### T8: Configurar runtime Mastra no backend

**Files:**
- Create: `src/server/mastra/index.ts`
- Create: `src/server/mastra/agents/index.ts`

**What to do:**
- Instanciar `Mastra` com `PgMemory` usando `env.DATABASE_URL`
- Criar um registry minimo de agentes placeholder, organizado por slug
- Exportar singleton de runtime para consumo pelos servicos

**Verification:**
- `src/server/mastra/index.ts` e importavel sem erro de runtime
- O runtime nao le `process.env` diretamente

**Depends on:** T4

---

### T9: Configurar client Inngest e rota base

**Files:**
- Create: `src/server/inngest/client.ts`
- Create: `src/server/inngest/events.ts`
- Create: `src/app/api/inngest/route.ts`

**What to do:**
- Criar `Events` tipados para os eventos iniciais do sistema
- Instanciar o client do Inngest com `EventSchemas`
- Criar a rota `/api/inngest`
- Nao registrar functions de negocio neste PRD

**Verification:**
- O client e importavel sem erros
- A rota `/api/inngest` existe e compila

**Depends on:** T4

---

### T10: Implementar `executePrompt`

**Files:**
- Create: `src/lib/ai/services/execute-prompt.ts`

**What to do:**
- Resolver o agente por `agentSlug`
- Encapsular a chamada ao runtime Mastra
- Retornar `Result<ExecutePromptResult>`
- Medir `durationMs`
- Registrar logs estruturados com `organizationId`, `projectId` e `agentSlug`

**Verification:**
- Chamada com `agentSlug` invalido retorna `fail()`
- Nenhum caller novo precisa importar Mastra diretamente

**Depends on:** T2, T3, T8

---

## Fase 3: Servicos, Queries e Testes

### T11: Implementar `LeadAiContextService`

**Files:**
- Create: `src/lib/ai/services/lead-ai-context.service.ts`

**What to do:**
- Implementar `ensureContext(leadId)`
- Implementar `updateContext(leadId, data)`
- Implementar `getContextForPrompt(leadId)`
- Implementar `updateLongMemory(leadId, memory)`
- Sincronizar `organizationId` e `projectId` a partir do lead para evitar drift manual

**Verification:**
- `ensureContext` cria na primeira chamada e retorna o mesmo registro nas seguintes
- `projectId` do contexto acompanha `Lead.projectId`

**Depends on:** T3, T5

---

### T12: Implementar `AiEventService`

**Files:**
- Create: `src/lib/ai/services/ai-event.service.ts`

**What to do:**
- Implementar `record(event)`
- Implementar timeline por lead e por ticket
- Implementar listagem e agregacao por `organizationId` + `projectId`
- Implementar `getUsageStats({ organizationId, projectId, period })`
- Derivar `projectId` quando o evento vier apenas com referencia a lead ou ticket

**Verification:**
- `record` faz apenas insert
- timelines retornam ordenacao `createdAt DESC`
- agregacoes aceitam filtro de projeto

**Depends on:** T3, T5

---

### T13: Implementar `AiAgentRegistryService`

**Files:**
- Create: `src/lib/ai/services/ai-agent-registry.service.ts`

**What to do:**
- Implementar `listAgents()`
- Implementar `getProjectConfig(agentSlug, projectId)`
- Implementar `upsertProjectConfig(agentSlug, projectId, config)`
- Implementar `isAgentEnabled(agentSlug, projectId)`
- Implementar `provisionDefaults(projectId, organizationId)`

**Verification:**
- Projetos sem config retornam `false` em `isAgentEnabled`
- `provisionDefaults` e idempotente

**Depends on:** T5, T7

---

### T14: Criar queries read-only para futuras superficies de UI

**Files:**
- Create: `src/lib/ai/queries/get-ai-timeline.ts`
- Create: `src/lib/ai/queries/get-project-ai-usage.ts`

**What to do:**
- Criar queries server-side somente de leitura para timeline e uso
- Aceitar filtros por `organizationId`, `projectId`, `leadId` e `ticketId` conforme o caso
- Nao criar tela de dashboard neste PRD

**Verification:**
- As queries conseguem atender future UI sem acessar servicos mutaveis
- O escopo por projeto e explicito no contrato

**Depends on:** T12

---

### T15: Testar `executePrompt` com Vitest

**Files:**
- Create: `src/lib/ai/services/__tests__/execute-prompt.test.ts`

**What to do:**
- Mockar o runtime Mastra com Vitest
- Testar retorno de `ok()` em sucesso
- Testar retorno de `fail()` quando o agente nao existe ou quando o runtime falha

**Verification:**
- O teste roda com Vitest
- Nao existe referencia a Jest

**Depends on:** T10

---

### T16: Testar `LeadAiContextService`

**Files:**
- Create: `src/lib/ai/services/__tests__/lead-ai-context.service.test.ts`

**What to do:**
- Testar criacao sob demanda
- Testar idempotencia de `ensureContext`
- Testar limites de `longMemory`
- Testar sincronizacao de `projectId`

**Verification:**
- Os casos de limite e sincronizacao passam
- O service nao exige `organizationId` manual quando puder derivar do lead

**Depends on:** T11

---

### T17: Testar `AiEventService` e `AiAgentRegistryService`

**Files:**
- Create: `src/lib/ai/services/__tests__/ai-event.service.test.ts`
- Create: `src/lib/ai/services/__tests__/ai-agent-registry.service.test.ts`

**What to do:**
- Testar append-only em `AiEventService`
- Testar timeline ordenada e agregacao por projeto
- Testar `isAgentEnabled` e `provisionDefaults`
- Testar `getProjectConfig` para projeto inexistente e projeto configurado

**Verification:**
- A agregacao por `projectId` e coberta em teste
- `provisionDefaults` nao duplica configs

**Depends on:** T12, T13

---

### T18: Validar build, lint, testes e smoke check de scoping

**Files:**
- Modify: `docs/PRD/PRD-018-ai-foundation-layer/QUICK_START.md`

**What to do:**
- Rodar `npm run lint`
- Rodar `npm run build`
- Rodar `npm run test`
- Fazer smoke check manual: criar contexto para lead com projeto definido, registrar evento, consultar timeline/uso filtrando por `projectId`

**Verification:**
- lint, build e testes passam
- o smoke check confirma a organizacao por `projectId`

**Depends on:** T15, T16, T17
