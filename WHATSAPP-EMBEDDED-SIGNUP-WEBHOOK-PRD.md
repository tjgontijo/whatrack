# WhaTrack - PRD: Embedded Signup + Webhook Dinâmico

## 1) Visão Geral

Este PRD define a arquitetura para o WhaTrack operar como **WhatsApp Tech Provider**, com:

1. **Embedded Signup (Link Direto)** — Onboarding self-service via link da Meta, com resposta via webhook.
2. **Webhook Dinâmico** — Roteamento de eventos por organização.

Abordagem revisada com foco em **segurança, idempotência e correlação determinística**.

---

## 2) Modelo de Autenticação: Tech Provider

O WhaTrack usa um **System User Token** global (permanente) para gerenciar todas as WABAs dos clientes. O cliente não fornece token; ele apenas "compartilha" a WABA com o nosso App via Embedded Signup.

```
Cliente compartilha WABA → WhaTrack gerencia via System User Token próprio
```

**Vantagem**: Token único, sem expiração de tokens individuais, sem refresh por cliente.

**Variável de ambiente:**
```env
META_ACCESS_TOKEN=EAAV...   # Token permanente do System User (Admin)
```

---

## PARTE 1: Embedded Signup (Link Direto)

### 3) Fluxo de Onboarding

**Link de Onboarding (já funcional):**
```
https://business.facebook.com/messaging/whatsapp/onboard/
  ?app_id=1531656324571133
  &config_id=1410410867548573
  &extras={"featureType":"whatsapp_business_app_onboarding","sessionInfoVersion":"3","version":"v3"}
```

**Fluxo:**

```
1. Cliente clica "Conectar WhatsApp"
   └─ Abre link da Meta em nova aba (com organizationId no extras)

2. Cliente completa na Meta (login, WABA, número)

3. Meta envia webhook para o WhaTrack
   └─ Payload contém WABA ID, Phone ID

4. WhaTrack processa webhook
   ├─ Correlaciona via organizationId do state (extras)
   ├─ Usa Meta Access Token para register + subscribe
   └─ Salva WhatsAppConfig (upsert atômico)

5. Cliente volta ao WhaTrack
   └─ Vê status "Conectado" (via polling ou botão "Verificar")
```

### 4) Correlação Determinística com `state`

**Problema**: Se 2+ clientes onboardam ao mesmo tempo, como saber qual WABA pertence a qual organização?

**Solução**: Incluir o `organizationId` no campo `extras` da URL de onboarding. A Meta devolve esse valor no webhook de callback, permitindo correlação exata.

```typescript
// Frontend: construir URL com organizationId no extras
const extras = {
  featureType: 'whatsapp_business_app_onboarding',
  sessionInfoVersion: '3',
  version: 'v3',
  setup: { organizationId: session.activeOrganizationId }
};

const url = `https://business.facebook.com/messaging/whatsapp/onboard/`
  + `?app_id=${META_APP_ID}`
  + `&config_id=${META_CONFIG_ID}`
  + `&extras=${encodeURIComponent(JSON.stringify(extras))}`;
```

```typescript
// Backend: extrair organizationId do webhook
const extras = payload.entry?.[0]?.changes?.[0]?.value?.extras;
const organizationId = extras?.setup?.organizationId;
```

**Sem isso**: Você depende de heurísticas ("pegar a WABA mais recente"), que falham em concorrência.

### 5) Implementação

#### 5.1) Frontend — Botão de Conexão

- [ ] Botão "Conectar WhatsApp" que abre o link da Meta em nova aba.
- [ ] URL construída dinamicamente com `organizationId` no `extras.setup`.
- [ ] Exibir estados: `Não conectado` / `Pendente` / `Conectado`.
- [ ] Botão "Verificar Conexão" (fallback manual caso webhook atrase).
- [ ] Polling a cada 5s após abertura do link (opcional).

**Variáveis de ambiente (NEXT_PUBLIC):**
```env
NEXT_PUBLIC_META_APP_ID=1531656324571133
NEXT_PUBLIC_META_CONFIG_ID=1410410867548573
```

#### 5.2) Backend — Processamento do Webhook de Onboarding

- [ ] Identificar evento de onboarding no payload.
- [ ] Extrair `organizationId` do `extras.setup` (correlação determinística).
- [ ] Extrair `waba_id` e `phone_number_id` do payload.
- [ ] Usar Meta Access Token para:
  1. Registrar número (`POST /{PHONE_ID}/register`)
  2. Assinar app na WABA (`POST /{WABA_ID}/subscribed_apps`)
- [ ] Salvar via `prisma.whatsAppConfig.upsert` (idempotente).
- [ ] Logar como `eventType: 'embedded_signup'`.

#### 5.3) Backend — Verificação Manual (Fallback)

Endpoint `POST /api/v1/whatsapp/check-connection`:
- [ ] Listar WABAs acessíveis pelo Access Token via API da Meta.
- [ ] Encontrar WABA nova não associada a nenhuma organização.
- [ ] Vincular à organização do usuário logado.
- [ ] Usar **lock por organização** (`SELECT FOR UPDATE` ou mutex) para evitar race condition em cliques múltiplos.

### 6) Schema Prisma

```prisma
model WhatsAppConfig {
  id               String       @id @default(cuid())
  organizationId   String       @unique
  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  wabaId           String?      @unique  // ← UNIQUE: impede 2 orgs com a mesma WABA
  phoneId          String?      @unique  // ← UNIQUE: impede 2 orgs com o mesmo número
  
  displayPhone     String?               // Formato visual (+55 11 ...)
  verifiedName     String?               // Nome do negócio na Meta
  status           String       @default("pending") // pending, connected, disconnected
  connectedAt      DateTime?             // Quando foi conectado
  lastWebhookAt    DateTime?             // Último evento recebido (detecta integrações mortas)

  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  @@map("whatsapp_configs")
}
```

**Mudanças vs. schema atual:**
| Campo | Antes | Depois | Motivo |
|:---|:---|:---|:---|
| `wabaId` | `String?` | `String? @unique` | Impede WABA duplicada entre orgs |
| `phoneId` | `String?` | `String? @unique` | Impede número duplicado entre orgs |
| `accessToken` | `String?` | **Removido** | Usamos Meta Access Token global (env) |
| `connectedAt` | — | `DateTime?` | Auditoria de quando conectou |
| `lastWebhookAt` | — | `DateTime?` | Detectar integrações mortas |

---

## PARTE 2: Webhook Dinâmico por Organização

### 7) Estratégia Híbrida (Override + Dispatcher)

**Restrição da Meta:** Por padrão, todos os eventos vão para UMA URL configurada no App Dashboard.

**Override por WABA:** A API `POST /{WABA_ID}/subscribed_apps` aceita `override_callback_uri`, mas pode falhar ou ser ignorado.

**Solução: dois planos simultâneos.**

```
┌─────────────────────────────────────────────────────────────┐
│  Plano A (Ideal): Override funciona                         │
│                                                             │
│  Meta envia para:                                           │
│  https://whatrack.com/api/v1/whatsapp/webhook/{orgId}       │
│    └─ orgId extraído da URL → zero queries                  │
│                                                             │
│  Plano B (Fallback): Override falha                         │
│                                                             │
│  Meta envia para:                                           │
│  https://whatrack.com/api/v1/whatsapp/webhook               │
│    └─ Dispatcher extrai phoneId do payload                  │
│       └─ Busca organização por phoneId (1 query)            │
│          └─ Fallback: busca por wabaId                      │
└─────────────────────────────────────────────────────────────┘
```

### 8) Implementação

#### 8.1) Rota Dinâmica (`[organizationId]/route.ts`)

- [ ] Criar `src/app/api/v1/whatsapp/webhook/[organizationId]/route.ts`.
- [ ] **GET**: Verificação (`hub.verify_token` + `hub.challenge`).
- [ ] **POST**: Processar evento com `organizationId` da URL (sem query).
- [ ] Validar que o `organizationId` existe no banco (cache simples).

#### 8.2) Rota Raiz como Dispatcher (Fallback)

- [ ] Manter `src/app/api/v1/whatsapp/webhook/route.ts` ativo.
- [ ] Dispatcher busca organização por `phoneId` primeiro, depois por `wabaId`.
- [ ] Logar warning indicando que o override não funcionou.

#### 8.3) Registro do Override (No Onboarding)

```typescript
async function subscribeAppToWaba(wabaId: string, orgId: string) {
  const systemToken = process.env.META_ACCESS_TOKEN;
  const dynamicUrl = `https://whatrack.com/api/v1/whatsapp/webhook/${orgId}`;

  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${wabaId}/subscribed_apps`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${systemToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        override_callback_uri: dynamicUrl,
        verify_token: process.env.META_WEBHOOK_VERIFY_TOKEN,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('[subscribeAppToWaba] Override falhou, usando fallback global:', data);
    // Fallback: subscribe sem override (vai para URL global do App)
    await fetch(
      `https://graph.facebook.com/${API_VERSION}/${wabaId}/subscribed_apps`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${systemToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
```

#### 8.4) Segurança: Validação HMAC (`X-Hub-Signature-256`)

A Meta assina cada webhook com HMAC-SHA256 usando o App Secret. **Implementar verificação em ambas as rotas** (dinâmica e raiz):

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.META_APP_SECRET!)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

// No handler POST:
const rawBody = await request.text();
const signature = request.headers.get('x-hub-signature-256');

if (!verifyWebhookSignature(rawBody, signature)) {
  console.error('[webhook] Assinatura inválida - possível ataque');
  return new Response('Invalid signature', { status: 401 });
}

const payload = JSON.parse(rawBody);
```

**Por que `timingSafeEqual`**: Previne timing attacks na comparação de strings.

#### 8.5) Atualização da UI (`WebhooksView`)

- [ ] URL exibida dinâmica: `https://whatrack.com/api/v1/whatsapp/webhook/{organizationId}`.
- [ ] Logs filtrados por organização logada.

---

## 9) Riscos e Mitigações

| Risco | Prob. | Impacto | Mitigação |
|:---|:---|:---|:---|
| **Webhook de onboarding não chega** | Alta (dev) | Cliente trava | Botão "Verificar Conexão" que varre WABAs via API |
| **2 clientes onboardam ao mesmo tempo** | Média | WABA associada à org errada | `organizationId` no `extras` (correlação determinística) |
| **WABA duplicada entre orgs** | Baixa | Corrupção de dados | `@unique` em `wabaId` e `phoneId` |
| **Override de webhook falha** | Média | Eventos vão pra raiz | Dispatcher na rota raiz (lookup por phoneId) |
| **Webhook falso (ataque)** | Média | Dados corrompidos | Validação HMAC `X-Hub-Signature-256` |
| **Meta Access Token expira** | Baixa | SaaS inteiro para | Token permanente + monitoramento mensal |
| **Race condition no "Verificar Conexão"** | Média | Config duplicada | `prisma.upsert` + lock por organização |

---

## 10) Checklist de Implementação

### Fase 1: Fundação (Pré-requisitos)
- [ ] Gerar System User (Admin) no Business Manager.
- [ ] Gerar Access Token Permanente para o System User.
- [ ] Garantir que `META_ACCESS_TOKEN` no `.env` é o token permanente.
- [ ] Migration Prisma: `@unique` em `wabaId` e `phoneId`, + novos campos.

### Fase 2: Webhook Dinâmico
- [ ] Criar rota `[organizationId]/route.ts`.
- [ ] Implementar validação HMAC em ambas as rotas.
- [ ] Manter rota raiz como Dispatcher.

### Fase 3: Onboarding
- [ ] Frontend: botão com link + `organizationId` no extras.
- [ ] Backend: processar webhook de onboarding (com correlação via state).
- [ ] Backend: endpoint `/check-connection` (fallback manual).
- [ ] Lógica de `subscribeAppToWaba` com tentativa de override.

### Fase 4: Polimento
- [ ] Atualizar `WebhooksView` com URL dinâmica e filtro por org.
- [ ] Centralizar `API_VERSION` (remover duplicação do `activate/route.ts`).
- [ ] Teste end-to-end: onboarding → webhook → mensagem de teste.

---

## 11) Definição de Pronto

1. Cliente clica "Conectar WhatsApp" → completa na Meta → `WhatsAppConfig` salvo com `status: connected`.
2. Sistema envia mensagem de teste ("Hello World") usando Meta Access Token.
3. Webhook recebe status da mensagem (seja via URL dinâmica ou via dispatcher).
4. Segundo onboarding simultâneo não corrompe dados (correlação por state).
5. Webhook falso (sem HMAC válido) é rejeitado com 401.

---

## 12) Referências

- **Link de Onboarding**: `https://business.facebook.com/messaging/whatsapp/onboard/?app_id=1531656324571133&config_id=1410410867548573&extras=...`
- **Embedded Signup**: [developers.facebook.com/docs/whatsapp/embedded-signup](https://developers.facebook.com/docs/whatsapp/embedded-signup)
- **Override Callback URI**: [developers.facebook.com/docs/whatsapp/cloud-api/get-started#configure-webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started#configure-webhooks)
- **HMAC Verification**: [developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests](https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests)
- **PRD Organização**: `ORGANIZACAO-SAAS-PRD.md`
- **PRD Template CRUD**: `WHATSAPP-TEMPLATE-CRUD-PRD.md`
