# PRD-018: AI Foundation Layer

**Status:** Draft
**Data:** 2026-03-23
**Versao:** 1.0

---

## O Que e Este PRD?

Este PRD define a camada de fundacao necessaria para transformar o WhaTrack em um produto AI First. Ele nao implementa agentes, workflows ou UI de configuracao. Ele entrega os modelos de dados, abstracoes e infraestrutura que todos os PRDs subsequentes de IA consomem.

Sem esta fundacao, cada PRD de IA reinventaria seus proprios modelos de contexto, eventos e configuracao, gerando drift e inconsistencia.

---

## Estrutura do PRD

```
PRD-018-ai-foundation-layer/
|-- README.md
|-- CONTEXT.md
|-- DIAGNOSTIC.md
|-- TASKS.md
`-- QUICK_START.md
```

---

## Resumo Executivo

### Objetivo

- Definir e implementar o modelo `LeadAiContext`: contexto universal do cliente compartilhado por todos os agentes e superficies do produto.
- Definir e implementar o modelo `AiEvent`: timeline append-only de todas as acoes de IA, visivel no CRM ao lado de acoes humanas.
- Criar a registry de agentes (`AiAgent`) com configuracao por projeto.
- Modelar o sistema de cadencias (`AiCadence`, `AiCadenceStep`, `AiCadenceEnrollment`) para follow-ups window-aware.
- Configurar Mastra com adaptador PostgreSQL (`@mastra/pg`) como runtime de agentes.
- Criar a camada de abstracao `executePrompt` que isola o produto de mudancas de API do framework.
- Instalar e configurar Inngest como engine de eventos assincronos e debounce.

### Status Atual

- Nao existem modelos de contexto de IA no schema.
- `AiInsight` e `AiInsightCost` existem para custo/tracking, mas nao representam contexto de agente.
- Nao existe timeline unificada de acoes de IA.
- Nao existe registry de agentes por projeto.
- Nao existe modelagem de cadencias.
- Mastra e Inngest nao estao instalados.

### Escopo

**Entra:**

- `LeadAiContext` com profile, long_memory, lifecycle_stage, aiScore, suggestedNextAction
- `AiEvent` append-only com tipos para toda acao de IA
- `AiAgent` registry com configuracao por projeto (`AiAgentProjectConfig`)
- `AiCadence`, `AiCadenceStep`, `AiCadenceEnrollment` para sequencias de follow-up
- Instalacao e configuracao do Mastra com `@mastra/pg`
- Instalacao e configuracao do Inngest
- Camada `executePrompt` com fallback e logging estruturado
- Service de contexto: `LeadAiContextService` para enriquecer/atualizar contexto
- Service de eventos: `AiEventService` para registrar e consultar timeline
- Seeds e migracao Prisma

**Fica fora:**

- Workflow de inbound message (PRD-012)
- UI de configuracao de agentes (PRD-013)
- Execucao real de cadencias por cron/Inngest (PRD-022)
- Skills, blueprints e prompts (PRD-012/013)
- Inteligencia de audiencia, CRM ou campanha (PRD-019/020/021)

### Estimativa

- 1 sprint para schema + services + infra

---

## Arquivos/Areas Principais

- `prisma/schema.prisma` (novos modelos)
- `src/services/ai/lead-ai-context.service.ts`
- `src/services/ai/ai-event.service.ts`
- `src/services/ai/ai-agent-registry.service.ts`
- `src/services/ai/execute-prompt.ts`
- `src/lib/mastra/index.ts` (setup Mastra)
- `src/lib/inngest/client.ts` (setup Inngest)
- `src/schemas/ai/` (Zod schemas)

---

## Dependencias

Este PRD nao depende de nenhum outro PRD nao concluido.

Ele e pre-requisito direto de:

- PRD-012 (Core Runtime WhatsApp AI)
- PRD-013 (AI Studio Platform)
- PRD-022 (AI Cadence Engine)
- PRD-019/020/021 (Intelligence Agents)

---

## Como Ler Este PRD

1. `CONTEXT.md` — definicoes, semantica e regras de negocio
2. `DIAGNOSTIC.md` — problemas, abordagens e riscos
3. `TASKS.md` — tarefas ordenadas por fase
4. `QUICK_START.md` — guia rapido de execucao

---

## Proximo Passo

Validar este PRD e iniciar a execucao pela Fase 1 (schema Prisma + migracao).
