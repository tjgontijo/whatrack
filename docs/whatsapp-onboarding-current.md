# WhatsApp Onboarding (as-is) — WhaTrack

## Objetivo
Descrever o fluxo atual de onboarding do WhatsApp (Embedded Signup hospedado pela Meta) **como está implementado hoje**, incluindo UI, callbacks, endpoints e persistência no banco.

## Escopo
- Frontend: tela de configurações e botão de conexão.
- Onboarding: popup hospedado pela Meta + eventos `postMessage`.
- Backend: troca de `code` por token, persistência de config e assinatura de webhook.

## Entradas e variáveis de ambiente
- `NEXT_PUBLIC_META_APP_ID` (frontend)
- `NEXT_PUBLIC_META_CONFIG_ID` (frontend)
- `META_APP_SECRET` (backend, troca de code por token)
- `META_API_VERSION` (backend, default v24.0)
- `META_WEBHOOK_VERIFY_TOKEN` (backend, verificação do webhook)
- `TOKEN_ENCRYPTION_KEY` (backend, criptografia do token)

## UI / Ponto de entrada
**Arquivo:** `src/app/dashboard/settings/whatsapp/page.tsx`

- A página busca números via `whatsappApi.listPhoneNumbers()`.
- Se **não há números**, renderiza `<EmbeddedSignupButton />`.
- Se há números, renderiza cards de instâncias.
- O botão "Nova Instância" também chama `startOnboarding()`.

**Botão de conexão:** `src/components/whatsapp/embedded-signup-button.tsx`
- Usa `useWhatsAppOnboarding`.
- Exibe botão "Conectar com a Meta".
- Permite "Verificar Conexão" via `POST /api/v1/whatsapp/check-connection`.

## Hook principal do onboarding
**Arquivo:** `src/hooks/whatsapp/use-whatsapp-onboarding.ts`

### 1) Geração e validação de state (modo restrito)
- Gera `state` com timestamp + random.
- Armazena em `sessionStorage` (`wa_onboarding_state`).
- Adiciona `state` na URL do popup.
- Valida o `state` retornado no redirect.

### 2) Abertura do popup (Hosted Embedded Signup)
URL gerada:
```
https://business.facebook.com/messaging/whatsapp/onboard/
  ?app_id=... 
  &config_id=...
  &response_type=code
  &display=popup
  &redirect_uri=https://whatrack.com/dashboard/settings/whatsapp/
  &state=<state>
  &extras={"featureType":"whatsapp_business_app_onboarding","sessionInfoVersion":"3","version":"v3"}
```

- O popup é aberto via `window.open`.
- Se bloqueado, o fluxo é interrompido.

### 3) Recebimento do `code` via redirect
No redirect de volta para `https://whatrack.com/dashboard/settings/whatsapp/`:
- O popup envia `postMessage` para a janela pai com:
  - `code`
  - `waba_id` (se presente)
  - `phone_number_id` (se presente)
  - `state`
- O popup é fechado logo após enviar o `postMessage`.

### 4) Recebimento do `waba_id` via WA_EMBEDDED_SIGNUP
A janela principal escuta `postMessage` da Meta (`event.origin` contendo `facebook.com`).

Quando chega:
```
{
  type: 'WA_EMBEDDED_SIGNUP',
  event: 'FINISH...' | 'FINISH_ONLY_WABA',
  data: { waba_id, phone_number_id, ... }
}
```
- Armazena `waba_id` e `phone_number_id` em memória.
- Tenta fazer o claim quando **também** existe `code`.

### 5) Gatilho de claim
O claim só acontece quando há **code + wabaId**:
```
POST /api/v1/whatsapp/claim-waba
Body: { wabaId, phoneNumberId, code }
```

## Backend do claim
**Arquivo:** `src/app/api/v1/whatsapp/claim-waba/route.ts`

### Passos principais
1) **Sessão/Org ativa**: exige `activeOrganizationId`.
2) **Code obrigatório**: sem `code`, retorna 400.
3) **Troca code por token**:
   - `MetaCloudService.exchangeCodeForToken(code)`
4) **Busca phone number** (se necessário):
   - `MetaCloudService.listPhoneNumbers({ wabaId, accessToken })`
5) **Criptografa token** (AES-256-GCM) se `TOKEN_ENCRYPTION_KEY` existir.
6) **Upsert em `whatsAppConfig`**:
   - Chave: `phoneId` (ou `pending_<wabaId>` se não houver phoneId).
7) **Assina webhooks do WABA**:
   - `MetaCloudService.subscribeToWaba(wabaId, token)`

## Troca de code por token
**Arquivo:** `src/services/whatsapp/meta-cloud.service.ts`

- Endpoint: `POST https://graph.facebook.com/v24.0/oauth/access_token`
- Payload inclui `redirect_uri` **fixo**:
  - `https://whatrack.com/dashboard/settings/whatsapp/`

> Observação: o `redirect_uri` precisa casar exatamente com o que foi usado no popup e com a lista do painel da Meta.

## Verificação manual de conexão
**Arquivo:** `src/app/api/v1/whatsapp/check-connection/route.ts`

- Retorna `connected: true` se existir `whatsAppConfig` com `wabaId` e `phoneId` para a org ativa.
- Usado pelo botão "Verificar Conexão".

## Listagem de instâncias
**Arquivo:** `src/app/api/v1/whatsapp/phone-numbers/route.ts`

- Busca configs da org.
- Para cada `wabaId`, chama `MetaCloudService.listPhoneNumbers` usando o token armazenado.
- Agrega e retorna `phoneNumbers`.

## Webhook
**Arquivo:** `src/app/api/v1/whatsapp/webhook/route.ts`

- Valida assinatura `X-Hub-Signature-256`.
- Faz lookup da config por `wabaId` ou `phoneId`.
- Atualiza `lastWebhookAt` se a config existir.
- Persiste log em `whatsAppWebhookLog`.

## Estado e limpeza
- `state` é armazenado em `sessionStorage` e validado no frontend.
- Em sucesso/erro/cancelamento o estado é limpo.

## Resultado esperado (happy path)
1) Usuário abre o popup do Embedded Signup.
2) Meta envia `WA_EMBEDDED_SIGNUP` com `waba_id`.
3) Popup redireciona com `code`.
4) Front junta `waba_id` + `code` e chama `claim-waba`.
5) Backend troca `code` por token, salva config e assina webhooks.
6) A listagem de instâncias passa a retornar o número.

## Pontos sensíveis/limitações atuais
- `redirect_uri` do exchange é **hardcoded** em `MetaCloudService.exchangeCodeForToken`.
- Validação de `state` é feita **somente no frontend** (backend não verifica).
- `whatsAppConfig` é criado apenas no `claim` (webhook não cria config).
- Se o fluxo do popup não retornar `code`/`waba_id`, o claim não ocorre.

## Arquivos principais (referência rápida)
- `src/hooks/whatsapp/use-whatsapp-onboarding.ts`
- `src/app/dashboard/settings/whatsapp/page.tsx`
- `src/components/whatsapp/embedded-signup-button.tsx`
- `src/app/api/v1/whatsapp/claim-waba/route.ts`
- `src/services/whatsapp/meta-cloud.service.ts`
- `src/app/api/v1/whatsapp/check-connection/route.ts`
- `src/app/api/v1/whatsapp/phone-numbers/route.ts`
- `src/app/api/v1/whatsapp/webhook/route.ts`
