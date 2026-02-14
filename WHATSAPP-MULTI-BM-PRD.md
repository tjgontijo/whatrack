# PRD: Suporte a Múltiplos Business Managers (OAuth Token Exchange)

**Versão:** 1.0  
**Data:** 2026-02-14  
**Status:** Em Desenvolvimento

---

## 1. Problema

Atualmente, o Whatrack usa um **token global único** (`META_ACCESS_TOKEN` do `.env`) para se comunicar com a Meta Graph API. Esse token pertence ao System User do Business Manager **do próprio Whatrack**.

Isso funciona apenas para números que pertencem diretamente ao BM do Whatrack. Quando um **cliente externo** conecta seu número via Embedded Signup, acontece o seguinte:

1. ✅ O popup da Meta abre e o cliente autoriza o compartilhamento do número.
2. ✅ A Meta retorna um `waba_id` via `postMessage`.
3. ✅ O `claim-waba` registra o WABA no banco.
4. ❌ O `claim-waba` tenta acessar a Meta Graph API com o **token global** — que **NÃO tem permissão** sobre o WABA do cliente.
5. ❌ A assinatura do webhook (`subscribed_apps`) falha silenciosamente porque usa o token errado.
6. ❌ **Resultado:** Nenhum webhook é recebido para esse número.

### Raiz do Problema
O Embedded Signup da Meta retorna um **código de autorização (authorization code)** que precisa ser trocado por um **access token específico do cliente**. Esse passo **não está implementado**. Sem esse token:
- Não é possível ler os phone numbers do WABA do cliente.
- Não é possível assinar webhooks para o WABA do cliente.
- Não é possível enviar mensagens em nome do cliente.

---

## 2. Solução

### 2.1 Fluxo Correto (a ser implementado)

```
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND (Embedded Signup)                                       │
│                                                                    │
│  1. Cliente clica "Conectar WhatsApp"                             │
│  2. Popup Meta abre → Cliente autoriza                            │
│  3. Meta retorna via postMessage:                                 │
│     - waba_id                                                      │
│     - phone_number_id                                              │
│     - authorization_code  ← NOVO! Capturar este valor             │
│  4. Frontend envia tudo para /api/v1/whatsapp/claim-waba          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  BACKEND (claim-waba)                                             │
│                                                                    │
│  5. Trocar authorization_code por access_token:                   │
│     POST https://graph.facebook.com/v22.0/oauth/access_token      │
│     Body: {                                                        │
│       client_id: META_APP_ID,                                      │
│       client_secret: META_APP_SECRET,                              │
│       grant_type: "authorization_code",                            │
│       code: authorization_code                                     │
│     }                                                              │
│     → Resposta: { access_token, token_type, expires_in }          │
│                                                                    │
│  6. Salvar access_token no WhatsAppConfig.accessToken             │
│                                                                    │
│  7. Usar ESTE token para:                                         │
│     a) GET /{wabaId}/phone_numbers → pegar phoneId               │
│     b) POST /{wabaId}/subscribed_apps → assinar webhooks          │
│                                                                    │
│  8. Retornar sucesso                                              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  RESULTADO                                                        │
│                                                                    │
│  - WhatsAppConfig.accessToken preenchido com token do cliente     │
│  - Webhook assinado com o token correto                           │
│  - Meta começa a enviar eventos para /api/v1/whatsapp/webhook     │
│  - Mensagens e ecos aparecem na Inbox                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Alterações Necessárias

### 3.1 Banco de Dados (Prisma Schema)

**Modelo `WhatsAppConfig`** — Adicionar campos:

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `accessToken` | `String?` | ⚠️ Já existe mas NÃO está sendo preenchido. Precisa ser populado com o token do cliente. |
| `tokenExpiresAt` | `DateTime?` | **NOVO.** Data de expiração do token (se for de curta duração). |
| `authorizationCode` | `String?` | **NOVO.** Código OAuth recebido do Embedded Signup (uso único, para auditoria). |

### 3.2 Variáveis de Ambiente

| Variável | Status | Propósito |
|----------|--------|-----------|
| `META_ACCESS_TOKEN` | Já existe | Token global do System User (fallback para o próprio BM) |
| `NEXT_PUBLIC_META_APP_ID` | Já existe | App ID (public, usado no frontend) |
| `META_APP_SECRET` | **NOVO** | App Secret (privado, usado no backend para trocar o código por token) |
| `NEXT_PUBLIC_META_CONFIG_ID` | Já existe | Config ID do Embedded Signup |

### 3.3 Alterações no Frontend

**Arquivo:** `src/hooks/whatsapp/use-whatsapp-onboarding.ts`

O `postMessage` da Meta retorna dados adicionais no callback que **não estamos capturando**. Precisamos:

1. Capturar o `authorization_code` do `event.data` (campo `code` ou no payload do response).
2. Enviar o `authorization_code` junto com o `wabaId` no POST para `/api/v1/whatsapp/claim-waba`.

**Nota:** A exata estrutura do `postMessage` varia conforme a versão do Embedded Signup (v2 vs v3). Na v3, o `code` vem no callback do `FB.login()` ou no `sessionInfoListener`. Precisamos confirmar o campo exato observando o payload real no console.

### 3.4 Alterações no Backend

**Arquivo:** `src/app/api/v1/whatsapp/claim-waba/route.ts`

Refatoração completa:

```
ANTES: usa MetaCloudService.accessToken (token global do .env)
DEPOIS: troca authorization_code por access_token do cliente + usa esse token
```

Passos:
1. Receber `{ wabaId, code }` do frontend.
2. Trocar `code` por `access_token` via `POST /oauth/access_token`.
3. Usar o `access_token` do cliente para:
   - `GET /{wabaId}/phone_numbers` → obter phoneId e displayPhone.
   - `POST /{wabaId}/subscribed_apps` → assinar webhooks.
4. Salvar `accessToken` e `tokenExpiresAt` no `WhatsAppConfig`.

**Arquivo:** `src/services/whatsapp/meta-cloud.service.ts`

Adicionar método:
```typescript
static async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in?: number;
}>
```

**Arquivo:** `src/app/api/v1/whatsapp/webhook/route.ts`

Sem alteração de código necessária — o webhook já salva o log e busca a config por `phoneId` ou `wabaId`. Porém, como o `claim-waba` atual pode ter falhado ao salvar o `phoneId` (já que usava o token errado para fazer o GET), o webhook não encontra a config.

**Com a correção do claim-waba**, o `phoneId` será salvo corretamente e o webhook passará a encontrar a config normalmente.

### 3.5 Token do Próprio BM (Fallback)

Para números do próprio BM do Whatrack (seed/dev), o `META_ACCESS_TOKEN` do `.env` continua sendo usado como fallback quando `WhatsAppConfig.accessToken` é `null`. Nenhuma alteração necessária para esse cenário.

---

## 4. Riscos e Considerações

### 4.1 Expiração do Token
- Tokens de **System User** (gerados pelo BM do Whatrack) **não expiram**.
- Tokens obtidos via OAuth **podem expirar** (tipicamente 60 dias).
- Se expirar, precisaremos de uma rotina de refresh ou solicitar ao cliente que reconecte.
- A Meta permite trocar um token de curta duração por um de longa duração via `GET /oauth/access_token?grant_type=fb_exchange_token`.

### 4.2 Segurança
- O `META_APP_SECRET` **NUNCA** deve ser exposto no frontend. Toda troca de token é server-side.
- Os `accessToken` salvos no banco são sensíveis — considerar criptografia em repouso no futuro.

### 4.3 Permissões Necessárias
O App Meta precisa ter aprovação para:
- `whatsapp_business_messaging` — para enviar/receber mensagens.
- `whatsapp_business_management` — para gerenciar templates e configs.

---

## 5. Plano de Implementação

### Fase 1 — Token Exchange (PRIORIDADE MÁXIMA)
- [ ] Adicionar `META_APP_SECRET` ao `.env`.
- [ ] Adicionar campos `tokenExpiresAt` e `authorizationCode` ao schema Prisma.
- [ ] Rodar migration.
- [ ] Implementar `MetaCloudService.exchangeCodeForToken()`.
- [ ] Atualizar `claim-waba` para trocar o código pelo token antes de qualquer chamada.
- [ ] Atualizar hook `use-whatsapp-onboarding.ts` para capturar e enviar o `authorization_code`.
- [ ] Testar fim-a-fim com número de cliente em modo coexistência.

### Fase 2 — Robustez
- [ ] Implementar extensão de token (short-lived → long-lived).
- [ ] Adicionar monitoramento de expiração de tokens.
- [ ] Implementar reconexão automática quando token expira.

### Fase 3 — Produção
- [ ] Criptografia dos tokens no banco.
- [ ] Dashboard de status de conexão por cliente.
- [ ] Alertas quando um token está prestes a expirar.

---

## 6. Referências

- [Meta Embedded Signup Documentation](https://developers.facebook.com/docs/whatsapp/embedded-signup/)
- [Meta OAuth Access Token Exchange](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/)
- [WhatsApp Business Management API - Subscribed Apps](https://developers.facebook.com/docs/whatsapp/business-management-api/manage-phone-numbers/)
