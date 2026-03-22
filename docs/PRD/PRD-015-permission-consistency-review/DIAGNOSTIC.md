# Diagnostic: Revisão de Permissões

**Data:** 2026-03-21
**Status:** Draft

---

## Resumo Executivo

- O principal problema é a mistura entre autorização de workspace e `role` global na mesma superfície.
- O risco principal é esconder ou exibir UI errada por causa de sessão stale ou política desalinhada entre cliente e API.
- O impacto principal é perda de previsibilidade: o usuário acessa a página, mas não vê a ação/aba correspondente até relogar.

---

## Problemas Encontrados

### 1. Fonte de verdade inconsistente na mesma tela

**Problema:** A página de WhatsApp é liberada por `manage:integrations` no servidor, mas a aba `Webhook` depende de `session.user.role` no cliente.

**Impacto:**
- Usuários autorizados pelo tenant podem não ver a UI correta.
- Bugs ficam difíceis de reproduzir porque banco, servidor e cliente podem “discordar”.
- A autorização deixa de ser determinística.

**Solução Necessária:**
1. Definir qual capability é exigida para cada parte da tela.
2. Parar de inferir autorização de workspace a partir de `session.user.role`.
3. Passar capabilities derivadas do servidor para o cliente.

### 2. Sessão stale após promoção por `OWNER_EMAIL`

**Problema:** O usuário é promovido para `owner` em hook `user.create.after`, enquanto `autoSignIn` e `cookieCache` já estão em jogo.

**Impacto:**
- O primeiro payload de sessão pode nascer sem a role final.
- Controles globais podem aparecer só após logout/login.
- A experiência de bootstrap do owner fica inconsistente.

**Solução Necessária:**
1. Garantir que a primeira sessão reflita a role final quando isso for necessário.
2. Remover dependência de `role` global em superfícies que são de workspace.
3. Definir fallback explícito para refresh de sessão pós-signup se a promoção continuar assíncrona.

### 3. A aba `Webhook` mistura escopos diferentes

**Problema:** A mesma view combina setup operacional de integração com segredos e logs sistêmicos.

**Impacto:**
- A política de acesso fica ambígua.
- A aba tende a nascer com gates contraditórios.
- O usuário não entende por que acessa a página, mas não acessa partes dela.

**Solução Necessária:**
1. Separar conteúdo workspace-safe de conteúdo owner-only.
2. Revisar seções, queries e mensagens vazias conforme a capability do usuário.
3. Tornar explícito no produto quando uma área é “sistêmica” e não “da organização”.

### 4. UI e API discordam para o mesmo recurso

**Problema:** `webhooks-view.tsx` aceita `owner` ou `admin` global para renderizar, mas as rotas `/system/webhook-verify-token` e `/system/webhook-logs` exigem `owner`.

**Impacto:**
- Um admin global pode ver a aba e ainda assim tomar 403 nas queries.
- O frontend aciona endpoints que sabe, de antemão, que podem falhar por policy mismatch.
- O sistema transmite a sensação de erro operacional quando o problema é de modelagem de autorização.

**Solução Necessária:**
1. Alinhar a capability exigida na UI e na API.
2. Desabilitar queries owner-only fora do contexto owner-only.
3. Cobrir o caso com teste de regressão.

### 5. Não existe um contrato compartilhado de capabilities no cliente

**Problema:** O layout do dashboard já calcula permissões efetivas para o sidebar, mas páginas específicas recalculam acesso usando `authClient.useSession()`.

**Impacto:**
- Duplicação de lógica.
- Drift entre layout, páginas e componentes internos.
- Maior chance de regressões silenciosas.

**Solução Necessária:**
1. Introduzir prop ou provider de capabilities/capabilities derivadas do servidor.
2. Reusar esse contrato em settings e outras superfícies cliente.
3. Auditar usos restantes de `session.user.role` fora de superfícies realmente globais.

---

## O Que Já Está Bom

| Item | Status | Evidência |
|------|--------|-----------|
| Gating server-side da página de workspace | ✅ | `requireWorkspacePageAccess` já resolve membership e permissões efetivas |
| RBAC por organização | ✅ | `listEffectivePermissionsForUser` já centraliza allow/deny/role base |
| Sidebar do dashboard | ✅ | Layout calcula permissões no servidor e passa para navegação |
| Separação conceitual entre role global e role de member | ✅ | Os dois modelos já existem; o problema atual é uso incorreto, não ausência de infraestrutura |

---

## Matriz de Risco

| Problema | Severidade | Probabilidade | Risco | Esforço |
|----------|------------|---------------|-------|---------|
| Gating inconsistente entre página e aba | Alto | Alta | Crítico | Baixo |
| Sessão stale após `OWNER_EMAIL` | Médio | Alta | Alto | Médio |
| UI e API desalinhadas no Webhook | Alto | Média | Alto | Baixo |
| Mistura de escopos dentro da mesma view | Médio | Alta | Alto | Médio |
| Repetição do padrão em outras telas | Médio | Média | Médio | Médio |

---

## Ordem Recomendada

1. Definir a matriz de autorização e capabilities da área de WhatsApp/Webhook.
2. Remover gating cliente baseado em `session.user.role` para superfícies de workspace.
3. Separar owner-only sections e owner-only queries.
4. Corrigir o fluxo de sessão pós-signup para `OWNER_EMAIL`.
5. Auditar outros gates semelhantes no dashboard.
