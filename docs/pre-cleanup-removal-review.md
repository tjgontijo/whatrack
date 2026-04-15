# Pre-Cleanup Removal Review

O que será removido nesta fase.

---

## 1. Domínio AI

### Prisma models
- `LeadAiContext`
- `AiEvent`
- `AiAgent`
- `AiAgentProjectConfig`
- `AiCadence`
- `AiCadenceStep`
- `AiCadenceEnrollment`
- `AiProjectConfig`
- `AiConversationState`
- `AiSkill`
- `AiSkillVersion`
- `AiSkillExecutionLog`
- `AiCrisisKeyword`

### Rotas API
- `src/app/api/v1/ai/config/route.ts`

### Bibliotecas e schemas
- `src/lib/ai/**`
- `src/schemas/ai/**`
- `src/server/mastra/**`

### Permissões RBAC
- `manage:ai` em `src/lib/auth/rbac/roles.ts`
- `manage:ai` em `src/server/organization/permission-delegation-policy.ts`

### Services (ajuste de bootstrap)
- `src/services/projects/project.service.ts` — remover bootstrap de AI default no create project
- `src/services/onboarding/welcome-onboarding.service.ts` — remover bootstrap de AI no onboarding

### Testes
- `src/lib/ai/__tests__/**`
- Referências a `manage:ai` nos testes de RBAC, projetos e onboarding

---

## 2. Design System

### Páginas
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/design-system/page.tsx`
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/design-system/design-system-content.tsx`
- `src/app/(dashboard)/[organizationSlug]/[projectSlug]/design-system/sections/**`

### Sidebar
- Item "Design System" em `src/components/dashboard/sidebar/app-sidebar.tsx`

---

## Fora do escopo (não remover)

- Todo o domínio WhatsApp (inbox, campaigns, templates, A/B, audiences, opt-outs, debug/webhook UI)
- Domínio Meta Ads
- Billing
- Auditoria (páginas, APIs, permissão `view:audit`)
- Arquivos Inngest/WhatsApp ligados ao fluxo de AI (serão tratados posteriormente)
