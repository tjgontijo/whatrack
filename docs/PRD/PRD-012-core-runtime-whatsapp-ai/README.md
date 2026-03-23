# PRD-012: Core Runtime WhatsApp AI

**Status:** Draft (Reescrito em 2026-03-23)
**Versao:** 2.0

---

## O Que E Este PRD?

Este PRD entrega o runtime minimo de IA para atendimento automatizado no WhatsApp. Ele assume que a fundacao de dados e infraestrutura ja foi entregue pelo PRD-018 (`LeadAiContext`, `AiEvent`, `AiAgent`, Mastra, Inngest configurados).

O foco e um unico caminho confiavel de producao:

```
inbound -> debounce -> triage -> skill -> outbound -> AiEvent log
```

Tudo que nao for essencial para esse caminho fica fora.

---

## Estrutura Do PRD

```text
PRD-012-core-runtime-whatsapp-ai/
├── README.md
├── CONTEXT.md
├── DIAGNOSTIC.md
├── TASKS.md
└── QUICK_START.md
```

---

## Resumo Executivo

### Objetivo

- Definir `AiProjectConfig`: configuracao do agente por projeto (blueprint ativo, business hours, testing mode).
- Definir `AiConversationState`: buffer de mensagens pendentes por conversa para debounce.
- Definir `AiSkill` e `AiSkillVersion`: skills versionadas que o agente executa.
- Definir `AiSkillExecutionLog`: log de execucao de cada skill.
- Definir `AiCrisisKeyword`: palavras que trigam escalada imediata.
- Implementar a function Inngest de debounce por `conversationId` (usando o client do PRD-018).
- Implementar o workflow inbound-message com 13 passos via Mastra (usando o runtime do PRD-018).
- Implementar envio outbound idempotente via camada WhatsApp existente.
- Registrar `AiEvent` (via `AiEventService` do PRD-018) para cada acao relevante do workflow.
- Atualizar `LeadAiContext` (via `LeadAiContextService` do PRD-018) ao final de cada conversa.
- Entregar UI minima de configuracao do agente por projeto.

### Status Atual

- A IA atual gera `AiInsight` para aprovacao humana (legado removido pelo PRD-018).
- O debounce depende de Redis + cron (substituido pelo Inngest nativo do PRD-018).
- Nao existe skill runner com modo deterministic/llm.
- Nao existe transporte outbound do agente.

### Escopo - O Que Entra

- Schema: `AiProjectConfig`, `AiConversationState`, `AiSkill`, `AiSkillVersion`, `AiSkillExecutionLog`, `AiCrisisKeyword`
- Provisioning de defaults por projeto: `ensureAiProjectDefaults()`
- Function Inngest: `whatsapp/message.received` com debounce nativo (8s por `conversationId`)
- Workflow Mastra: inbound-message com 13 passos (ver CONTEXT.md)
- `skill-runner.ts`: execucao de skills em modo deterministic e llm
- Envio outbound idempotente via camada WhatsApp existente
- Registro de `AiEvent` para cada acao do workflow
- Atualizacao de `LeadAiContext` ao final do workflow
- Kill switch: `agentEnabled` / `paused` via `AiAgentProjectConfig` (PRD-018)
- UI minima: toggle de agente, seletor de blueprint, business hours, testing mode

### Escopo - O Que Fica Fora

- Editor completo de skills (PRD-013)
- Versionamento e publicacao via UI (PRD-013)
- Cadencias proativas (PRD-022)
- Agentes de inteligencia (PRD-019/020/021)
- Setup de Mastra, Inngest ou modelos de fundacao (PRD-018)

### Estimativa

3 fases. O objetivo e fechar inbound -> reply -> log sem abrir toda a plataforma de governanca.

---

## Arquivos/Areas Principais

### Base Atual Impactada

- `src/app/api/v1/whatsapp/webhook/route.ts`
- `src/services/whatsapp/`
- `src/services/ai/`
- `src/components/dashboard/whatsapp/inbox/ticket-panel.tsx`
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/page.tsx`

### Novas Areas

- `src/mastra/workflows/inbound-message.ts`
- `src/mastra/skills/`
- `src/services/ai/ai-project-config.service.ts`
- `src/services/ai/ai-conversation-state.service.ts`
- `src/services/ai/skill-runner.ts`
- `src/services/ai/whatsapp-ai-send.service.ts`
- `src/lib/inngest/functions/whatsapp-message.ts`

### Banco De Dados (modelos especificos deste PRD)

- `AiProjectConfig` — configuracao do agente por projeto
- `AiConversationState` — buffer de mensagens pendentes com `pendingMessages`
- `AiSkill` — skill disponivel no runtime
- `AiSkillVersion` — versao publicada de uma skill
- `AiSkillExecutionLog` — log de execucao de cada skill
- `AiCrisisKeyword` — palavras de escalada imediata

---

## Dependencias

**Pre-requisitos obrigatorios (em ordem):**

1. PRD-011: Remocao da implementacao legada de IA
2. PRD-018: AI Foundation Layer — modelos `LeadAiContext`, `AiEvent`, `AiAgent`, `AiAgentProjectConfig`, Mastra setup, Inngest client, `executePrompt`, `LeadAiContextService`, `AiEventService`, `AiAgentRegistryService`

---

## Como Ler Este PRD

1. `CONTEXT.md` — modelos, fluxo e regras de negocio
2. `DIAGNOSTIC.md` — decisoes tecnicas e riscos
3. `TASKS.md` — tarefas por fase
4. `QUICK_START.md` — guia de execucao

---

## Proximo Passo

Concluir PRD-018, entao iniciar pela Fase 1 deste PRD (schema dos modelos especificos do runtime).
