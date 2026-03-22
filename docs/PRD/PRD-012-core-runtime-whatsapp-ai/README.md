# PRD-012: Core Runtime WhatsApp AI

**Status:** In Review
**Data:** 2026-03-21
**Versao:** 1.0

---

## O Que E Este PRD?

Este PRD define a V1 da migracao de IA do WhaTrack: o runtime central que recebe mensagens inbound no WhatsApp, agrupa mensagens picadas, roteia para uma skill, responde com seguranca e registra a execucao.

O antigo PRD unico de migracao Mastra foi dividido em tres etapas. O PRD-011 remove a implementacao atual. Este documento cobre a reconstrucao do caminho critico de producao. O trabalho de plataforma, governanca e AI Studio avancado foi movido para o PRD-013.

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

Colocar no ar um runtime de IA project-scoped para WhatsApp que:

- persiste contexto de conversa
- faz debounce de mensagens inbound com Inngest
- roteia via orchestrator + executor
- responde pelo transporte real do WhatsApp
- evita duplicidade de outbound em retry
- possui kill switch operacional
- registra execucoes tecnicas e resultado outbound

### Status Atual

- a IA atual e passiva e gera `AiInsight` para aprovacao humana
- o debounce depende de Redis + cron
- nao existe memoria persistida de conversa
- o transporte outbound do agente nao existe
- a configuracao atual de IA e inconsistente com o runtime real por projeto

### Escopo - O Que Entra

- schema novo project-first
- `AiProjectConfig`
- `AiConversationState` com `pendingMessages`
- `AiBlueprintActivation` com um blueprint default
- `AiSkill` e `AiSkillVersion` para o runtime V1
- orchestrator, executor e workflow inbound
- Inngest para debounce por `conversationId`
- envio outbound real via camada WhatsApp existente
- idempotencia de outbound
- kill switch (`agentEnabled` / `paused`)
- provisioning automatico de defaults por projeto
- UI minima de configuracao do agente por projeto
- observabilidade minima read-only via `AiSkillExecutionLog`

### Escopo - O Que Fica Fora

- editor completo de skills
- versionamento e publicacao via UI
- catalogo com multiplos blueprints ativos
- CRUD avancado de policies
- Meta Ads Audit como skill
- dashboards avancados de custo e logs
- cleanup do stack atual de IA

### Estimativa

5 fases. O objetivo e fechar o caminho inbound -> reply -> log sem abrir toda a plataforma de governanca.

---

## Arquivos/Areas Principais

### Base Atual Impactada

- `src/services/ai/`
- `src/services/whatsapp/`
- `src/services/projects/project.service.ts`
- `src/services/onboarding/welcome-onboarding.service.ts`
- `src/app/api/v1/whatsapp/webhook/route.ts`
- `src/components/dashboard/whatsapp/inbox/ticket-panel.tsx`
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/page.tsx`

### Novas Areas

- `src/mastra/`
- `src/inngest/`
- `src/app/api/inngest/route.ts`
- `src/services/ai/ai-project-config.service.ts`
- `src/services/ai/ai-project-defaults.service.ts`
- `src/services/ai/ai-conversation-state.service.ts`
- `src/services/whatsapp/whatsapp-ai-send.service.ts`

### Banco De Dados

**Pressuposto do PRD-012:**

Os modelos legados do runtime atual ja foram removidos pelo PRD-011.

**Adicionar para V1:**

- `AiProjectConfig`
- `AiBlueprintActivation`
- `AiSkill`
- `AiSkillVersion`
- `AiConversationState`
- `AiSkillExecutionLog`
- `AiCrisisKeyword`

---

## Dependencias

Este PRD depende do PRD-011 concluido.

O PRD-013 so deve comecar depois que o runtime deste PRD estiver estavel em producao. O AI Studio avancado depende deste contrato de runtime e destes modelos.

---

## Como Ler Este PRD

1. `CONTEXT.md`
2. `DIAGNOSTIC.md`
3. `TASKS.md`
4. `QUICK_START.md`

---

## Proximo Passo

Aprovar o recorte de V1 e iniciar a branch de implementacao do core runtime.
