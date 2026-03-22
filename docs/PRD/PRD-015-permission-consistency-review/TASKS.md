# Tasks: PRD-015 Revisão de Permissões

**Data:** 2026-03-21
**Status:** Draft
**Total:** 8
**Estimado:** 1,5 a 3 dias

---

## Fase 1: Política e Capabilities

### Task 1: Definir o contrato de capabilities da tela de WhatsApp

**Files:**
- Create: `src/server/auth/workspace-capabilities.ts`
- Modify: `src/server/auth/require-workspace-page-access.ts`

**What to do:**
- Criar um resolvedor server-side de capabilities para superfícies de dashboard.
- Modelar, no mínimo:
  - `canManageIntegrations`
  - `canViewWebhookSetup`
  - `canViewSystemWebhookSecrets`
  - `canViewSystemWebhookLogs`
- Garantir que o resolvedor combine corretamente permissões efetivas da organização com `globalRole` quando necessário.

**Verification:**
- Capabilities previsíveis para cenários `owner`, `admin`, `user` com e sem `manage:integrations`.
- Nenhuma capability de workspace depende diretamente do cliente.

**Depends on:** Nenhuma

---

### Task 2: Passar capabilities do servidor para a página de WhatsApp

**Files:**
- Modify: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/whatsapp/page.tsx`
- Modify: `src/components/dashboard/whatsapp/settings/whatsapp-settings-hub.tsx`

**What to do:**
- Resolver capabilities no server component da página.
- Passar o resultado como props para o hub cliente.
- Remover a necessidade de o hub inferir autorização usando `authClient.useSession()`.

**Verification:**
- O hub renderiza a estrutura correta com base nas props recebidas.
- A renderização da aba não depende de relogin para casos de workspace.

**Depends on:** Task 1

---

## Fase 2: WhatsApp / Webhook

### Task 3: Substituir o gate da aba `Webhook` por capability explícita

**Files:**
- Modify: `src/components/dashboard/whatsapp/settings/whatsapp-settings-hub.tsx`
- Test: `src/components/dashboard/whatsapp/settings/__tests__/whatsapp-settings-hub.test.tsx`

**What to do:**
- Remover `session.user.role` da decisão de visibilidade da aba.
- Renderizar a aba conforme a capability decidida pelo servidor.
- Cobrir os cenários:
  - usuário com acesso à página e webhook setup permitido;
  - usuário com acesso à página e webhook setup negado.

**Verification:**
- O teste garante que a aba aparece/desaparece com base na capability correta.
- Nenhuma leitura direta de `session.user.role` permanece nesse componente.

**Depends on:** Task 2

---

### Task 4: Separar conteúdo workspace-safe de conteúdo owner-only na view de Webhook

**Files:**
- Modify: `src/components/dashboard/whatsapp/settings/webhooks-view.tsx`
- Create: `src/components/dashboard/whatsapp/settings/__tests__/webhooks-view.test.tsx`

**What to do:**
- Dividir a view em seções por escopo:
  - setup operacional do webhook;
  - segredos sistêmicos;
  - logs sistêmicos.
- Habilitar cada bloco apenas com a capability correspondente.
- Exibir fallback claro quando a pessoa pode acessar a página, mas não aquele bloco específico.

**Verification:**
- Usuário sem capability owner não dispara query de verify token/logs.
- Usuário owner vê os blocos owner-only normalmente.

**Depends on:** Task 2

---

### Task 5: Alinhar consumo do frontend com a policy real das APIs de sistema

**Files:**
- Modify: `src/components/dashboard/whatsapp/settings/webhooks-view.tsx`
- Modify: `src/app/api/v1/system/webhook-verify-token/route.ts`
- Modify: `src/app/api/v1/system/webhook-logs/route.ts`

**What to do:**
- Confirmar a policy final para verify token e system logs.
- Se continuarem owner-only, garantir que o frontend só consulte esses endpoints quando `canViewSystemWebhookSecrets` ou `canViewSystemWebhookLogs` forem verdadeiros.
- Se a policy mudar, atualizar as rotas para refletir a decisão.

**Verification:**
- UI e API exigem a mesma autorização.
- Não existe mais caso em que a aba aparece para um perfil que inevitavelmente recebe 403 nas queries owner-only.

**Depends on:** Task 4

---

## Fase 3: Sessão e `OWNER_EMAIL`

### Task 6: Garantir que a primeira sessão reflita a promoção por `OWNER_EMAIL`

**Files:**
- Modify: `src/lib/auth/auth.ts`
- Modify: `src/app/(auth)/sign-up/page.tsx`
- Modify: `src/app/api/v1/auth/post-auth-path/route.ts`

**What to do:**
- Revisar a ordem entre criação do usuário, promoção para `owner`, criação da sessão e navegação pós-auth.
- Implementar uma destas estratégias:
  - promover antes da materialização da sessão;
  - ou refresh/recriação explícita da sessão após signup quando a role mudar.
- Garantir que a UI owner-only legítima reflita a role correta sem exigir logout/login manual.

**Verification:**
- Cadastro com `OWNER_EMAIL` resulta em sessão com `owner` imediatamente, ou refresh automático equivalente.
- Regressão coberta com teste ou checklist manual documentado.

**Depends on:** Nenhuma

---

## Fase 4: Auditoria de Regressão

### Task 7: Auditar usos de `session.user.role` em superfícies de workspace

**Files:**
- Modify: `src/components/dashboard/sidebar/app-sidebar.tsx`
- Modify: `src/components/dashboard/whatsapp/settings/whatsapp-settings-hub.tsx`
- Modify: `src/components/dashboard/whatsapp/settings/webhooks-view.tsx`
- Review: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/billing/page.tsx`
- Review: `src/app/(dashboard)/[organizationSlug]/[projectSlug]/design-system/page.tsx`

**What to do:**
- Classificar cada uso como:
  - válido por ser superfície global/sistêmica;
  - inválido por ser superfície de workspace;
  - ambíguo e precisando de capability explícita.
- Migrar apenas os casos inválidos ou ambíguos ligados ao escopo deste PRD.

**Verification:**
- Lista de usos revisados documentada no PR ou checklist de implementação.
- Nenhum gate de workspace novo continua dependente apenas de `session.user.role`.

**Depends on:** Task 1

---

### Task 8: Cobrir regressões com testes focados

**Files:**
- Modify: `src/server/auth/__tests__/require-workspace-page-access.test.ts`
- Create: `src/components/dashboard/whatsapp/settings/__tests__/whatsapp-settings-hub.test.tsx`
- Create: `src/components/dashboard/whatsapp/settings/__tests__/webhooks-view.test.tsx`

**What to do:**
- Adicionar cenários de:
  - acesso por `manage:integrations`;
  - owner-only sections;
  - ausência de query owner-only para perfil sem capability;
  - fluxo de sessão recém-promovida.

**Verification:**
- Testes verdes localmente.
- Casos que reproduziam a aba ausente após signup/login não regressam.

**Depends on:** Tasks 3, 4, 5, 6
