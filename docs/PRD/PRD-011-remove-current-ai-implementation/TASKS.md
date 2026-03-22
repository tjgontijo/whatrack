# Tasks: PRD-011 Remove Current AI Implementation

**Data:** 2026-03-21
**Status:** In Review
**Total:** 16
**Estimado:** 4 fases

---

## Ordem De Execucao

| Fase | Descricao | Tasks |
|---|---|---|
| Fase 1 | Schema e backend core | T1-T4 |
| Fase 2 | APIs e frontend | T5-T9 |
| Fase 3 | Desacoplamento operacional | T10-T13 |
| Fase 4 | Limpeza final e validacao | T14-T16 |

---

## FASE 1 - Schema E Backend Core

### T1: Remover modelos Prisma do runtime legado

**Files:**
- Modify: `prisma/schema.prisma`

**What to do:**
- remover:
  - `AiConversionApproval`
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
- remover relacoes e arrays associados em `Organization`, `Ticket` e outros modelos
- remover `aiCopilotActive` e `aiCopilotInstructions` de `OrganizationProfile`
- remover `includedAiCreditsPerProject` de `BillingPlan`

**Verification:**
- `prisma/schema.prisma` compila

### T2: Remover seeds e bootstrap do modelo antigo

**Files:**
- Modify: `prisma/seeds/index.ts`
- Modify or Delete: `prisma/seeds/*`

**What to do:**
- remover seeds de statuses, skills e artefatos do runtime antigo
- remover qualquer franquia, texto ou entitlement de billing que cite IA
- garantir que `reset-db` nao tente mais repovoar o modelo legado

**Verification:**
- seed nao referencia mais `AiAgent`, `AiSkill` nem `AiInsight`

### T3: Remover services de IA atual

**Files:**
- Delete: `src/services/ai/ai-agent.service.ts`
- Delete: `src/services/ai/ai-classifier.scheduler.ts`
- Delete: `src/services/ai/ai-cost-tracking.service.ts`
- Delete: `src/services/ai/ai-execution-audit.service.ts`
- Delete: `src/services/ai/ai-execution.service.ts`
- Delete: `src/services/ai/ai-insight-approval.service.ts`
- Delete: `src/services/ai/ai-insight-query.service.ts`
- Delete: `src/services/ai/ai-skill-provisioning.service.ts`
- Delete: `src/services/ai/ai-skill.service.ts`

**What to do:**
- apagar implementacoes do stack antigo
- manter a pasta pronta para o runtime novo do PRD-012, se fizer sentido

**Verification:**
- nenhum import restante aponta para esses services

### T4: Remover testes e auxiliares do backend legado

**Files:**
- Delete or Modify: `src/services/ai/__tests__/*`
- Delete or Modify: `src/schemas/ai/*`
- Delete or Modify: `src/types/ai/*`
- Delete or Modify: `src/lib/ai/*`
- Delete or Modify: `src/hooks/ai/*`

**What to do:**
- apagar testes, schemas, types e helpers que so existem por causa do modelo atual
- preservar apenas o que tiver uso fora da IA atual

**Verification:**
- `rg` nao encontra referencias legadas nesses diretorios

---

## FASE 2 - APIs E Frontend

### T5: Remover APIs do runtime legado

**Files:**
- Delete: `src/app/api/v1/ai-agents/route.ts`
- Delete: `src/app/api/v1/ai-agents/[id]/route.ts`
- Delete: `src/app/api/v1/ai-insights/route.ts`
- Delete: `src/app/api/v1/ai-insights/[id]/approve/route.ts`
- Delete: `src/app/api/v1/ai-insights/[id]/reject/route.ts`
- Delete: `src/app/api/v1/ai-skills/route.ts`
- Delete: `src/app/api/v1/ai-skills/[id]/route.ts`
- Delete: `src/app/api/v1/ai/usage/route.ts`
- Delete: `src/app/api/v1/ai/usage/logs/route.ts`
- Delete: `src/app/api/v1/organizations/ai-settings/route.ts`
- Delete: `src/app/api/v1/cron/ai/classifier/route.ts`

**What to do:**
- apagar endpoints expostos pelo sistema atual

**Verification:**
- pasta `api/v1` nao expoe mais endpoints da IA antiga

### T6: Remover endpoint de Meta Ads Audit dependente da IA antiga

**Files:**
- Delete or Replace: `src/app/api/v1/meta-ads/audit/route.ts`

**What to do:**
- remover o endpoint atual ou substitui-lo temporariamente por resposta de indisponivel
- nao manter qualquer dependencia em `dispatchAiEventForAudit`

**Verification:**
- endpoint antigo deixa de depender do runtime legado

### T6.1: Remover Meta Ads Copilot

**Files:**
- Delete: `src/app/api/v1/meta-ads/copilot-analyze/route.ts`
- Delete: `src/services/meta-ads/meta-copilot-analysis.service.ts`
- Delete or Modify: componentes Meta Ads que disparam copilot

**What to do:**
- apagar a rota de análise por IA
- apagar o service de copilot
- remover CTAs e drawers ligados a essa funcionalidade

**Verification:**
- Meta Ads não expõe mais copilot de IA

### T7: Remover paginas antigas de AI Studio

**Files:**
- Delete: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/page.tsx`
- Delete: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai/page.tsx`
- Delete: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai/[id]/page.tsx`
- Delete: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai/skills/page.tsx`
- Delete: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/ia/page.tsx`
- Delete: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/ai/usage/page.tsx`
- Delete: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/approvals/page.tsx`

**What to do:**
- apagar telas baseadas no modelo atual

**Verification:**
- paginas antigas de IA nao existem mais

### T8: Remover componentes visuais da IA atual

**Files:**
- Delete or Modify: `src/components/dashboard/ai/*`
- Delete or Modify: `src/components/dashboard/settings/ai-settings-page.tsx`
- Modify: `src/components/dashboard/whatsapp/inbox/ticket-panel.tsx`
- Modify or Delete: `src/components/dashboard/meta-ads/*` que dependam da IA antiga

**What to do:**
- remover approvals, forms e skill library antigos
- remover painel de insights/aprovacao do inbox
- remover UI de audit que dependa da arquitetura antiga

**Verification:**
- frontend nao importa mais componentes da IA antiga

### T9: Remover navegacao e entry points da IA antiga

**Files:**
- Modify: `src/components/dashboard/sidebar/app-sidebar.tsx`
- Modify: `src/components/dashboard/settings/ai-settings-page.tsx`
- Modify: outras surfaces que apontem para `/settings/ai*`
- Modify: RBAC e policies que ainda exponham `view:ai` / `manage:ai`

**What to do:**
- remover links do menu e atalhos para telas apagadas
- remover permissões de IA do produto atual

**Verification:**
- usuario nao encontra links mortos para IA antiga

---

## FASE 3 - Desacoplamento Operacional

### T10: Remover trigger de IA no inbound do WhatsApp

**Files:**
- Modify: `src/services/whatsapp/handlers/message.handler.ts`

**What to do:**
- remover `enqueueForClassification()`
- remover imports e logs relacionados ao classifier

**Verification:**
- inbound nao aciona mais IA

### T11: Remover cron e fila de classifier

**Files:**
- Delete: `src/services/cron/ai-classifier-cron.service.ts`
- Modify: `src/lib/db/queue.ts`
- Modify or Delete: testes associados ao cron/classifier

**What to do:**
- remover job type `ai-classifier`
- remover bootstrap e referencias ao cron antigo

**Verification:**
- nao existe mais job `ai-classifier`

### T12: Remover provisioning legado do onboarding e organizacao

**Files:**
- Modify: `src/services/onboarding/welcome-onboarding.service.ts`
- Modify: `src/services/organizations/organization-management.service.ts`
- Delete: `src/app/api/v1/organizations/ai-settings/route.ts`
- Modify: `src/schemas/organizations/organization-schemas.ts`
- Modify: testes associados

**What to do:**
- retirar `ensureCoreSkillsForOrganization`
- remover qualquer criacao automatica de skills/agentes antigos
- remover settings organizacionais de IA

**Verification:**
- onboarding e organizacao nao criam mais artefatos legados

### T13: Remover consumo indireto do runtime antigo

**Files:**
- Modify or Delete: outras referencias encontradas por busca global

**What to do:**
- limpar imports restantes
- limpar tipos utilitarios
- remover wiring residual fora das areas principais

**Verification:**
- `rg` por `AiInsight|AiAgent|ai-classifier|dispatchAiEvent|ensureCoreSkillsForOrganization` volta vazio ou apenas docs

---

## FASE 4 - Limpeza Final E Validacao

### T14: Revisar naming e preparar terreno para o PRD-012

**Files:**
- Modify: arquivos remanescentes que ainda mencionem a IA antiga

**What to do:**
- remover texto de UI, docs internas ou mensagens que assumam o sistema atual
- garantir que nomes `AiSkill` e afins fiquem livres para a arquitetura nova

**Verification:**
- base pronta para introduzir o runtime novo sem colisao conceitual

### T15: Validar ambiente limpo

**Files:**
- No file changes required

**What to do:**
- rodar `bash scripts/reset-db.sh`
- rodar `npm run test`
- rodar `npm run build`
- rodar `npm run lint`

**Verification:**
- ambiente sobe limpo apos a remocao

### T16: Confirmar baseline para o PRD-012

**Files:**
- No file changes required

**What to do:**
- confirmar que o produto ficou sem IA antiga
- registrar que o proximo passo e construir o runtime novo do zero

**Verification:**
- nenhum artefato funcional do stack antigo permanece
