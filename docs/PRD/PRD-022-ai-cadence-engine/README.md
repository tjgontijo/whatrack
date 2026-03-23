# PRD-022: AI Cadence Engine

**Status:** Draft
**Data:** 2026-03-23
**Versao:** 1.0

---

## O Que e Este PRD?

Este PRD implementa o motor de cadencias de follow-up do WhaTrack. Uma cadencia e uma sequencia de touchpoints automatizados, com delays configurados, que o agente executa em nome do projeto para manter contato com leads ao longo do tempo.

A grande diferenca para um simples "agendar mensagem" e o comportamento window-aware: o agente sabe se a janela de 24h do WhatsApp esta aberta ou fechada, e adapta o tipo de mensagem automaticamente — texto livre (dentro da janela) ou template aprovado pela Meta (fora da janela).

---

## Estrutura do PRD

```
PRD-022-ai-cadence-engine/
|-- README.md
|-- CONTEXT.md
|-- DIAGNOSTIC.md
|-- TASKS.md
`-- QUICK_START.md
```

---

## Resumo Executivo

### Objetivo

- Implementar a execucao de steps de cadencia via Inngest (function + cron).
- Implementar o worker de cada tipo de step: `send_skill`, `send_template`, `update_stage`, `score_lead`, `wait_reply`.
- Implementar logica window-aware: OPEN executa skill, CLOSED executa template, ANY decide no runtime.
- Implementar interrupcao de cadencia quando o cliente responde (`customer_replied`).
- Implementar UI de gestao de cadencias por projeto.
- Implementar UI de enrollment manual de um lead em uma cadencia.
- Registrar `AiEvent` para cada acao da cadencia.

### Status Atual

- Modelos `AiCadence`, `AiCadenceStep`, `AiCadenceEnrollment` existem no schema (PRD-018).
- Nao existe nenhum worker que processe os steps.
- Nao existe UI de gestao de cadencias.
- O Inngest esta configurado (PRD-018) mas sem functions de cadencia.

### Escopo

**Entra:**

- Function Inngest de polling de cadencias (`ai/cadence.step.due`)
- Worker de execucao de cada tipo de step
- Logica window-aware com fallback para template
- Interrupcao automatica quando cliente responde
- API CRUD de cadencias e steps
- API de enrollment e desenrollment manual
- UI de listagem e criacao de cadencias
- UI de enrollment do lead em uma cadencia (via ticket panel ou detalhe do lead)
- Registro de `AiEvent` para cada acao de cadencia

**Fica fora:**

- Analytics de performance de cadencia (metricas de conversao, taxas de resposta) — V2
- Cadencias com branches condicionais (if/else por resposta do cliente) — V2
- A/B testing de steps — V2
- Integracao com campanhas (cadencia disparada por campanha) — PRD-021

### Estimativa

- 3 fases para runtime + UI completa

---

## Arquivos/Areas Principais

- `prisma/schema.prisma` (ja tem os modelos — nao adicionar nada novo)
- `src/lib/inngest/functions/cadence-step.ts` (nova function Inngest)
- `src/services/ai/ai-cadence.service.ts` (CRUD)
- `src/services/ai/ai-cadence-runner.service.ts` (execucao de steps)
- `src/services/ai/ai-cadence-enrollment.service.ts` (enrollment e interrupcao)
- `src/app/api/v1/ai/cadences/` (routes)
- `src/components/dashboard/ai/cadences/` (UI)

---

## Dependencias

**Pre-requisitos obrigatorios (em ordem):**

1. PRD-018: AI Foundation Layer — `AiCadence`, `AiCadenceStep`, `AiCadenceEnrollment` no schema, `AiEventService`, `LeadAiContextService`, Inngest configurado
2. PRD-012: Core Runtime WhatsApp AI — `skill-runner.ts`, `whatsapp-ai-send.service.ts`, `AiConversationState`

---

## Como Ler Este PRD

1. `CONTEXT.md` — definicoes, fluxo e regras de negocio
2. `DIAGNOSTIC.md` — decisoes tecnicas e riscos
3. `TASKS.md` — tarefas por fase
4. `QUICK_START.md` — guia de execucao

---

## Proximo Passo

Concluir PRD-012, entao iniciar pela Fase 1 deste PRD (function Inngest + worker de steps).
