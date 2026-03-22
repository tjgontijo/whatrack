# PRD-011: Remove Current AI Implementation

**Status:** In Review
**Data:** 2026-03-21
**Versao:** 1.0

---

## O Que E Este PRD?

Este PRD define a etapa zero da migracao de IA: remover a implementacao atual de agentes, insights, aprovacao manual e scheduler antes de construir o runtime novo.

Como o ambiente esta em modo dev e sem usuarios, a prioridade nao e compatibilidade. A prioridade e limpar o codigo, o schema e as superficies de produto para abrir espaco para o PRD-012.

---

## Estrutura Do PRD

```text
PRD-011-remove-current-ai-implementation/
├── README.md
├── CONTEXT.md
├── DIAGNOSTIC.md
├── LEGACY_AI_SCOPE.md
├── TASKS.md
└── QUICK_START.md
```

---

## Resumo Executivo

### Objetivo

Remover do repositorio o stack atual de IA:

- modelos Prisma do runtime legado
- services de agentes, insights e scheduler
- APIs de agentes, insights e usage
- telas de AI Studio e approvals atuais
- integracoes do inbox e do Meta Ads Audit com a IA antiga
- provisioning e seeds ligados ao modelo antigo
- paginas e atalhos expostos em `/ia`, `/settings/ai*` e Meta Ads Copilot
- permissoes, configuracoes organizacionais e nomenclatura de IA ainda expostas no produto

### Premissa Operacional

- sem usuarios
- sem necessidade de rollback
- sem necessidade de preservar UX intermediaria
- build, lint e testes ainda precisam ficar verdes

### Escopo - O Que Entra

- hard delete do runtime legado
- hard delete das superficies de UI e API do legado
- remocao do enqueue/classifier no inbound
- remocao do provisioning antigo no onboarding e organizacao
- remocao do Meta Ads Audit dependente da arquitetura antiga
- remocao do Meta Ads Copilot e da pagina `/ia`
- remocao de `view:ai` e `manage:ai` das superficies atuais
- remocao de configuracoes `aiCopilot*` da organizacao
- limpeza de types, schemas, helpers e testes relacionados

### Escopo - O Que Fica Fora

- construcao do runtime Mastra/Inngest
- novas tabelas do sistema novo
- nova UI de AI Studio
- qualquer tentativa de migrar dados do legado

### Resultado Esperado

Ao final deste PRD, o repositorio nao deve mais conter a implementacao atual de IA. O produto fica temporariamente sem feature de IA ate o PRD-012.

---

## Arquivos/Areas Principais

- `prisma/schema.prisma`
- `src/services/ai/`
- `src/services/cron/ai-classifier-cron.service.ts`
- `src/services/whatsapp/handlers/message.handler.ts`
- `src/services/organizations/organization-management.service.ts`
- `src/services/onboarding/welcome-onboarding.service.ts`
- `src/app/api/v1/ai-agents/`
- `src/app/api/v1/ai-insights/`
- `src/app/api/v1/ai-skills/`
- `src/app/api/v1/ai/usage/`
- `src/app/api/v1/cron/ai/classifier/`
- `src/app/api/v1/meta-ads/audit/route.ts`
- `src/app/api/v1/meta-ads/copilot-analyze/route.ts`
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/ia/`
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai/`
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/ai-studio/`
- `src/components/dashboard/ai/`
- `src/components/dashboard/meta-ads/*analysis*`
- `src/components/dashboard/whatsapp/inbox/ticket-panel.tsx`
- `src/components/dashboard/sidebar/app-sidebar.tsx`
- `src/lib/auth/rbac/roles.ts`
- `src/server/organization/permission-delegation-policy.ts`

---

## Dependencia Com Os Proximos PRDs

- O PRD-012 passa a assumir repositorio limpo, sem runtime anterior para preservar.
- O PRD-013 deixa de carregar tarefas de cleanup do sistema antigo e foca so na plataforma nova.

---

## Como Ler Este PRD

1. `CONTEXT.md`
2. `DIAGNOSTIC.md`
3. `LEGACY_AI_SCOPE.md`
4. `TASKS.md`
5. `QUICK_START.md`

---

## Proximo Passo

Aprovar a limpeza agressiva e executar o teardown do stack atual antes de iniciar o PRD-012.
