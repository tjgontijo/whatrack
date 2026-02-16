# 📚 DOCUMENTAÇÃO FINAL: WhatsApp Onboarding v2

**Status:** Ready for Production (faseado)  
**Removida:** v1 (legacy, não funciona)  
**Escopo:** Implementação 100% v2 apenas  

---

## 🎯 Visão Geral

Novo fluxo de onboarding WhatsApp com:
- ✅ Tracking code seguro (UUID)
- ✅ Webhook como fonte da verdade
- ✅ Suporte completo a coexistence
- ✅ Arquitetura escalável com handlers separados
- ✅ Produção-ready com segurança

---

## 📊 Fases de Implementação

```
Phase 1: MVP (7 dias)           Phase 2: Production (5 dias)     Phase 3: Monitoring (3 dias)
├─ BD migrations                ├─ Token encryption              ├─ Alertas
├─ Endpoint onboarding-url      ├─ Token health check            ├─ Dashboards
├─ Webhook processor            ├─ DLQ + retry                   └─ Observabilidade
├─ Handlers básicos             ├─ Rate limiting
└─ Deploy staging               └─ Testes E2E
```

**Total: ~15 dias de trabalho (1 dev)**

---

# PHASE 1: MVP (7 DIAS) - FUNCIONALIDADE BÁSICA

## Objetivo
Onboarding funcional no staging. Pode desconectar, reconectar, receber mensagens.

## Requisitos
- Postgres
- Redis
- Next.js 14+
- Prisma

---

## Phase 1.1: Banco de Dados (2h)

### 1. Criar enums e tabelas

```sql
-- Enums
CREATE TYPE "WhatsAppOnboardingStatus" AS ENUM ('pending', 'completed', 'expired', 'cancelled', 'failed');
CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('active', 'inactive', 'error');
CREATE TYPE "WhatsAppConfigStatus" AS ENUM ('pending', 'awaiting_confirmation', 'connected', 'disconnected', 'expired', 'error');

-- Tabela: rastreamento de onboarding
CREATE TABLE "whatsapp_onboarding" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  "trackingCode" varchar(36) NOT NULL UNIQUE,
  "status" "WhatsAppOnboardingStatus" NOT NULL DEFAULT 'pending',
  "initiatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" timestamp NOT NULL,
  "completedAt" timestamp,
  "cancelledAt" timestamp,
  "webhookReceivedAt" timestamp,
  "webhookPayload" jsonb,
  "wabaId" varchar(255),
  "ownerBusinessId" varchar(255),
  "phoneNumberId" varchar(255),
  "errorMessage" text,
  "errorCount" int NOT NULL DEFAULT 0,
  "userAgent" text,
  "ipAddress" varchar(45),
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
  "disconnectedBy" uuid,
  "lastWebhookAt" timestamp,
  "lastHealthCheckAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "whatsapp_connections_unique" UNIQUE ("organizationId", "wabaId")
);

CREATE INDEX "whatsapp_connections_organizationId_idx" ON "whatsapp_connections"("organizationId");
CREATE INDEX "whatsapp_connections_wabaId_idx" ON "whatsapp_connections"("wabaId");
CREATE INDEX "whatsapp_connections_status_idx" ON "whatsapp_connections"("status");

-- Atualizar whatsapp_configs
ALTER TABLE "whatsapp_configs"
ADD COLUMN "connectionId" uuid REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE,
ADD COLUMN "supportsCoexistence" boolean NOT NULL DEFAULT false,
ADD COLUMN "webhookFailures" int NOT NULL DEFAULT 0;

-- Atualizar whatsapp_messages
ALTER TABLE "whatsapp_messages"
ADD COLUMN "organizationId" uuid REFERENCES "organization"(id) ON DELETE CASCADE;

UPDATE "whatsapp_messages" wm
SET "organizationId" = (
  SELECT DISTINCT l."organizationId"
  FROM "leads" l
  WHERE l.id = wm."leadId"
);

CREATE INDEX "whatsapp_messages_organizationId_idx" ON "whatsapp_messages"("organizationId");

-- Atualizar webhook_logs
ALTER TABLE "whatsapp_webhook_logs"
ALTER COLUMN "organizationId" SET NOT NULL,
ADD COLUMN "field" varchar(100) NOT NULL DEFAULT 'unknown',
ADD COLUMN "processed" boolean NOT NULL DEFAULT false,
ADD COLUMN "processedAt" timestamp,
ADD COLUMN "processingError" text,
ADD COLUMN "signatureValid" boolean;

CREATE INDEX "whatsapp_webhook_logs_field_idx" ON "whatsapp_webhook_logs"("field");
CREATE INDEX "whatsapp_webhook_logs_processed_idx" ON "whatsapp_webhook_logs"("processed");
CREATE INDEX "whatsapp_webhook_logs_createdAt_idx" ON "whatsapp_webhook_logs"("createdAt");
```

### 2. Atualizar schema.prisma

```prisma
enum WhatsAppOnboardingStatus {
  pending
  completed
  expired
  cancelled
  failed
}

enum WhatsAppConnectionStatus {
  active
  inactive
  error
}

enum WhatsAppConfigStatus {
  pending
  awaiting_confirmation
  connected
  disconnected
  expired
  error
}

model WhatsAppOnboarding {
  id               String                     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId   String                     @db.Uuid
  organization     Organization               @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  trackingCode     String                     @unique @db.VarChar(36)
  status           WhatsAppOnboardingStatus   @default(pending)
  initiatedAt      DateTime                   @default(now())
  expiresAt        DateTime
  completedAt      DateTime?
  cancelledAt      DateTime?
  webhookReceivedAt DateTime?
  webhookPayload    Json?
  wabaId           String?
  ownerBusinessId  String?
  phoneNumberId    String?
  errorMessage     String?
  errorCount       Int                        @default(0)
  userAgent        String?
  ipAddress        String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  connection WhatsAppConnection?
  @@index([organizationId])
  @@index([trackingCode])
  @@index([status])
  @@index([expiresAt])
  @@map("whatsapp_onboarding")
}

model WhatsAppConnection {
  id               String                      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId   String                      @db.Uuid
  organization     Organization                @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  wabaId           String
  ownerBusinessId  String
  status           WhatsAppConnectionStatus    @default(active)
  onboardingId     String?                     @db.Uuid
  onboarding       WhatsAppOnboarding?         @relation(fields: [onboardingId], references: [id], onDelete: SetNull)
  connectedAt      DateTime                    @default(now())
  disconnectedAt   DateTime?
  disconnectedBy   String?                     @db.Uuid
  lastWebhookAt    DateTime?
  lastHealthCheckAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  configs WhatsAppConfig[]
  @@unique([organizationId, wabaId])
  @@index([organizationId])
  @@index([wabaId])
  @@index([status])
  @@map("whatsapp_connections")
}

model WhatsAppConfig {
  id               String                   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId   String                   @db.Uuid
  organization     Organization             @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  connectionId     String                   @db.Uuid
  connection       WhatsAppConnection       @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  phoneId          String                   @unique @db.VarChar(50)
  displayPhone     String?
  verifiedName     String?
  accessToken      String?
  tokenStatus      WhatsAppConfigStatus     @default(pending)
  tokenExpiresAt   DateTime?
  tokenLastCheckedAt DateTime?
  supportsCoexistence Boolean               @default(false)
  status           WhatsAppConfigStatus     @default(pending)
  lastWebhookAt    DateTime?
  webhookFailures  Int                      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  messages Message[]
  @@unique([organizationId, phoneId])
  @@index([organizationId])
  @@index([connectionId])
  @@index([status])
  @@map("whatsapp_configs")
}

model Message {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  wamid String @unique
  organizationId String @db.Uuid
  leadId String @db.Uuid
  lead   Lead   @relation(fields: [leadId], references: [id], onDelete: Cascade)
  configId String @db.Uuid
  config   WhatsAppConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  direction String
  type      String
  body      String? @db.Text
  mediaUrl  String?
  status    String
  timestamp      DateTime
  conversationId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([organizationId])
  @@index([leadId])
  @@index([configId])
  @@map("whatsapp_messages")
}

model WhatsAppWebhookLog {
  id               String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId   String        @db.Uuid
  organization     Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  field            String
  eventType        String?
  payload          Json
  processed        Boolean       @default(false)
  processedAt      DateTime?
  processingError  String?
  signatureValid   Boolean?
  createdAt DateTime @default(now())
  
  @@index([organizationId])
  @@index([field])
  @@index([processed])
  @@map("whatsapp_webhook_logs")
}

// Atualizar Organization
model Organization {
  // ... campos existentes ...
  
  whatsappOnboardings WhatsAppOnboarding[]
  whatsappConnections WhatsAppConnection[]
  whatsappConfigs     WhatsAppConfig[]
  webhookLogs         WhatsAppWebhookLog[]
}
```

### 3. Rodar migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

---

## Phase 1.2: Backend - Endpoint Onboarding (2h)

### 1. Criar rota GET `/api/v1/whatsapp/onboarding-url`

```typescript
// src/app/api/v1/whatsapp/onboarding-url/route.ts

import { getOrganizationId } from '@/lib/auth';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import crypto from 'crypto';

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
    const onboarding = await db.whatsAppOnboarding.create({
      data: {
        organizationId,
        trackingCode,
        status: 'pending',
        expiresAt,
      },
    });

    // 3️⃣ Salvar em Redis (cache)
    await redis.setex(
      `whatsapp:onboarding:${trackingCode}`,
      86400,
      JSON.stringify({ organizationId, initiatedAt: new Date().toISOString() })
    ).catch(err => console.warn('Redis save failed', err)); // Graceful degrade

    // 4️⃣ Montar extras JSON
    const extras = {
      featureType: 'whatsapp_business_app_onboarding',
      sessionInfoVersion: '3',
      version: 'v3',
      sessionInfo: {
        trackingCode,
      },
    };

    // 5️⃣ Construir URL
    const url = new URL('https://business.facebook.com/messaging/whatsapp/onboard/');
    url.searchParams.set('app_id', process.env.NEXT_PUBLIC_META_APP_ID!);
    url.searchParams.set('config_id', process.env.NEXT_PUBLIC_META_CONFIG_ID!);
    url.searchParams.set('extras', JSON.stringify(extras));

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

### 2. Helper para extrair tracking code do Redis com fallback

```typescript
// src/lib/whatsapp/onboarding-cache.ts

import { redis } from '@/lib/redis';
import { db } from '@/lib/db';

export async function getOnboardingData(trackingCode: string) {
  // 1️⃣ Tentar Redis
  try {
    const cached = await redis.get(`whatsapp:onboarding:${trackingCode}`);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.warn('Redis get failed', err);
  }

  // 2️⃣ Fallback: BD
  const onboarding = await db.whatsAppOnboarding.findUnique({
    where: { trackingCode },
    select: { organizationId: true, initiatedAt: true, expiresAt: true },
  });

  if (!onboarding) return null;

  // Validar TTL
  if (onboarding.expiresAt < new Date()) {
    return null;
  }

  return {
    organizationId: onboarding.organizationId,
    initiatedAt: onboarding.initiatedAt.toISOString(),
  };
}
```

---

## Phase 1.3: Webhook - Processor & Handlers (3h)

### 1. Signature validator

```typescript
// src/lib/webhook/signature-validator.ts

import crypto from 'crypto';

export function validateWebhookSignature(
  body: any,
  signature: string | null
): boolean {
  if (!signature) return false;

  const secret = process.env.META_APP_SECRET;
  if (!secret) throw new Error('META_APP_SECRET not configured');

  const payload = JSON.stringify(body);
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expectedSignature = `sha256=${hash}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}
```

### 2. WebhookProcessor

```typescript
// src/services/whatsapp/webhook-processor.ts

import { accountUpdateHandler } from './webhook/account-update.handler';
import { messagesHandler } from './webhook/messages.handler';

export class WebhookProcessor {
  async process(body: any) {
    let processedCount = 0;

    if (!body.entry || !Array.isArray(body.entry)) {
      return { count: 0 };
    }

    for (const entry of body.entry) {
      if (!entry.changes || !Array.isArray(entry.changes)) continue;

      for (const change of entry.changes) {
        const { field, value } = change;

        try {
          if (field === 'account_update') {
            await accountUpdateHandler(value);
            processedCount++;
          } else if (field === 'messages') {
            await messagesHandler(value);
            processedCount++;
          }
        } catch (error) {
          console.error(`Handler failed for field: ${field}`, error);
        }
      }
    }

    return { count: processedCount };
  }
}
```

### 3. Account update handler

```typescript
// src/services/whatsapp/webhook/account-update.handler.ts

import { accountUpdateService } from './account-update.service';

export async function accountUpdateHandler(value: any) {
  const event = value.event;

  switch (event) {
    case 'PARTNER_ADDED':
      await accountUpdateService.handlePartnerAdded(value);
      break;

    case 'PARTNER_REMOVED':
      await accountUpdateService.handlePartnerRemoved(value);
      break;

    default:
      console.debug(`Unknown event: ${event}`);
  }
}
```

### 4. Account update service

```typescript
// src/services/whatsapp/webhook/account-update.service.ts

import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { getOnboardingData } from '@/lib/whatsapp/onboarding-cache';

class AccountUpdateService {
  async handlePartnerAdded(value: any) {
    const trackingCode = value.sessionInfo?.trackingCode;
    const { waba_id, owner_business_id } = value.waba_info || {};

    // Identificar org
    let organizationId: string | null = null;

    if (trackingCode) {
      const data = await getOnboardingData(trackingCode);
      organizationId = data?.organizationId || null;
    }

    if (!organizationId && owner_business_id) {
      const existing = await db.whatsAppConnection.findFirst({
        where: { ownerBusinessId: owner_business_id },
        select: { organizationId: true },
      });
      organizationId = existing?.organizationId || null;
    }

    if (!organizationId) {
      console.error(`Não conseguiu identificar org para WABA ${waba_id}`);
      return;
    }

    // Criar connection
    const connection = await db.whatsAppConnection.upsert({
      where: { organizationId_wabaId: { organizationId, wabaId: waba_id } },
      create: {
        organizationId,
        wabaId: waba_id,
        ownerBusinessId: owner_business_id,
        status: 'active',
      },
      update: {
        status: 'active',
        connectedAt: new Date(),
      },
    });

    // Atualizar onboarding
    if (trackingCode) {
      await db.whatsAppOnboarding.update({
        where: { trackingCode },
        data: {
          status: 'completed',
          completedAt: new Date(),
          webhookReceivedAt: new Date(),
          webhookPayload: value,
          wabaId: waba_id,
          ownerBusinessId: owner_business_id,
        },
      });

      // Limpar Redis
      await redis.del(`whatsapp:onboarding:${trackingCode}`).catch(() => {});
    }

    console.log(`✅ Org ${organizationId} conectada (WABA: ${waba_id})`);
  }

  async handlePartnerRemoved(value: any) {
    const { waba_id } = value.waba_info || {};

    const conn = await db.whatsAppConnection.findFirst({
      where: { wabaId: waba_id },
    });

    if (!conn) return;

    await db.whatsAppConnection.update({
      where: { id: conn.id },
      data: { status: 'inactive', disconnectedAt: new Date() },
    });

    console.log(`❌ Org ${conn.organizationId} desconectada`);
  }
}

export const accountUpdateService = new AccountUpdateService();
```

### 5. Messages handler

```typescript
// src/services/whatsapp/webhook/messages.handler.ts

import { messagesService } from './messages.service';

export async function messagesHandler(value: any) {
  await messagesService.processMessages(value);
}
```

### 6. Messages service

```typescript
// src/services/whatsapp/webhook/messages.service.ts

import { db } from '@/lib/db';

class MessagesService {
  async processMessages(value: any) {
    const { metadata, messages = [] } = value;
    const { phone_number_id } = metadata;

    // Buscar config
    const config = await db.whatsAppConfig.findUnique({
      where: { phoneId: phone_number_id },
      select: { id: true, organizationId: true },
    });

    if (!config) {
      console.warn(`Phone ${phone_number_id} not found`);
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
}

export const messagesService = new MessagesService();
```

### 7. Rota webhook (refatorada)

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

    // Log webhook
    const orgId = extractOrgId(body);
    const webhookLog = await db.whatsAppWebhookLog.create({
      data: {
        organizationId: orgId,
        payload: body,
        processed: false,
        signatureValid: validateWebhookSignature(body, signature),
      },
    });

    // Validar signature
    if (!validateWebhookSignature(body, signature)) {
      await db.whatsAppWebhookLog.update({
        where: { id: webhookLog.id },
        data: { processed: true, processingError: 'Invalid signature' },
      });
      return Response.json({ received: true });
    }

    // Processar
    const processor = new WebhookProcessor();
    await processor.process(body);

    // Marcar como processado
    await db.whatsAppWebhookLog.update({
      where: { id: webhookLog.id },
      data: { processed: true, processedAt: new Date() },
    });

  } catch (error) {
    console.error('Webhook processing failed', error);
  }

  // Sempre retornar 200 OK
  return Response.json({ received: true });
}

function extractOrgId(body: any): string | null {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === 'account_update') {
        const trackingCode = change.value?.sessionInfo?.trackingCode;
        // Você teria que buscar isso, por enquanto retorna null
        return null;
      }
    }
  }
  return null;
}
```

---

## Phase 1.4: Frontend (1h)

### 1. Hook simplificado

```typescript
// src/hooks/whatsapp/use-whatsapp-onboarding.ts

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';

export function useWhatsAppOnboarding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  const startOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get('/v1/whatsapp/onboarding-url');
      
      // Abrir URL
      window.open(data.url, 'whatsapp_onboarding', 'width=500,height=700');

      // Fazer polling
      startPolling();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get('/v1/whatsapp/check-connection');
        if (data.connected) {
          clearInterval(interval);
          window.dispatchEvent(new CustomEvent('whatsapp-connected'));
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2000);

    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
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
    <div>
      <Button
        onClick={() => startOnboarding()}
        disabled={loading}
      >
        {loading ? 'Abrindo...' : 'Conectar com Meta'}
      </Button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

---

## Phase 1.5: Token Encryption (⚠️ OBRIGATÓRIO ANTES DO DEPLOY) (1h)

### 🔴 CRÍTICO: Não deploy para staging sem isso!

```bash
# 1️⃣ Gerar chave (uma única vez)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copiar output e salvar em .env como TOKEN_ENCRYPTION_KEY
```

```typescript
// src/lib/encryption.ts

import crypto from 'crypto';

const algorithm = 'aes-256-gcm';

export class TokenEncryption {
  private key: Buffer;

  constructor() {
    const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be 64-char hex string (256 bits)');
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

```typescript
// Ao salvar token (no handler account-update)
import { encryption } from '@/lib/encryption';

const encryptedToken = encryption.encrypt(token);
await db.whatsAppConfig.update({
  where: { id: configId },
  data: { accessToken: encryptedToken },
});

// Ao ler token
export async function getAccessToken(configId: string): Promise<string> {
  const config = await db.whatsAppConfig.findUnique({
    where: { id: configId },
  });

  if (!config?.accessToken) throw new Error('No token');
  return encryption.decrypt(config.accessToken);
}
```

---

## Phase 1.6: Deploy Staging (1h)

```bash
# 1. Verificar:
# - TOKEN_ENCRYPTION_KEY está em .env
# - Todas as migrations prontas
# - Redis conectado

# 2. Deploy
npx prisma migrate deploy
git push origin phase-1
vercel deploy --prod

# 3. Testar
# - Abrir http://staging.seu-saas.com/settings/whatsapp
# - Clicar "Conectar com Meta"
# - Completar onboarding
# - Verificar webhook logs
# - Validar token foi salvo encriptado no BD
```

---

## ✅ Phase 1 Checklist

- [ ] Migrations rodadas
- [ ] TOKEN_ENCRYPTION_KEY gerada e configurada
- [ ] GET `/onboarding-url` funcionando
- [ ] Webhook `/webhook` recebendo
- [ ] PARTNER_ADDED criando connection
- [ ] Frontend abrindo URL e fazendo polling
- [ ] Mensagens sendo recebidas
- [ ] Token salvo encriptado no BD
- [ ] Tudo em staging

---

---

# PHASE 2: PRODUCTION (5 DIAS) - SEGURANÇA & CONFIABILIDADE

## Objetivo
Produção-ready com:
- ✅ Redis com fallback automático ao BD
- ✅ Token health checks (diários)
- ✅ Dead Letter Queue com retry automático
- ✅ Rate limiting (IP + org)
- ✅ Coexistence mode testado com Meta
- ✅ E2E tests completos

---

## Phase 2.1: Redis Hybrid Cache & Cleanup Job (2h)

### ⚠️ Problema crítico
```
Redis é o cache, mas se cair:
- Webhook fica 10x mais lento (queryar BD)
- Conexões simultâneas → race conditions
```

### ✅ Solução: Hybrid Redis + BD

```typescript
// src/services/whatsapp/onboarding-cache.service.ts

export class OnboardingCacheService {
  /**
   * Busca: Redis primeiro, BD como fallback
   */
  async get(trackingCode: string) {
    // 1️⃣ Tentar Redis (rápido: ~1-5ms)
    try {
      const cached = await redis.get(`whatsapp:onboarding:${trackingCode}`);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.warn('Redis get failed, falling back to DB', { trackingCode });
    }

    // 2️⃣ Fallback: BD (~50-100ms)
    const onboarding = await db.whatsAppOnboarding.findUnique({
      where: { trackingCode },
      select: { organizationId: true, initiatedAt: true, expiresAt: true },
    });

    if (!onboarding) return null;

    // Validar TTL (24h)
    if (onboarding.expiresAt < new Date()) {
      return null;
    }

    return {
      organizationId: onboarding.organizationId,
      initiatedAt: onboarding.initiatedAt.toISOString(),
    };
  }

  /**
   * Cleanup automático (não depende de Redis)
   */
  async cleanupExpired() {
    // Marcar como expirado no BD
    const expired = await db.whatsAppOnboarding.updateMany({
      where: {
        status: 'pending',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'expired',
      },
    });

    // Tentar limpar Redis (best effort)
    try {
      await redis.eval(
        `
        local keys = redis.call('KEYS', 'whatsapp:onboarding:*')
        if #keys > 0 then
          redis.call('DEL', unpack(keys))
        end
        return #keys
        `,
        0
      );
    } catch (error) {
      console.warn('Redis cleanup failed (non-blocking)', { error });
    }

    return expired.count;
  }
}
```

### Job de cleanup diário

```typescript
// src/jobs/whatsapp-cleanup.job.ts

import { CronJob } from 'cron';
import { OnboardingCacheService } from '@/services/whatsapp/onboarding-cache.service';

const cacheService = new OnboardingCacheService();

export const whatsappCleanupJob = new CronJob(
  '0 0 * * *', // Meia-noite
  async () => {
    try {
      const cleaned = await cacheService.cleanupExpired();
      console.log(`[WhatsApp Cleanup] Removeu ${cleaned} onboardings expirados`);
    } catch (error) {
      console.error('[WhatsApp Cleanup] Erro:', error);
      Sentry.captureException(error, { tags: { job: 'whatsapp-cleanup' } });
    }
  },
  null,
  true,
  'America/Sao_Paulo'
);

// Iniciar em src/main.ts
whatsappCleanupJob.start();
```

### Health check do Redis

```typescript
// src/lib/redis-health.ts

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed', { error });
    return false;
  }
}

// Verificar a cada minuto
setInterval(async () => {
  const isHealthy = await checkRedisHealth();
  if (!isHealthy) {
    Sentry.captureMessage('⚠️ Redis is down - falling back to DB', 'error');
  }
}, 60000);
```

---

## Phase 2.2: Token Health Check Job (2h)

### 1. Service de health check

```typescript
// src/services/whatsapp/token-health.service.ts

import axios from 'axios';
import { db } from '@/lib/db';
import { encryption } from '@/lib/encryption';

export class TokenHealthService {
  async checkToken(token: string): Promise<{ valid: boolean; expiresIn?: number }> {
    try {
      const response = await axios.get(`https://graph.instagram.com/debug_token`, {
        params: {
          input_token: token,
          access_token: process.env.META_APP_ACCESS_TOKEN,
        },
      });

      const { data } = response.data;
      return {
        valid: data.is_valid,
        expiresIn: data.expires_at ? data.expires_at - Math.floor(Date.now() / 1000) : undefined,
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async checkOrgTokens(organizationId: string) {
    const configs = await db.whatsAppConfig.findMany({
      where: { organizationId, tokenStatus: 'connected' },
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

        // Alert se expirar em breve
        if (status === 'expiring_soon') {
          console.warn(`Token expiring soon for config ${config.id}`);
          // TODO: Enviar notificação ao usuário
        }
      } catch (error) {
        console.error('Failed to check token', error);
      }
    }
  }
}
```

### 2. Job diário

```typescript
// src/jobs/token-health-check.job.ts

import { CronJob } from 'cron';
import { TokenHealthService } from '@/services/whatsapp/token-health.service';
import { db } from '@/lib/db';

const healthService = new TokenHealthService();

export const tokenHealthCheckJob = new CronJob(
  '0 2 * * *',
  async () => {
    try {
      const orgs = await db.organization.findMany({ select: { id: true } });
      for (const org of orgs) {
        await healthService.checkOrgTokens(org.id);
      }
    } catch (error) {
      console.error('Token health check failed', error);
    }
  },
  null,
  true
);
```

---

## Phase 2.3: Dead Letter Queue + Webhook Retry (2h)

### ⚠️ Problema crítico
```
Webhook falha → se não reprocessado, evento é perdido forever
Resultado: Conexão ou mensagens perdidas
```

### ✅ Solução: DLQ com retry automático

No webhook route, SEMPRE marcar `processed = false` até conseguir processar:

```typescript
// src/app/api/v1/whatsapp/webhook/route.ts

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-hub-signature-256');

    // 1️⃣ Log ANTES (processed = false)
    const webhookLog = await db.whatsAppWebhookLog.create({
      data: {
        payload: body,
        processed: false,
        signatureValid: validateWebhookSignature(body, signature),
      },
    });

    // 2️⃣ Se signature inválida, não processar (mas retorna 200 OK)
    if (!validateWebhookSignature(body, signature)) {
      await db.whatsAppWebhookLog.update({
        where: { id: webhookLog.id },
        data: { processingError: 'Invalid signature' },
      });
      return Response.json({ received: true });
    }

    // 3️⃣ Processar
    const processor = new WebhookProcessor();
    await processor.process(body);

    // 4️⃣ Marcar como processado APENAS se tudo ok
    await db.whatsAppWebhookLog.update({
      where: { id: webhookLog.id },
      data: { processed: true, processedAt: new Date() },
    });

  } catch (error) {
    console.error('Webhook processing failed', error);
    // Não marcar processed = true
    // Job de retry vai reprocessar
  }

  // SEMPRE retorna 200 OK para Meta
  return Response.json({ received: true });
}
```

### Job de retry (a cada 5 minutos)

```typescript
// src/jobs/webhook-retry.job.ts

import { CronJob } from 'cron';
import { WebhookProcessor } from '@/services/whatsapp/webhook-processor';
import { db } from '@/lib/db';

export const webhookRetryJob = new CronJob(
  '*/5 * * * *', // A cada 5 minutos
  async () => {
    try {
      // Buscar webhooks não processados (últimas 24h)
      const failed = await db.whatsAppWebhookLog.findMany({
        where: {
          processed: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'asc' },
        take: 50, // Processar 50 por vez
      });

      for (const log of failed) {
        try {
          const processor = new WebhookProcessor();
          await processor.process(log.payload);

          // Sucesso
          await db.whatsAppWebhookLog.update({
            where: { id: log.id },
            data: { processed: true, processedAt: new Date() },
          });

          console.log(`✅ Webhook retry successful: ${log.id}`);

        } catch (error) {
          // Falhou novamente - increment retry count
          const attempts = (log.payload as any).retryCount || 0;

          if (attempts < 3) {
            // Tentar novamente
            await db.whatsAppWebhookLog.update({
              where: { id: log.id },
              data: {
                payload: {
                  ...(log.payload || {}),
                  retryCount: attempts + 1,
                },
              },
            });
          } else {
            // Desistir após 3 tentativas
            console.error(
              `❌ Webhook failed after 3 attempts: ${log.id}`,
              error
            );
            Sentry.captureException(error, {
              tags: { webhookLogId: log.id, retries: 3 },
            });
          }
        }
      }
    } catch (error) {
      console.error('Webhook retry job failed', error);
    }
  },
  null,
  true,
  'America/Sao_Paulo'
);

webhookRetryJob.start();
```

### Dashboard de webhooks falhados

```typescript
// src/app/api/admin/whatsapp/failed-webhooks/route.ts

export async function GET(request: Request) {
  await requireAdmin(request);

  const failed = await db.whatsAppWebhookLog.findMany({
    where: { processed: false },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const stats = {
    total: failed.length,
    byError: failed.reduce((acc, log) => {
      const error = log.processingError || 'unknown';
      acc[error] = (acc[error] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return Response.json({ failed, stats });
}
```

---

## Phase 2.4: Rate Limiting (1h)

### SLOs e Limites

```
IP-based (global):
- 1000 webhooks/min por IP

Org-based (por organização):
- 100 webhooks/min por org

Burst:
- Máximo 10 webhooks simultâneos por org
```

### Implementação

```typescript
// src/lib/webhook-rate-limit.ts

import { redis } from '@/lib/redis';

export class WebhookRateLimiter {
  /**
   * Check rate limit por IP
   */
  async checkIpLimit(ip: string): Promise<boolean> {
    const key = `webhook-rate:ip:${ip}`;
    const limit = 1000;
    const windowMs = 60 * 1000; // 1 minuto

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }

    return current <= limit;
  }

  /**
   * Check rate limit por org
   */
  async checkOrgLimit(orgId: string): Promise<boolean> {
    const key = `webhook-rate:org:${orgId}`;
    const limit = 100;
    const windowMs = 60 * 1000;

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }

    return current <= limit;
  }

  /**
   * Check burst limit (simultâneos)
   */
  async checkBurstLimit(orgId: string): Promise<boolean> {
    const key = `webhook-burst:${orgId}`;
    const limit = 10;

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, 5); // 5 segundos
    }

    if (current > limit) {
      await redis.decr(key);
      return false;
    }

    // Cleanup após processar
    setTimeout(() => redis.decr(key), 1000);
    return true;
  }
}

export const rateLimiter = new WebhookRateLimiter();
```

### Aplicar no webhook route

```typescript
// src/app/api/v1/whatsapp/webhook/route.ts

import { rateLimiter } from '@/lib/webhook-rate-limit';

export async function POST(request: Request) {
  const body = await request.json();
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  // 1️⃣ Verificar IP rate limit
  const ipAllowed = await rateLimiter.checkIpLimit(ip);
  if (!ipAllowed) {
    return Response.json(
      { error: 'Too many requests (IP limit)' },
      { status: 429 }
    );
  }

  // 2️⃣ Extrair org ID do webhook
  const orgId = await extractOrgIdFromWebhook(body);

  if (orgId) {
    // 3️⃣ Verificar Org rate limit
    const orgAllowed = await rateLimiter.checkOrgLimit(orgId);
    if (!orgAllowed) {
      return Response.json(
        { error: 'Too many requests (org limit)' },
        { status: 429 }
      );
    }

    // 4️⃣ Verificar burst limit
    const burstAllowed = await rateLimiter.checkBurstLimit(orgId);
    if (!burstAllowed) {
      return Response.json(
        { error: 'Too many simultaneous webhooks' },
        { status: 429 }
      );
    }
  }

  // Processar webhook...
}
```

### Alerts quando rate limit é ativado

```typescript
// src/middleware/webhook-rate-limit-alerts.ts

export async function alertRateLimitExceeded(
  type: 'ip' | 'org',
  identifier: string
) {
  Sentry.captureMessage(
    `🔴 Rate limit exceeded (${type}): ${identifier}`,
    'error'
  );

  // Notificar ops se IP
  if (type === 'ip') {
    // Possivelmente DDoS
    console.warn(`⚠️ POSSIBLE DDoS: ${identifier}`);
  }
}
```

---

## Phase 2.5: E2E Tests (1h)

```typescript
// tests/whatsapp.e2e.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';

describe('WhatsApp Onboarding E2E', () => {
  it('deve processar fluxo completo', async () => {
    // 1. Criar onboarding
    const { data } = await fetch('/api/v1/whatsapp/onboarding-url', {
      headers: { Authorization: `Bearer ${testToken}` },
    }).then(r => r.json());

    // 2. Simular webhook
    const webhook = {
      entry: [{
        changes: [{
          field: 'account_update',
          value: {
            event: 'PARTNER_ADDED',
            sessionInfo: { trackingCode: data.trackingCode },
            waba_info: {
              waba_id: 'test-waba',
              owner_business_id: 'test-biz',
            },
          },
        }],
      }],
    };

    const response = await fetch('/api/v1/whatsapp/webhook', {
      method: 'POST',
      body: JSON.stringify(webhook),
      headers: { 'x-hub-signature-256': generateSignature(webhook) },
    });

    expect(response.status).toBe(200);

    // 3. Validar
    const connection = await db.whatsAppConnection.findFirst({
      where: { wabaId: 'test-waba' },
    });

    expect(connection?.status).toBe('active');
  });
});
```

---

## ✅ Phase 2 Checklist

- [ ] Token encryption implementado (Phase 1.5 já fez)
- [ ] Redis health check rodando
- [ ] Cleanup job (meia-noite) configurado
- [ ] Token health check job (2AM) rodando
- [ ] DLQ job (a cada 5 min) processando retries
- [ ] Rate limiting ativo (IP + Org + Burst)
- [ ] Coexistence mode testado com Meta
- [ ] E2E tests passando com mocks
- [ ] Admin dashboard de webhooks falhados funcionando
- [ ] Monitoring/Alerts configurados no Sentry
- [ ] Tudo em produção

---

---

# PHASE 3: MONITORING (3 DIAS) - OBSERVABILIDADE

## Objetivo
Alertas, dashboards, debugging fácil.

---

## Phase 3.1: Alertas (1h)

```typescript
// src/lib/alerts.ts

import { Sentry } from '@sentry/nextjs';

export function alertOrphantWaba(wabaId: string) {
  Sentry.captureMessage(`Orphant WABA: ${wabaId}`, 'warning');
  // Enviar ao Slack se tiver webhook
}

export function alertTokenExpiringSoon(configId: string, expiresIn: number) {
  Sentry.captureMessage(
    `Token expiring in ${Math.round(expiresIn / 3600 / 24)} days for ${configId}`,
    'warning'
  );
}

export function alertWebhookFailed(logId: string, error: string) {
  Sentry.captureException(new Error(error), {
    tags: { type: 'webhook_failure', webhookLogId: logId },
  });
}
```

---

## Phase 3.2: Dashboard Queries (1h)

```typescript
// src/services/whatsapp/dashboard.service.ts

import { db } from '@/lib/db';

export class DashboardService {
  async getStatus(organizationId: string) {
    const [onboardings, connections, messages, webhooks] = await Promise.all([
      db.whatsAppOnboarding.count({
        where: { organizationId, status: 'completed' },
      }),
      db.whatsAppConnection.count({
        where: { organizationId, status: 'active' },
      }),
      db.message.count({
        where: { organizationId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      db.whatsAppWebhookLog.count({
        where: { organizationId, processed: true, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return { onboardings, connections, messages, webhooks };
  }

  async getTimeline(organizationId: string) {
    return await db.whatsAppOnboarding.findMany({
      where: { organizationId },
      select: { createdAt: true, status: true, wabaId: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async getFailedWebhooks(organizationId: string) {
    return await db.whatsAppWebhookLog.findMany({
      where: { organizationId, processed: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
```

---

## Phase 3.3: Admin Endpoints (1h)

```typescript
// src/app/api/admin/whatsapp/status/route.ts

import { DashboardService } from '@/services/whatsapp/dashboard.service';
import { requireAdmin } from '@/middleware/require-admin';

const dashService = new DashboardService();

export async function GET(request: Request) {
  await requireAdmin(request);

  const { org } = Object.fromEntries(new URL(request.url).searchParams);

  const status = await dashService.getStatus(org);
  const timeline = await dashService.getTimeline(org);
  const failed = await dashService.getFailedWebhooks(org);

  return Response.json({ status, timeline, failed });
}
```

---

## ✅ Phase 3 Checklist

- [ ] Sentry configurado
- [ ] Alertas funcionando
- [ ] Dashboard queries implementadas
- [ ] Admin endpoints criados

---

---

# 📋 RESUMO FINAL

## Timeline Total
- **Phase 1 (MVP):** 7 dias → staging funcional
  - Phase 1.5 (1h): Token encryption ⚠️ OBRIGATÓRIO
  - Phase 1.6 (1h): Deploy staging
- **Phase 2 (Produção):** 5 dias → segurança + confiabilidade
  - 2.1: Redis hybrid + cleanup job (2h)
  - 2.2: Token health check (2h)
  - 2.3: DLQ + webhook retry (2h)
  - 2.4: Rate limiting (1h)
  - 2.5: E2E tests (1h)
- **Phase 3 (Monitoring):** 3 dias → observabilidade
- **Total:** ~16 dias (ajustado)

## Dependências

```json
{
  "dependencies": {
    "@prisma/client": "latest",
    "redis": "^4.6.0",
    "next": "^14.0.0",
    "axios": "latest",
    "cron": "latest",
    "@sentry/nextjs": "latest",
    "express-rate-limit": "latest",
    "rate-limit-redis": "latest"
  }
}
```

## Variáveis de Ambiente

```env
# Meta
NEXT_PUBLIC_META_APP_ID=seu-app-id
NEXT_PUBLIC_META_CONFIG_ID=seu-config-id
META_APP_SECRET=seu-secret
META_APP_ACCESS_TOKEN=seu-token-para-health-check
META_WEBHOOK_VERIFY_TOKEN=seu-verify-token

# Encryption
TOKEN_ENCRYPTION_KEY=seu-64-char-hex

# Redis
REDIS_URL=redis://localhost:6379

# Sentry
SENTRY_DSN=seu-dsn
```

## Deploy Checklist

- [ ] Todas as migrações rodadas
- [ ] Variáveis de env configuradas
- [ ] Redis online
- [ ] Meta app configurado com webhook URL
- [ ] Sentry configurado
- [ ] Jobs (cron) iniciados

## Contacts

**Teste com Meta:** https://developers.facebook.com/support/

Perguntar:
- "Coexistence mode embedded signup retorna sessionInfo em account_update?"
- "Qual é o tempo de expiração de access tokens?"

---

**Você está pronto para implementar! 🚀**
