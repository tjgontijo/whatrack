# 📚 DOCUMENTAÇÃO FINAL - ATUALIZADA

**Versão:** 2.1 (Hosted Embedded Signup + OAuth Callback + debug_token)
**Status:** Ready for Production
**Última atualização:** 2026-02-16
**Fluxo:** Opção A - Hosted (sem JS SDK)

---

## 🎯 O Fluxo Correto

```
┌─────────────────────────────────────────────────────────────┐
│ Cliente clica "Conectar WhatsApp" no seu SaaS              │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ GET /api/v1/whatsapp/onboarding                            │
│ ├─ Gera trackingCode (cuid2)                               │
│ ├─ Salva WhatsAppOnboarding no BD (TTL 24h)                │
│ └─ Retorna URL Meta com state={trackingCode}               │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend abre popup: facebook.com/dialog/oauth?...         │
│ (com redirect_uri, config_id, state)                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Cliente completa Embedded Signup na Meta                    │
│ (escaneia QR code, autoriza app, etc)                       │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Meta redireciona para /callback?code=...&state=...         │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ GET /api/v1/whatsapp/onboarding/callback                   │
│ ├─ 1. Valida state = trackingCode (no BD)                  │
│ ├─ 2. POST /oauth/access_token (troca code por token)      │
│ ├─ 3. GET /debug_token (extrai WABA IDs do granular_scopes)│
│ ├─ 4. Para cada WABA:                                       │
│ │   ├─ GET /{waba_id} (info da WABA)                        │
│ │   ├─ GET /{waba_id}/phone_numbers                         │
│ │   ├─ Cria WhatsAppConnection                              │
│ │   ├─ Cria WhatsAppConfig (token criptografado)            │
│ │   └─ POST /{waba_id}/subscribed_apps (webhooks)           │
│ ├─ 5. Marca onboarding como completed                       │
│ └─ 6. Redireciona para /settings/whatsapp?status=success    │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ ✅ Pronto! Cliente pode receber/enviar mensagens            │
│ ✅ Webhook PARTNER_ADDED chega depois (apenas confirma)     │
└─────────────────────────────────────────────────────────────┘
```

## ⚠️ ERROS COMUNS (já corrigidos)

| Erro | Errado | Correto |
|------|--------|---------|
| URL da API | `graph.instagram.com` | `graph.facebook.com` |
| Content-Type token | `application/json` | `application/x-www-form-urlencoded` |
| Buscar WABAs | `/me/businesses` | `debug_token` → `granular_scopes` |
| redirect_uri | Diferente do dialog | EXATAMENTE igual ao dialog |

---

# PHASE 1: MVP (7 DIAS)

## Objetivo
Onboarding funcional com OAuth callback em staging.

---

## Phase 1.1: Banco de Dados (2h)

### 1. Migrations (copie e execute)

```sql
-- Enums
CREATE TYPE "WhatsAppOnboardingStatus" AS ENUM ('pending', 'completed', 'expired', 'cancelled', 'failed');
CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('active', 'inactive', 'error');
CREATE TYPE "WhatsAppConfigStatus" AS ENUM ('pending', 'connected', 'disconnected', 'expired', 'error');

-- Tabela: rastreamento de onboarding
CREATE TABLE "whatsapp_onboarding" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  "trackingCode" varchar(36) NOT NULL UNIQUE,
  "status" "WhatsAppOnboardingStatus" NOT NULL DEFAULT 'pending',
  "initiatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" timestamp NOT NULL,
  "completedAt" timestamp,
  "webhookPayload" jsonb,
  "wabaId" varchar(255),
  "errorMessage" text,
  "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "whatsapp_onboarding_organizationId_idx" ON "whatsapp_onboarding"("organizationId");
CREATE INDEX "whatsapp_onboarding_trackingCode_idx" ON "whatsapp_onboarding"("trackingCode");
CREATE INDEX "whatsapp_onboarding_status_idx" ON "whatsapp_onboarding"("status");
CREATE INDEX "whatsapp_onboarding_expiresAt_idx" ON "whatsapp_onboarding"("expiresAt");

-- Tabela: conexão org ↔ WABA
CREATE TABLE "whatsapp_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  "wabaId" varchar(255) NOT NULL,
  "ownerBusinessId" varchar(255) NOT NULL,
  "status" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'active',
  "onboardingId" uuid REFERENCES "whatsapp_onboarding"("id") ON DELETE SET NULL,
  "connectedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disconnectedAt" timestamp,
  "lastWebhookAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "whatsapp_connections_unique" UNIQUE ("organizationId", "wabaId")
);

CREATE INDEX "whatsapp_connections_organizationId_idx" ON "whatsapp_connections"("organizationId");
CREATE INDEX "whatsapp_connections_wabaId_idx" ON "whatsapp_connections"("wabaId");
CREATE INDEX "whatsapp_connections_status_idx" ON "whatsapp_connections"("status");

-- Alterar whatsapp_configs
ALTER TABLE "whatsapp_configs"
ADD COLUMN "connectionId" uuid REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE;

-- Alterar whatsapp_messages
ALTER TABLE "whatsapp_messages"
ADD COLUMN "organizationId" uuid REFERENCES "organization"(id) ON DELETE CASCADE;

UPDATE "whatsapp_messages" wm
SET "organizationId" = (SELECT l."organizationId" FROM "leads" l WHERE l.id = wm."leadId");

CREATE INDEX "whatsapp_messages_organizationId_idx" ON "whatsapp_messages"("organizationId");

-- Atualizar webhook_logs
ALTER TABLE "whatsapp_webhook_logs"
ALTER COLUMN "organizationId" SET NOT NULL,
ADD COLUMN "field" varchar(100) NOT NULL DEFAULT 'unknown',
ADD COLUMN "processed" boolean NOT NULL DEFAULT false,
ADD COLUMN "processedAt" timestamp;

CREATE INDEX "whatsapp_webhook_logs_field_idx" ON "whatsapp_webhook_logs"("field");
CREATE INDEX "whatsapp_webhook_logs_processed_idx" ON "whatsapp_webhook_logs"("processed");
```

### 2. Rodar migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

---

## Phase 1.2: Backend - GET /onboarding-url (1h)

### 1. Criar endpoint

```typescript
// src/app/api/v1/whatsapp/onboarding-url/route.ts

import { getOrganizationId } from '@/lib/auth';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import crypto from 'crypto';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID;

export async function GET(request: Request) {
  try {
    const organizationId = getOrganizationId(request);
    if (!organizationId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1️⃣ Gerar tracking code
    const trackingCode = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 2️⃣ Salvar no BD
    await db.whatsAppOnboarding.create({
      data: {
        organizationId,
        trackingCode,
        status: 'pending',
        expiresAt,
      },
    });

    // 3️⃣ Salvar em Redis (cache rápido, com fallback)
    try {
      await redis.setex(
        `whatsapp:onboarding:${trackingCode}`,
        86400,
        JSON.stringify({ organizationId })
      );
    } catch (err) {
      console.warn('Redis save failed, continuing with DB only', err);
    }

    // 4️⃣ Montar URL Meta com OAuth flow
    const url = new URL('https://business.facebook.com/messaging/whatsapp/onboard/');
    
    url.searchParams.set('app_id', META_APP_ID!);
    url.searchParams.set('config_id', META_CONFIG_ID!);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', trackingCode); // ⭐ State = tracking code
    url.searchParams.set('redirect_uri', `${BASE_URL}/api/v1/whatsapp/callback`);
    
    // Não precisa mais de extras com sessionInfo (isso é para JS SDK)
    
    return Response.json({
      url: url.toString(),
      trackingCode,
      expiresAt,
    });

  } catch (error) {
    console.error('Failed to generate onboarding URL', error);
    return Response.json(
      { error: 'Failed to generate URL' },
      { status: 500 }
    );
  }
}
```

---

## Phase 1.3: Backend - GET /callback (2h)

### 1. Criar endpoint principal

```typescript
// src/app/api/v1/whatsapp/callback/route.ts

import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { metaCloudService } from '@/services/whatsapp/meta-cloud.service';
import { encryption } from '@/lib/encryption';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // tracking code

    if (!code || !state) {
      return redirectToError('Missing code or state');
    }

    console.log(`[Callback] Received: state=${state.substring(0, 8)}..., code=${code.substring(0, 8)}...`);

    // 1️⃣ VALIDAR STATE (tracking code)
    let onboarding = await db.whatsAppOnboarding.findUnique({
      where: { trackingCode: state },
      select: { id: true, organizationId: true, expiresAt: true },
    });

    if (!onboarding) {
      console.error(`[Callback] Invalid state: ${state}`);
      return redirectToError('Invalid or expired tracking code (not found)');
    }

    if (onboarding.expiresAt < new Date()) {
      console.error(`[Callback] State expired: ${state}`);
      return redirectToError('Tracking code expired (TTL exceeded)');
    }

    const organizationId = onboarding.organizationId;
    console.log(`[Callback] State valid for org: ${organizationId}`);

    // 2️⃣ TROCAR CODE POR TOKEN
    let tokenResponse: any;
    try {
      tokenResponse = await metaCloudService.exchangeCodeForToken(code);
      console.log(`[Callback] Token exchanged successfully`);
    } catch (error) {
      console.error(`[Callback] Token exchange failed`, error);
      return redirectToError(`Failed to exchange code: ${error.message}`);
    }

    const { access_token } = tokenResponse;

    // 3️⃣ LISTAR WABAS
    let wabas: any[];
    try {
      wabas = await metaCloudService.listWabas(access_token);
      console.log(`[Callback] Found ${wabas.length} WABAs`);
    } catch (error) {
      console.error(`[Callback] Failed to list WABAs`, error);
      return redirectToError(`Failed to list WABAs: ${error.message}`);
    }

    if (!wabas || wabas.length === 0) {
      console.error(`[Callback] No WABAs found`);
      return redirectToError('No WhatsApp Business Accounts found');
    }

    // 4️⃣ PROCESSAR CADA WABA (dentro de transaction)
    const results = await db.$transaction(async (tx) => {
      const createdConnections: any[] = [];

      for (const waba of wabas) {
        console.log(`[Callback] Processing WABA: ${waba.id}`);

        // 4a. Criar WhatsAppConnection
        const connection = await tx.whatsAppConnection.upsert({
          where: {
            organizationId_wabaId: {
              organizationId,
              wabaId: waba.id,
            },
          },
          create: {
            organizationId,
            wabaId: waba.id,
            ownerBusinessId: waba.owner_business_id || 'unknown',
            status: 'active',
            onboardingId: onboarding.id,
          },
          update: {
            status: 'active',
            onboardingId: onboarding.id,
            connectedAt: new Date(),
          },
        });

        console.log(`[Callback] Connection created: ${connection.id}`);

        // 4b. Listar telefones do WABA
        let phones: any[];
        try {
          phones = await metaCloudService.listPhoneNumbers({
            wabaId: waba.id,
            accessToken: access_token,
          });
          console.log(`[Callback] WABA ${waba.id} has ${phones.length} phone numbers`);
        } catch (error) {
          console.error(`[Callback] Failed to list phones for WABA ${waba.id}`, error);
          phones = [];
        }

        // 4c. Salvar cada telefone como WhatsAppConfig
        for (const phone of phones) {
          const encryptedToken = encryption.encrypt(access_token);

          const config = await tx.whatsAppConfig.upsert({
            where: { phoneId: phone.id },
            create: {
              organizationId,
              connectionId: connection.id,
              phoneId: phone.id,
              displayPhone: phone.display_phone_number,
              verifiedName: phone.verified_name,
              accessToken: encryptedToken,
              status: 'connected',
            },
            update: {
              accessToken: encryptedToken,
              status: 'connected',
              connectionId: connection.id,
              organizationId, // Garante que é da org certa
            },
          });

          createdConnections.push({
            wabaId: waba.id,
            phoneId: phone.id,
            displayPhone: phone.display_phone_number,
            configId: config.id,
          });

          console.log(`[Callback] Config created: phone=${phone.id}`);
        }
      }

      // 5️⃣ MARCAR ONBOARDING COMO COMPLETO
      await tx.whatsAppOnboarding.update({
        where: { id: onboarding.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          wabaId: wabas[0]?.id, // First WABA
        },
      });

      console.log(`[Callback] Onboarding completed`);

      return createdConnections;
    });

    // 6️⃣ CLEANUP REDIS
    try {
      await redis.del(`whatsapp:onboarding:${state}`);
    } catch (err) {
      console.warn('Redis cleanup failed', err);
    }

    console.log(`[Callback] ✅ Success! Org ${organizationId}, ${results.length} configs created`);

    // 7️⃣ REDIRECIONAR PARA SUCESSO
    const successUrl = new URL(`${BASE_URL}/dashboard/settings/whatsapp`);
    successUrl.searchParams.set('status', 'success');
    successUrl.searchParams.set('phoneCount', results.length.toString());

    return Response.redirect(successUrl.toString());

  } catch (error) {
    console.error('[Callback] Unexpected error', error);
    return redirectToError(`Unexpected error: ${error.message}`);
  }
}

function redirectToError(message: string) {
  const errorUrl = new URL(`${BASE_URL}/dashboard/settings/whatsapp`);
  errorUrl.searchParams.set('status', 'error');
  errorUrl.searchParams.set('message', encodeURIComponent(message));

  console.error(`[Callback] Redirecting to error: ${message}`);

  return Response.redirect(errorUrl.toString());
}
```

### 2. Meta Cloud Service (métodos novos)

```typescript
// src/services/whatsapp/meta-cloud.service.ts

const GRAPH_API_URL = 'https://graph.facebook.com';
const API_VERSION = 'v24.0';

export class MetaCloudService {
  /**
   * Trocar authorization code por access token
   * ⚠️ IMPORTANTE: Usar graph.facebook.com, NÃO graph.instagram.com
   * ⚠️ IMPORTANTE: Usar application/x-www-form-urlencoded, NÃO JSON
   */
  static async exchangeCodeForToken(code: string, redirectUri?: string) {
    const url = `${GRAPH_API_URL}/${API_VERSION}/oauth/access_token`;
    const finalRedirectUri = redirectUri || `${process.env.APP_URL}/api/v1/whatsapp/onboarding/callback`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_META_APP_ID || '',
        client_secret: process.env.META_APP_SECRET || '',
        redirect_uri: finalRedirectUri,
        code,
      }).toString(),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Token exchange failed');
    return data as { access_token: string; expires_in?: number };
  }

  /**
   * Listar WABAs via debug_token (granular_scopes)
   * ⚠️ IMPORTANTE: /me/businesses NÃO funciona para Embedded Signup
   * ⚠️ Use debug_token para extrair WABA IDs dos granular_scopes
   */
  static async listWabas(accessToken: string) {
    // 1. Usar debug_token para obter WABA IDs dos granular_scopes
    const debugData = await this.debugToken(accessToken);
    const granularScopes = debugData.granular_scopes || [];
    const wabaIds: string[] = [];

    for (const scope of granularScopes) {
      if (scope.scope === 'whatsapp_business_management' && scope.target_ids) {
        wabaIds.push(...scope.target_ids);
      }
    }

    if (wabaIds.length === 0) {
      throw new Error('No WABAs found in granular_scopes');
    }

    // 2. Buscar detalhes de cada WABA
    const allWabas = [];
    for (const wabaId of wabaIds) {
      try {
        const wabaInfo = await this.getAccountInfo({ wabaId, accessToken });
        allWabas.push({
          wabaId,
          wabaName: wabaInfo.name || 'WhatsApp Business',
          businessId: wabaInfo.owner_business_info?.id || 'unknown',
        });
      } catch (err) {
        allWabas.push({ wabaId, wabaName: 'WhatsApp Business', businessId: 'unknown' });
      }
    }

    return allWabas;
  }

  /**
   * Debug token para obter granular_scopes com WABA IDs
   */
  static async debugToken(inputToken: string) {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const appToken = `${appId}|${appSecret}`;

    const url = `${GRAPH_API_URL}/${API_VERSION}/debug_token?input_token=${encodeURIComponent(inputToken)}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${appToken}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Debug token failed');
    return data.data as {
      is_valid: boolean;
      granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
    };
  }

  /**
   * Listar telefones de uma WABA
   */
  static async listPhoneNumbers({ wabaId, accessToken }: { wabaId: string; accessToken: string }) {
    const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Failed to list phones');
    return data.data || [];
  }

  /**
   * Obter informações de uma WABA
   */
  static async getAccountInfo({ wabaId, accessToken }: { wabaId: string; accessToken: string }) {
    const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}?fields=id,name,owner_business_info`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Failed to get WABA info');
    return data;
  }

  /**
   * Assinar webhooks de uma WABA
   */
  static async subscribeToWaba(wabaId: string, accessToken: string) {
    const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/subscribed_apps`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Failed to subscribe');
    return data;
  }
}
```

### ⚠️ ERROS COMUNS A EVITAR

1. **URL errada**: Usar `graph.facebook.com`, NUNCA `graph.instagram.com`
2. **Content-Type errado**: Token exchange usa `application/x-www-form-urlencoded`, não JSON
3. **Endpoint errado para WABAs**: `/me/businesses` NÃO funciona para Embedded Signup - usar `debug_token` com `granular_scopes`
4. **redirect_uri diferente**: O redirect_uri no token exchange DEVE ser EXATAMENTE igual ao usado no dialog OAuth

### 3. Encryption helper

```typescript
// src/lib/encryption.ts

import crypto from 'crypto';

const algorithm = 'aes-256-gcm';

export class TokenEncryption {
  private key: Buffer;

  constructor() {
    const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be 64-char hex (256 bits)');
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

export const encryption = new TokenEncryption();
```

---

## Phase 1.4: Frontend (1h)

### 1. Hook simplificado

```typescript
// src/hooks/whatsapp/use-whatsapp-onboarding.ts

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { useRouter } from 'next/navigation';

export function useWhatsAppOnboarding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();
  const router = useRouter();

  const startOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Obter URL do backend
      const { data } = await api.get('/v1/whatsapp/onboarding-url');

      if (!data.url) {
        throw new Error('No onboarding URL returned');
      }

      // 2. Abrir popup
      const popup = window.open(
        data.url,
        'whatsapp_onboarding',
        'width=600,height=700,popup=yes'
      );

      if (!popup) {
        // Popup bloqueado, fazer redirect direto
        console.warn('Popup blocked, redirecting directly');
        window.location.href = data.url;
        return;
      }

      // 3. Monitorar fechamento do popup
      // Meta vai redirecionar o popup para /callback
      // Que vai redirecionar para /settings/whatsapp?status=success
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          console.log('Popup closed, reloading...');
          router.refresh(); // Recarrega página para pegar dados novos
        }
      }, 500);

      // Timeout: se popup aberto > 10min, considerar cancelado
      setTimeout(() => {
        if (!popup.closed) {
          popup.close();
        }
        clearInterval(checkClosed);
      }, 10 * 60 * 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Onboarding failed', err);
    } finally {
      setLoading(false);
    }
  };

  return { startOnboarding, loading, error };
}
```

### 2. Button component

```typescript
// src/components/whatsapp/embedded-signup-button.tsx

import { useWhatsAppOnboarding } from '@/hooks/whatsapp/use-whatsapp-onboarding';
import { Button } from '@/components/ui/button';

export function EmbeddedSignupButton() {
  const { startOnboarding, loading, error } = useWhatsAppOnboarding();

  return (
    <div className="space-y-2">
      <Button
        onClick={() => startOnboarding()}
        disabled={loading}
        className="w-full"
      >
        {loading ? '⏳ Abrindo...' : '✨ Conectar WhatsApp'}
      </Button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
```

### 3. Settings page (com feedback)

```typescript
// src/app/dashboard/settings/whatsapp/page.tsx

import { useSearchParams } from 'next/navigation';

export default function WhatsAppSettingsPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const message = searchParams.get('message');

  return (
    <div className="space-y-4">
      {status === 'success' && (
        <div className="bg-green-50 border border-green-200 p-4 rounded">
          ✅ WhatsApp conectado com sucesso!
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 p-4 rounded">
          ❌ Erro: {message || 'Falha ao conectar'}
        </div>
      )}

      <EmbeddedSignupButton />
    </div>
  );
}
```

---

## Phase 1.5: Webhook - Apenas log (30 min)

### 1. Handler simplificado

```typescript
// src/services/whatsapp/webhook/account-update.handler.ts

export async function accountUpdateHandler(value: any) {
  const event = value.event;
  const { waba_id } = value.waba_info || {};

  // ⭐ Webhook é apenas confirmação
  // Tudo já foi salvo no /callback
  
  switch (event) {
    case 'PARTNER_ADDED':
      console.log(`✅ PARTNER_ADDED confirmed for WABA: ${waba_id}`);
      // Apenas log, sem criar nada
      break;

    case 'PARTNER_REMOVED':
      console.log(`❌ PARTNER_REMOVED for WABA: ${waba_id}`);
      // Apenas log, sem deletar nada
      break;

    default:
      console.debug(`Unknown event: ${event}`);
  }
}
```

### 2. Messages handler

```typescript
// src/services/whatsapp/webhook/messages.handler.ts

import { db } from '@/lib/db';

export async function messagesHandler(value: any) {
  const { metadata, messages = [] } = value;
  const { phone_number_id } = metadata;

  // Buscar config
  const config = await db.whatsAppConfig.findUnique({
    where: { phoneId: phone_number_id },
    select: { id: true, organizationId: true },
  });

  if (!config) {
    console.warn(`Phone ${phone_number_id} not configured`);
    return;
  }

  // Salvar mensagens
  for (const msg of messages) {
    try {
      await db.message.create({
        data: {
          organizationId: config.organizationId,
          wamid: msg.id,
          configId: config.id,
          leadId: msg.from, // TODO: buscar/criar lead
          direction: 'INBOUND',
          type: msg.type,
          body: msg.text?.body,
          timestamp: new Date(msg.timestamp * 1000),
          status: 'received',
        },
      });
    } catch (error) {
      console.error('Failed to save message', error);
    }
  }

  // Atualizar lastWebhookAt
  await db.whatsAppConfig.update({
    where: { id: config.id },
    data: { lastWebhookAt: new Date() },
  });
}
```

### 3. Webhook route (limpa)

```typescript
// src/app/api/v1/whatsapp/webhook/route.ts

import { validateWebhookSignature } from '@/lib/webhook/signature-validator';
import { WebhookProcessor } from '@/services/whatsapp/webhook-processor';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge);
  }

  return new Response('Unauthorized', { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-hub-signature-256');

    // Validar signature
    if (!validateWebhookSignature(body, signature)) {
      console.warn('[Webhook] Invalid signature');
      return Response.json({ received: true }); // Sempre 200
    }

    // Processar
    const processor = new WebhookProcessor();
    await processor.process(body);

  } catch (error) {
    console.error('[Webhook] Processing failed', error);
  }

  // ⭐ SEMPRE retornar 200 OK para Meta
  return Response.json({ received: true });
}
```

---

## Phase 1.6: Deploy Staging (1h)

```bash
# 1. Rodar migrations
npx prisma migrate deploy

# 2. Gerar chave de criptografia
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Salvar em .env como TOKEN_ENCRYPTION_KEY

# 3. Atualizar .env
NEXT_PUBLIC_BASE_URL=https://staging.seu-saas.com
NEXT_PUBLIC_META_APP_ID=seu-app-id
NEXT_PUBLIC_META_CONFIG_ID=seu-config-id
META_APP_SECRET=seu-secret
TOKEN_ENCRYPTION_KEY=64-char-hex
REDIS_URL=redis://localhost:6379
META_WEBHOOK_VERIFY_TOKEN=seu-verify-token

# 4. Deploy
git push origin phase-1
vercel deploy --prod

# 5. Configurar Meta Dashboard
# Settings → WhatsApp
# Embedded Signup Configuration
# Valid OAuth Redirect URIs: https://staging.seu-saas.com/api/v1/whatsapp/callback

# 6. Testar
# Abrir https://staging.seu-saas.com/dashboard/settings/whatsapp
# Clicar "Conectar WhatsApp"
# Fazer onboarding
# Verificar BD se configuração foi salva
```

---

## ✅ Phase 1 Checklist

- [ ] Migrations executadas
- [ ] Variables de env configuradas
- [ ] redirect_uri adicionado no Meta Dashboard
- [ ] GET /onboarding-url funcionando
- [ ] GET /callback funcionando
- [ ] Dados salvos no BD corretamente
- [ ] Frontend abrindo popup e recebendo redirect
- [ ] Token criptografado no BD
- [ ] Webhook apenas logando (não criando)
- [ ] Tudo em staging

---

---

# PHASE 2: PRODUCTION (5 DIAS)

## Phase 2.1: Token Health Check (2h)

```typescript
// src/services/whatsapp/token-health.service.ts

import axios from 'axios';
import { db } from '@/lib/db';
import { encryption } from '@/lib/encryption';

export class TokenHealthService {
  async checkToken(token: string) {
    try {
      const response = await axios.get(
        `https://graph.instagram.com/debug_token`,
        {
          params: {
            input_token: token,
            access_token: process.env.META_APP_ACCESS_TOKEN,
          },
        }
      );

      const { data } = response.data;
      return { valid: data.is_valid, expiresIn: data.expires_at ? data.expires_at - Math.floor(Date.now() / 1000) : undefined };
    } catch (error) {
      return { valid: false };
    }
  }

  async checkOrgTokens(organizationId: string) {
    const configs = await db.whatsAppConfig.findMany({
      where: { organizationId, status: 'connected' },
    });

    for (const config of configs) {
      try {
        const token = encryption.decrypt(config.accessToken!);
        const health = await this.checkToken(token);

        const status = health.valid
          ? health.expiresIn && health.expiresIn < 7 * 24 * 3600
            ? 'expiring_soon'
            : 'valid'
          : 'invalid';

        await db.whatsAppConfig.update({
          where: { id: config.id },
          data: { tokenStatus: status },
        });
      } catch (error) {
        console.error('Token check failed', error);
      }
    }
  }
}
```

## Phase 2.2: Cron Job (1h)

```typescript
// src/jobs/token-health-check.job.ts

import { CronJob } from 'cron';
import { TokenHealthService } from '@/services/whatsapp/token-health.service';
import { db } from '@/lib/db';

const service = new TokenHealthService();

export const tokenHealthCheckJob = new CronJob(
  '0 2 * * *', // 2 AM daily
  async () => {
    try {
      const orgs = await db.organization.findMany({ select: { id: true } });
      for (const org of orgs) {
        await service.checkOrgTokens(org.id);
      }
      console.log('✅ Token health check completed');
    } catch (error) {
      console.error('Token health check failed', error);
    }
  },
  null,
  true
);

// Em src/main.ts
tokenHealthCheckJob.start();
```

## Phase 2.3: Webhook Retry (2h)

```typescript
// src/jobs/webhook-retry.job.ts

import { CronJob } from 'cron';
import { WebhookProcessor } from '@/services/whatsapp/webhook-processor';
import { db } from '@/lib/db';

export const webhookRetryJob = new CronJob(
  '*/5 * * * *', // Every 5 minutes
  async () => {
    try {
      const failed = await db.whatsAppWebhookLog.findMany({
        where: {
          processed: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        take: 50,
      });

      for (const log of failed) {
        try {
          const processor = new WebhookProcessor();
          await processor.process(log.payload);

          await db.whatsAppWebhookLog.update({
            where: { id: log.id },
            data: { processed: true, processedAt: new Date() },
          });
        } catch (error) {
          console.error(`Webhook retry failed: ${log.id}`, error);
        }
      }
    } catch (error) {
      console.error('Webhook retry job failed', error);
    }
  },
  null,
  true
);

webhookRetryJob.start();
```

---

# PHASE 3: MONITORING (3 DIAS)

## Phase 3.1: Sentry Alerts

```typescript
import * as Sentry from '@sentry/nextjs';

// No /callback
if (!wabas || wabas.length === 0) {
  Sentry.captureException(new Error('No WABAs found'), { 
    tags: { context: 'whatsapp_callback' } 
  });
}

// No token health check
if (status === 'expiring_soon') {
  Sentry.captureMessage(
    `Token expiring for config ${config.id}`,
    'warning'
  );
}
```

## Phase 3.2: Admin Queries

```typescript
// src/services/whatsapp/dashboard.service.ts

export class DashboardService {
  async getStatus(organizationId: string) {
    const [configs, connections, messages] = await Promise.all([
      db.whatsAppConfig.count({ where: { organizationId, status: 'connected' } }),
      db.whatsAppConnection.count({ where: { organizationId, status: 'active' } }),
      db.message.count({ where: { organizationId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ]);

    return { configs, connections, messages };
  }
}
```

---

## ✅ Checklist Final

### Pré-deploy
- [ ] Migrations prontas
- [ ] Variáveis de env configuradas
- [ ] Token encryption ativo
- [ ] redirect_uri registrado na Meta
- [ ] Sentry configurado

### Implementação
- [ ] GET /onboarding-url ✓
- [ ] GET /callback ✓
- [ ] Webhook handlers ✓
- [ ] Token health check ✓
- [ ] Webhook retry job ✓

### Testes
- [ ] E2E happy path
- [ ] State expirado
- [ ] Code inválido
- [ ] Duplo submit

### Deploy
- [ ] Staging funcionando por 24h
- [ ] Logs limpos
- [ ] Alerts testados
- [ ] Deploy para produção

---

## 📋 Variáveis de Ambiente

```env
# Meta
NEXT_PUBLIC_META_APP_ID=seu-app-id
NEXT_PUBLIC_META_CONFIG_ID=seu-config-id
META_APP_SECRET=seu-secret
META_APP_ACCESS_TOKEN=para-health-check
META_WEBHOOK_VERIFY_TOKEN=seu-verify-token

# Encryption
TOKEN_ENCRYPTION_KEY=64-char-hex

# URLs
NEXT_PUBLIC_BASE_URL=https://seu-saas.com

# Redis
REDIS_URL=redis://...

# Sentry
SENTRY_DSN=seu-dsn
```

---

**Você está pronto para implementar!** 🚀

Dúvidas? Vejo você no código!