# Contexto: Remove Current AI Implementation

**Ultima atualizacao:** 2026-03-21

---

## Definicao

O WhaTrack tem hoje um stack de IA que mistura:

- `AiAgent`
- `AiSkill` legado em blob
- `AiInsight`
- aprovacao manual
- scheduler/cron para classificacao
- telas de AI Studio acopladas a esse modelo
- Meta Ads Audit executando por uma arquitetura paralela

Esse stack sera removido antes da construcao do runtime novo.

---

## Premissas Deste PRD

- estamos em ambiente de desenvolvimento
- nao existem usuarios para preservar
- nao existe requisito de rollback
- UX temporariamente quebrada para IA e aceitavel, desde que o build final fique limpo

---

## Superficies Atuais Que Serao Removidas

### Banco

Modelos legados do runtime atual:

- `AiTriggerEventType`
- `AiSchemaFieldType`
- `AiInsightActionStatus`
- `AiAgent`
- `AiSkill`
- `AiAgentSkill`
- `AiTrigger`
- `AiSchemaField`
- `AiInsight`
- `AiInsightCost`

### Backend

- `ai-agent.service.ts`
- `ai-classifier.scheduler.ts`
- `ai-execution.service.ts`
- `ai-execution-audit.service.ts`
- `ai-insight-approval.service.ts`
- `ai-insight-query.service.ts`
- `ai-skill-provisioning.service.ts`
- `ai-skill.service.ts`
- `ai-cost-tracking.service.ts`
- cron classifier

### APIs

- `/api/v1/ai-agents`
- `/api/v1/ai-insights`
- `/api/v1/ai-skills`
- `/api/v1/ai/usage`
- `/api/v1/cron/ai/classifier`
- `/api/v1/meta-ads/audit`
- `/api/v1/meta-ads/copilot-analyze`
- `/api/v1/organizations/ai-settings`

### Frontend

- `/settings/ai-studio`
- `/settings/ai/*`
- `/ia`
- componentes de approvals
- componentes de skill library
- bindings de agent/skill
- activity/approval panel do inbox
- drawers e ações de analysis/copilot no Meta Ads
- entradas de navegacao para AI atual

### Provisioning

- provisioning de skills no onboarding
- provisioning de skills na criacao/gestao de organizacao

### RBAC E Config

- permissoes `view:ai` e `manage:ai`
- `aiCopilotActive` e `aiCopilotInstructions`
- rotas e schemas de configuracao organizacional de IA

---

## Estado Desejado Depois Do PRD-011

Depois desta etapa:

- o inbound do WhatsApp nao aciona mais IA
- nao existem rotas nem telas da IA antiga
- nao existem modelos Prisma do runtime antigo
- nao existem permissoes nem rotas publicas de IA antiga
- nao existe mais endpoint de Meta Ads Audit apoiado pela arquitetura antiga
- nao existe mais Meta Ads Copilot ou pagina `/ia`
- o repositorio fica pronto para receber o runtime novo do PRD-012

---

## Regras Operacionais

- preferir apagar em vez de adaptar
- nao criar camada de compatibilidade
- nao criar feature flags para o legado
- qualquer superficie dependente do modelo antigo deve sair junto
- o criterio de sucesso e codigo limpo, nao convivencia entre sistemas
