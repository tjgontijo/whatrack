# Contexto: Revisão de Permissões

**Última atualização:** 2026-03-21

---

## Definição

Hoje o produto combina três sinais diferentes de autorização:

1. `auth_user.role`
   Papel global do usuário (`owner`, `admin`, `user`), usado em superfícies sistêmicas.
2. `org_members.role` + permissões efetivas da organização
   Papel e permissões calculadas por tenant, incluindo overrides.
3. Sessão Better Auth no cliente
   Fonte usada por `authClient.useSession()` para renderização de UI, sujeita a cache e timing de refresh.

O problema não é a existência desses três sinais. O problema é eles serem usados de forma intercambiável em superfícies que não pertencem ao mesmo escopo.

---

## Quem Usa

- Owners globais da plataforma
- Admins globais da plataforma
- Members de organização com `manage:integrations`
- Time interno de suporte/engenharia ao depurar acesso

---

## Fluxo Atual

### 1. Acesso à página de WhatsApp

A página [settings/whatsapp/page.tsx](../../../src/app/(dashboard)/[organizationSlug]/[projectSlug]/settings/whatsapp/page.tsx) usa `requireWorkspacePageAccess({ permissions: 'manage:integrations' })`.

Na prática, isso significa:
- o servidor já resolve a organização ativa;
- valida membership;
- calcula permissões efetivas da organização;
- só então libera a página.

### 2. Gating da aba `Webhook`

No cliente, [whatsapp-settings-hub.tsx](../../../src/components/dashboard/whatsapp/settings/whatsapp-settings-hub.tsx) decide mostrar a aba `Webhook` apenas quando `session.user.role` é `owner` ou `admin`.

Esse gate:
- ignora o fato de a página já ter sido autorizada por permissão de workspace;
- depende do payload atual da sessão do navegador;
- não usa a mesma fonte de verdade do servidor.

### 3. Conteúdo interno da aba

[webhooks-view.tsx](../../../src/components/dashboard/whatsapp/settings/webhooks-view.tsx) também usa `session.user.role` no cliente. Ao mesmo tempo:
- `/api/v1/system/webhook-verify-token` exige `requireSuperAdmin` (owner global);
- `/api/v1/system/webhook-logs` exige `requireSuperAdmin` (owner global).

Ou seja:
- a UI aceita `admin` global;
- as APIs aceitam só `owner` global;
- a página-mãe foi aberta com permissão de workspace.

Hoje a mesma aba mistura conteúdo de escopos diferentes:
- callback URL e setup do webhook;
- verify token global;
- logs sistêmicos globais.

### 4. Bootstrap de `OWNER_EMAIL`

Em [auth.ts](../../../src/lib/auth/auth.ts):
- `emailAndPassword.autoSignIn` está habilitado;
- `session.cookieCache.enabled` está habilitado;
- o `OWNER_EMAIL` é promovido para `owner` em hook `databaseHooks.user.create.after`.

Isso cria uma janela em que:
- o usuário já tem sessão válida;
- o banco já pode ter sido atualizado para `owner`;
- mas o cliente ainda usa uma sessão antiga/stale, sem a role promovida.

O sintoma observado confirma esse cenário: a aba apareceu apenas após logout/login.

---

## Regras de Negócio Relevantes

- Superfícies de tenant devem obedecer membership e permissões efetivas da organização.
- Superfícies sistêmicas devem obedecer `role` global explícita.
- UI e API que representam a mesma ação precisam compartilhar a mesma política de autorização.
- O usuário não deve precisar relogar para enxergar superfícies que já deveria ter acesso pelo estado persistido no banco.
- Segredos globais não devem ser expostos apenas porque uma página de tenant foi liberada.

---

## Dados e Integrações

- `auth_user.role`
- `auth_session`
- `org_members.role`
- `org_roles`
- `org_role_permissions`
- `member_permission_overrides`
- Better Auth session/cookie cache
- `requireWorkspacePageAccess`
- `validatePermissionAccess`
- `listEffectivePermissionsForUser`

---

## Estado Desejado

O sistema deve operar com uma regra simples:

- `Workspace/tenant UI`
  Usa permissões efetivas da organização, idealmente resolvidas no servidor e repassadas ao cliente como capabilities.

- `System/global UI`
  Usa `role` global, mas com sessão confiável e atualizada.

- `WhatsApp > Webhook`
  Deve separar claramente o que é configuração operacional do tenant e o que é dado sensível global da plataforma.

Ao final da revisão:
- a visibilidade de abas e seções não dependerá de um `session.user.role` stale para casos de workspace;
- endpoints owner-only não serão disparados por usuários sem capability owner;
- um usuário promovido por `OWNER_EMAIL` verá capacidades globais corretamente sem depender de logout/login manual, ou esses controles deixarão de ser necessários no fluxo inicial de workspace.
