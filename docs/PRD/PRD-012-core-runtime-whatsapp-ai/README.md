# PRD-012: Core Runtime WhatsApp AI

**Status:** Draft (Revisado em 2026-03-23)
**Versao:** 2.2

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

- Introduzir a permissao `manage:ai` para configuracao operacional do runtime por projeto.
- Definir `AiProjectConfig`: configuracao do agente por projeto (`blueprintSlug`, business hours, testing mode, debounce).
- Definir `AiConversationState`: buffer de mensagens pendentes por conversa para debounce.
- Definir `AiSkill` e `AiSkillVersion`: skills versionadas que o agente executa.
- Definir `AiSkillExecutionLog`: log de execucao de cada skill.
- Definir `AiCrisisKeyword`: palavras que trigam escalada imediata.
- Implementar a function Inngest de debounce por `conversationId` (usando o client do PRD-018).
- Implementar o workflow inbound-message com 13 passos via Mastra (usando o runtime do PRD-018).
- Implementar envio outbound idempotente via camada WhatsApp existente.
- Registrar `AiEvent` (via `AiEventService` do PRD-018) para cada acao relevante do workflow.
- Atualizar `LeadAiContext` (via `LeadAiContextService` do PRD-018) ao final de cada conversa.
- Entregar API minima de configuracao do agente por projeto.

### Status Atual

- A IA atual ainda reflete um desenho legado de classificacao + aprovacao humana e nao deve ser reintroduzida nesta trilha.
- O debounce depende de Redis + cron (substituido pelo Inngest do PRD-018).
- Nao existe skill runner com modo deterministic/llm.
- Nao existe transporte outbound do agente.
- O catalogo atual de permissoes ainda nao possui `manage:ai`.

### Escopo - O Que Entra

- Schema: `AiProjectConfig`, `AiConversationState`, `AiSkill`, `AiSkillVersion`, `AiSkillExecutionLog`, `AiCrisisKeyword`
- Provisioning de defaults por projeto: `ensureAiProjectDefaults()`
- Function Inngest: `whatsapp/message.received` com debounce nativo (8s por `conversationId`)
- Workflow Mastra: inbound-message com 13 passos (ver CONTEXT.md)
- `skill-runner.ts`: execucao de skills em modo deterministic e llm
- Envio outbound idempotente via camada WhatsApp existente
- Registro de `AiEvent` para cada acao do workflow
- Atualizacao de `LeadAiContext` ao final do workflow
- Kill switch: `enabled` / `paused` via `AiAgentProjectConfig` (PRD-018)
- API minima: leitura/escrita de config por projeto protegida por `manage:ai`

### Escopo - O Que Fica Fora

- Editor completo de skills (PRD-013)
- Superficie de UI do AI Studio (PRD-013 / PRD-014)
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
- `src/lib/ai/`
- `src/components/dashboard/whatsapp/inbox/ticket-panel.tsx`

### Novas Areas

- `src/server/mastra/workflows/inbound-message.ts`
- `src/server/inngest/functions/whatsapp-message.ts`
- `src/lib/ai/services/ai-project-config.service.ts`
- `src/lib/ai/services/ai-project-defaults.service.ts`
- `src/lib/ai/services/ai-conversation-state.service.ts`
- `src/lib/ai/services/skill-runner.ts`
- `src/lib/ai/services/whatsapp-ai-send.service.ts`
- `src/lib/ai/services/ai-skill-execution-log.service.ts`
- `src/lib/ai/schemas/*`
- `src/app/api/v1/ai/config/route.ts`

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

1. Baseline sem reintroduzir a implementacao legada de `AiInsight`/aprovacao humana no caminho critico
2. PRD-018: AI Foundation Layer — modelos `LeadAiContext`, `AiEvent`, `AiAgent`, `AiAgentProjectConfig`, Mastra setup, Inngest client, `executePrompt`, `LeadAiContextService`, `AiEventService`, `AiAgentRegistryService`

---

## Como Ler Este PRD

1. `CONTEXT.md` — modelos, fluxo e regras de negocio
2. `DIAGNOSTIC.md` — decisoes tecnicas e riscos
3. `TASKS.md` — tarefas por fase
4. `QUICK_START.md` — guia de execucao

---

## Proximo Passo

Com o PRD-018 concluido, iniciar pela Fase 1 deste PRD: permissao `manage:ai`, schema do runtime e provisioning por projeto.
