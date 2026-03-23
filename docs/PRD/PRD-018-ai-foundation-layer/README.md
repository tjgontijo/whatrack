# PRD-018: AI Foundation Layer

**Status:** Draft
**Data:** 2026-03-23
**Versao:** 1.1

---

## O Que e Este PRD?

Este PRD define a fundacao tecnica que os proximos PRDs de IA do WhaTrack vao consumir. Ele cobre schema, contratos de servico, runtime de execucao e infraestrutura minima para que o produto tenha contexto persistido, trilha auditavel e configuracao por projeto.

O foco aqui nao e entregar fluxos de negocio completos. O foco e entregar uma base unica, `organization-scoped` e `project-aware`, para que inbound AI, AI Studio, cadencias e agentes analiticos nao reinventem modelos, filtros e integracoes em paralelo.

---

## Estrutura do PRD

```text
PRD-018-ai-foundation-layer/
├── README.md
├── CONTEXT.md
├── DIAGNOSTIC.md
├── TASKS.md
└── QUICK_START.md
```

---

## Resumo Executivo

### Objetivo

- Definir os modelos base de IA: `LeadAiContext`, `AiEvent`, `AiAgent`, `AiAgentProjectConfig`, `AiCadence`, `AiCadenceStep` e `AiCadenceEnrollment`
- Garantir que a fundacao seja filtravel por `organizationId` e tambem por `projectId` nas operacoes relevantes
- Criar a abstracao `executePrompt` para isolar o produto de mudancas de framework
- Configurar Mastra com `@mastra/pg` como runtime de memoria e execucao
- Configurar Inngest com client tipado e rota base `/api/inngest`
- Entregar servicos e queries reutilizaveis para contexto, eventos, configuracao de agentes e futuras superficies de UI

### Status Atual

- O schema atual nao possui modelos de fundacao de IA
- PRD-011 ja removeu o legado `AiInsight` / `AiInsightCost`, portanto nao existe migracao de dados legados a fazer aqui
- `@mastra/core` ja esta instalado, mas `@mastra/pg` e a integracao com Inngest ainda nao existem
- O repositario ja possui `organizationId` e `projectId` como eixos dominantes do dominio principal, mas o PRD anterior nao refletia isso de forma consistente
- O projeto usa Vitest, `src/lib/env/env.ts` para validacao de ambiente e `src/lib/utils/logger.ts` para logging estruturado

### Escopo

**Entra:**

- Modelos Prisma da fundacao de IA com organizacao por `organizationId` e `projectId` quando fizer sentido operacional
- Helper compartilhado `Result<T>` em `src/lib/shared/result.ts`
- Tipos e schemas em `src/lib/ai/types/*` e `src/lib/ai/schemas/*`
- Servicos em `src/lib/ai/services/*`
- Queries em `src/lib/ai/queries/*`
- Infra de runtime em `src/server/mastra/*` e `src/server/inngest/*`
- Rota `src/app/api/inngest/route.ts`
- Seed dos agentes de sistema

**Fica fora:**

- Workflow de inbound message e skill execution de negocio (PRD-012)
- UI de AI Studio, timeline no inbox e telas operacionais (PRD-013)
- Execucao real de cadencias por scheduler/worker (PRD-022)
- Blueprints, skills, policies e prompts de dominio
- Dashboard de usage em UI; este PRD entrega dados e queries, nao a tela final

### Estimativa

- 1 sprint para schema, infra, servicos base e testes unitarios

---

## Arquivos/Areas Principais

- `prisma/schema.prisma`
- `prisma/seeds/seed_ai_agents.ts`
- `prisma/seeds/index.ts`
- `src/lib/shared/result.ts`
- `src/lib/ai/types/*`
- `src/lib/ai/schemas/*`
- `src/lib/ai/services/*`
- `src/lib/ai/queries/*`
- `src/server/mastra/*`
- `src/server/inngest/*`
- `src/app/api/inngest/route.ts`
- `src/lib/env/env.ts`

---

## Dependencias

Este PRD assume que o PRD-011 foi concluido e que o legado de IA foi removido do schema e das superficies antigas.

Ele e pre-requisito direto de:

- PRD-012 (Core Runtime WhatsApp AI)
- PRD-013 (AI Studio Platform)
- PRD-022 (AI Cadence Engine)
- PRD-019, PRD-020 e PRD-021 (agentes analiticos)

---

## Como Ler Este PRD

1. `CONTEXT.md`
2. `DIAGNOSTIC.md`
3. `TASKS.md`
4. `QUICK_START.md`

---

## Proximo Passo

Aprovar este PRD, congelar a convencao de paths proposta aqui e iniciar a execucao pela Fase 1.
