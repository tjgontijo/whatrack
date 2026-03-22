# PRD-015: Revisão de Permissões — Consistência entre Workspace, Role Global e Sessão

**Status:** Draft
**Data:** 2026-03-21
**Versão:** 1.0

---

## O Que é Este PRD?

Este PRD documenta a revisão da política de permissões aplicada às superfícies de configurações do dashboard, com foco inicial em `/settings/whatsapp`. O problema observado foi concreto: a página permitia acesso via permissão de workspace, mas a aba `Webhook` dependia de `session.user.role` no cliente e só apareceu após logout/login.

O objetivo é eliminar inconsistências entre os três eixos que hoje coexistem no produto: `role` global do usuário, `role`/permissões efetivas dentro da organização e estado da sessão em cache no navegador. A revisão deve definir qual é a fonte de verdade em cada tipo de tela e corrigir os pontos em que UI, APIs e sessão não seguem a mesma regra.

---

## Estrutura do PRD

PRD-015-permission-consistency-review/
├── README.md
├── CONTEXT.md
├── DIAGNOSTIC.md
├── TASKS.md
└── QUICK_START.md

---

## Resumo Executivo

### Objetivo
- Definir uma matriz clara de autorização para superfícies de dashboard.
- Corrigir a inconsistência entre permissão de workspace e `role` global na tela de WhatsApp.
- Garantir que sessões recém-criadas reflitam corretamente privilégios derivados de `OWNER_EMAIL` quando isso afetar UI imediata.

### Status Atual
- A página [settings/whatsapp/page.tsx](../../../src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/whatsapp/page.tsx) exige `manage:integrations` no servidor.
- O cliente em [whatsapp-settings-hub.tsx](../../../src/components/dashboard/whatsapp/settings/whatsapp-settings-hub.tsx) e [webhooks-view.tsx](../../../src/components/dashboard/whatsapp/settings/webhooks-view.tsx) usa `session.user.role` para mostrar ou esconder a aba de `Webhook`.
- O signup em [auth.ts](../../../src/lib/auth/auth.ts) promove `OWNER_EMAIL` para `owner` em hook pós-criação, enquanto `autoSignIn` e `cookieCache` já estão ativos.

### Abordagem Recomendada
- Separar autorização de `workspace` da autorização `global`.
- Para telas e controles de tenant, usar permissões efetivas da organização como fonte de verdade.
- Para superfícies realmente globais, manter `role` global, mas corrigir o fluxo de sessão para evitar stale auth logo após cadastro/login.
- Na área de Webhook, separar conteúdo workspace-safe de conteúdo system-only.

### Escopo
- Revisar a política de visibilidade e acesso da área de WhatsApp/Webhook.
- Revisar o fluxo de sessão ligado a `OWNER_EMAIL`.
- Auditar outros gates de UI que usam `session.user.role` em superfícies de workspace.

### Fora do Escopo
- Redesenho completo do modelo RBAC.
- Alterações de schema de permissões no banco.
- Migração massiva de todas as telas do produto em um único lote.

### Estimativa
- Discovery + correções principais: 1 a 2 dias úteis.
- Auditoria complementar e testes de regressão: 0,5 a 1 dia útil.

---

## Arquivos/Áreas Principais

- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/whatsapp/page.tsx`
- `src/components/dashboard/whatsapp/settings/whatsapp-settings-hub.tsx`
- `src/components/dashboard/whatsapp/settings/webhooks-view.tsx`
- `src/lib/auth/auth.ts`
- `src/server/auth/require-workspace-page-access.ts`
- `src/server/auth/validate-organization-access.ts`
- `src/server/organization/organization-rbac.service.ts`
- `src/app/api/v1/system/webhook-verify-token/route.ts`
- `src/app/api/v1/system/webhook-logs/route.ts`
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/layout.tsx`
- `src/components/dashboard/sidebar/app-sidebar.tsx`

---

## Como Ler Este PRD

1. `CONTEXT.md`
2. `DIAGNOSTIC.md`
3. `TASKS.md`
4. `QUICK_START.md`

---

## Próximo Passo

Aprovar a política recomendada para a área de Webhook:
- conteúdo de setup/workspace segue permissão de tenant;
- segredos e logs sistêmicos seguem privilégio global explícito;
- cliente deixa de inferir autorização de workspace a partir de `session.user.role`.
