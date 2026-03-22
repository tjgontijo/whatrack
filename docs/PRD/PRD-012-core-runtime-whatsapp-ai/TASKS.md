# Tasks: PRD-012 Core Runtime WhatsApp AI

**Data:** 2026-03-21
**Status:** In Review
**Total:** 24
**Estimado:** 5 fases

---

## Ordem De Execucao

| Fase | Descricao | Tasks |
|---|---|---|
| Fase 1 | Schema e provisioning | T1-T5 |
| Fase 2 | Buffer + transporte | T6-T10 |
| Fase 3 | Runtime Mastra | T11-T16 |
| Fase 4 | UI minima + cutover | T17-T21 |
| Fase 5 | Testes e validacao | T22-T24 |

---

## FASE 1 - Schema E Provisioning

### T1: Instalar dependencias novas

**Files:**
- Modify: `package.json`

**What to do:**
- instalar `inngest`
- instalar `@mastra/loggers`
- nao incluir dependencias de storage/memory do Mastra no V1

**Verification:**
- dependencias aparecem no `package.json`

### T2: Atualizar schema Prisma do runtime V1

**Files:**
- Modify: `prisma/schema.prisma`

**What to do:**
- adicionar:
  - `AiProjectConfig`
  - `AiBlueprintActivation`
  - `AiSkill`
  - `AiSkillVersion`
  - `AiConversationState`
  - `AiSkillExecutionLog`
  - `AiCrisisKeyword`
- assumir schema limpo depois do PRD-011

**Verification:**
- `bash scripts/reset-db.sh` roda sem erro

### T3: Criar seeds locais da V1

**Files:**
- Modify: `prisma/seeds/index.ts`
- Create or Modify: `prisma/seeds/*`

**What to do:**
- seedar blueprint default
- seedar 6 skills minimas da V1
- seedar keywords de crise default

**Verification:**
- ambiente local sobe com defaults da V1

### T4: Criar service `ensureAiProjectDefaults()`

**Files:**
- Create: `src/services/ai/ai-project-defaults.service.ts`

**What to do:**
- criar config minima do projeto
- ativar blueprint default
- criar skills base e policies default
- tornar idempotente

**Verification:**
- chamadas repetidas nao duplicam registros

### T5: Integrar provisioning no ciclo de projeto

**Files:**
- Modify: `src/services/projects/project.service.ts`
- Modify: `src/services/onboarding/welcome-onboarding.service.ts`

**What to do:**
- chamar `ensureAiProjectDefaults()` ao criar projeto manualmente
- chamar `ensureAiProjectDefaults()` no projeto inicial do onboarding

**Verification:**
- todo projeto novo nasce pronto para a V1

---

## FASE 2 - Buffer + Transporte

### T6: Criar service de estado de conversa

**Files:**
- Create: `src/services/ai/ai-conversation-state.service.ts`

**What to do:**
- expor:
  - `getConversationState()`
  - `appendPendingMessage()`
  - `saveConversationState()`
  - `markProcessedFingerprint()`
  - `clearPendingMessagesIfSnapshotMatches()`
  - `createFallbackConversationState()`

**Verification:**
- service cobre append, leitura de snapshot e clear seguro

### T7: Adicionar envio de texto livre na camada WhatsApp

**Files:**
- Modify: `src/services/whatsapp/meta-cloud.service.ts`

**What to do:**
- criar `sendTextMessage({ phoneId, to, text, accessToken? })`
- manter `sendTemplate()` intacto

**Verification:**
- texto livre e templates coexistem

### T8: Criar `whatsapp-ai-send.service.ts`

**Files:**
- Create: `src/services/whatsapp/whatsapp-ai-send.service.ts`

**What to do:**
- resolver `WhatsAppConfig` por `instanceId`
- enviar `MessagePart[]`
- retornar resultado por mensagem
- nao persistir `Message` local manualmente

**Verification:**
- service envia e retorna `wamid`/resultado

### T9: Criar Inngest client, function e route

**Files:**
- Create: `src/inngest/client.ts`
- Create: `src/inngest/functions.ts`
- Create: `src/inngest/whatsapp-agent.ts`
- Create: `src/app/api/inngest/route.ts`

**What to do:**
- criar evento `whatsapp/message.received`
- debounce por `conversationId`

**Verification:**
- `/api/inngest` responde corretamente

### T10: Trocar scheduler legado por append + evento

**Files:**
- Modify: `src/services/whatsapp/handlers/message.handler.ts`

**What to do:**
- append em `pendingMessages` dentro da transaction
- emitir evento Inngest apos commit
- incluir runtime metadata necessaria

**Verification:**
- inbound nao depende mais de cron

---

## FASE 3 - Runtime Mastra

### T11: Criar schemas, prompts e factories de agents

**Files:**
- Create: `src/mastra/schemas/*`
- Create: `src/mastra/prompts/*`
- Create: `src/mastra/agents/*`
- Create: `src/mastra/index.ts`

**What to do:**
- adaptar a referencia para contexto comercial generico
- usar builders parametrizados por `AiProjectConfig`

**Verification:**
- runtime Mastra compila

### T12: Criar policies do runtime

**Files:**
- Create: `src/mastra/policies/safety-policy.ts`
- Create: `src/mastra/policies/business-rules-policy.ts`

**What to do:**
- `safety-policy` por projeto
- `business-rules-policy` com fallback para `human-handoff`

**Verification:**
- policies exportadas e tipadas

### T13: Criar `skill-output.ts` e `skill-context.ts`

**Files:**
- Create: `src/mastra/skills/skill-output.ts`
- Create: `src/mastra/skills/skill-context.ts`

**What to do:**
- padronizar output estruturado
- interpolar variaveis do projeto

**Verification:**
- schemas de output validam corretamente

### T14: Criar `skill-runner.ts`

**Files:**
- Create: `src/mastra/skills/skill-runner.ts`

**What to do:**
- carregar skill/version
- executar deterministic, hybrid e llm
- retornar `SkillOutput`
- fallback para `human-handoff`

**Verification:**
- `runSkill()` compila e executa

### T15: Criar workflow inbound-message

**Files:**
- Create: `src/mastra/workflows/inbound-message.ts`

**What to do:**
- carregar config do projeto
- respeitar `agentEnabled`
- ler snapshot do buffer
- fazer triage, safety e out-of-hours
- chamar `runSkill()`
- chamar `sendAiWhatsAppReply()`
- salvar state

**Verification:**
- fluxo completo exportado sem erro

### T16: Implementar idempotencia de outbound

**Files:**
- Modify: `src/services/ai/ai-conversation-state.service.ts`
- Modify: `src/mastra/workflows/inbound-message.ts`

**What to do:**
- gerar `executionKey` a partir do snapshot processado
- nao reenviar se a execucao ja foi marcada como concluida
- salvar fingerprint processado no estado
- salvar `executionKey` no log

**Verification:**
- retry nao duplica resposta

---

## FASE 4 - UI Minima + Cutover

### T17: Criar service de config por projeto

**Files:**
- Create: `src/services/ai/ai-project-config.service.ts`

**What to do:**
- expor leitura/escrita de `AiProjectConfig`
- validar escopo do projeto

**Verification:**
- service funciona para config minima da V1

### T18: Criar API minima de configuracao

**Files:**
- Create: `src/app/api/v1/ai/config/route.ts`

**What to do:**
- `GET` e `PUT` da config minima
- incluir `agentEnabled`

**Verification:**
- rota responde com dados do projeto correto

### T19: Criar UI minima do agente

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/page.tsx`
- Create or Modify: componentes minimos em `src/components/dashboard/ai/`

**What to do:**
- configurar dados basicos do projeto
- exibir kill switch
- permitir salvar config

**Verification:**
- usuario consegue ativar/pausar o agente

### T20: Criar observabilidade minima read-only

**Files:**
- Create: `src/app/api/v1/ai/execution-logs/route.ts`
- Modify: `src/components/dashboard/whatsapp/inbox/ticket-panel.tsx`

**What to do:**
- expor logs minimos
- trocar dependencia de `AiInsight` por atividade read-only do agente

**Verification:**
- inbox nao chama mais `/api/v1/ai-insights`

### T21: Cutover do caminho principal

**Files:**
- Modify: `src/services/whatsapp/handlers/message.handler.ts`

**What to do:**
- garantir que o caminho principal do inbound usa o runtime novo

**Verification:**
- runtime novo responde no caminho principal

---

## FASE 5 - Testes E Validacao

### T22: Criar testes unitarios e de integracao do runtime

**Files:**
- Create: `src/services/ai/__tests__/ai-conversation-state.service.test.ts`
- Create: `src/services/whatsapp/__tests__/whatsapp-ai-send.service.test.ts`
- Create: `src/mastra/skills/__tests__/skill-runner.test.ts`
- Create: `src/mastra/workflows/__tests__/inbound-message.test.ts`

**What to do:**
- testar append/clear seguro
- testar kill switch
- testar out-of-hours e crise
- testar idempotencia

**Verification:**
- testes novos passam

### T23: Criar smoke test funcional da V1

**Files:**
- No file changes required

**What to do:**
- enviar inbound real para ambiente de teste
- verificar evento Inngest
- verificar outbound
- verificar echo/status
- verificar execution log

**Verification:**
- caminho inbound -> reply -> log validado

### T24: Validacao final da V1

**Files:**
- No file changes required

**What to do:**
- rodar `npm run test`
- rodar `npm run build`
- rodar `npm run lint`

**Verification:**
- build, lint, testes e smoke test verdes
