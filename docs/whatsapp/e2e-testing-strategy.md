# 🧪 E2E Testing Strategy: WhatsApp Onboarding v2

**Objetivo:** Testar o fluxo completo end-to-end sem depender de Meta test WABA

---

## 1. Mocks & Fixtures

### Mock Webhooks

```typescript
// src/lib/__mocks__/whatsapp-webhooks.ts

import crypto from 'crypto';

/**
 * Mock: Cliente completou onboarding com sucesso
 */
export const mockPartnerAddedWebhook = (trackingCode: string) => ({
  entry: [
    {
      id: '364015407714967',
      time: Math.floor(Date.now() / 1000),
      changes: [
        {
          field: 'account_update',
          value: {
            event: 'PARTNER_ADDED',
            waba_info: {
              waba_id: '26205485689057417',
              owner_business_id: '793757329383127',
            },
            sessionInfo: {
              trackingCode,
            },
          },
        },
      ],
    },
  ],
  object: 'whatsapp_business_account',
});

/**
 * Mock: Cliente desconectou
 */
export const mockPartnerRemovedWebhook = () => ({
  entry: [
    {
      id: '364015407714967',
      time: Math.floor(Date.now() / 1000),
      changes: [
        {
          field: 'account_update',
          value: {
            event: 'PARTNER_REMOVED',
            waba_info: {
              waba_id: '26205485689057417',
              owner_business_id: '793757329383127',
            },
          },
        },
      ],
    },
  ],
  object: 'whatsapp_business_account',
});

/**
 * Mock: Mensagem recebida
 */
export const mockMessageWebhook = (options: {
  phoneNumberId?: string;
  fromPhone: string;
  messageId?: string;
  text: string;
}) => ({
  entry: [
    {
      id: '364015407714967',
      time: Math.floor(Date.now() / 1000),
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '5511999999999',
              phone_number_id: options.phoneNumberId || '123456789',
            },
            messages: [
              {
                from: options.fromPhone,
                id: options.messageId || `wamid.${Date.now()}`,
                timestamp: Math.floor(Date.now() / 1000),
                type: 'text',
                text: { body: options.text },
              },
            ],
          },
        },
      ],
    },
  ],
  object: 'whatsapp_business_account',
});

/**
 * Gerar assinatura válida para mock webhook
 */
export function generateWebhookSignature(
  body: any,
  secret: string = process.env.META_APP_SECRET || 'test-secret'
): string {
  const payload = JSON.stringify(body);
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return `sha256=${hash}`;
}

/**
 * Gerar assinatura INVÁLIDA (para testar rejeição)
 */
export function generateInvalidWebhookSignature(): string {
  return 'sha256=invalid_hash_12345';
}
```

---

## 2. Test Helpers

### Setup & Teardown

```typescript
// src/__tests__/helpers/whatsapp-test-helpers.ts

import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

/**
 * Criar org de teste
 */
export async function createTestOrganization() {
  return await db.organization.create({
    data: {
      name: `Test Org ${Date.now()}`,
      slug: `test-org-${Date.now()}`,
    },
  });
}

/**
 * Criar onboarding de teste
 */
export async function createTestOnboarding(organizationId: string) {
  const trackingCode = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const onboarding = await db.whatsAppOnboarding.create({
    data: {
      organizationId,
      trackingCode,
      status: 'pending',
      expiresAt,
    },
  });

  // Salvar em Redis também
  await redis.setex(
    `whatsapp:onboarding:${trackingCode}`,
    86400,
    JSON.stringify({ organizationId, initiatedAt: new Date().toISOString() })
  );

  return { onboarding, trackingCode };
}

/**
 * Cleanup após testes
 */
export async function cleanupTestData(organizationId: string) {
  await db.organization.delete({
    where: { id: organizationId },
  });

  // Redis será limpo por TTL
}

/**
 * Criar mock request com headers
 */
export function createMockRequest(
  body: any,
  headers: Record<string, string> = {}
) {
  const bodyString = JSON.stringify(body);

  return new Request('http://localhost/api/v1/whatsapp/webhook', {
    method: 'POST',
    body: bodyString,
    headers: {
      'content-type': 'application/json',
      'x-hub-signature-256': generateWebhookSignature(body),
      ...headers,
    },
  });
}
```

---

## 3. Test Cases

### Phase 1: Onboarding Flow

```typescript
// tests/whatsapp-onboarding.e2e.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestOrganization,
  createTestOnboarding,
  cleanupTestData,
  createMockRequest,
} from './helpers/whatsapp-test-helpers';
import {
  mockPartnerAddedWebhook,
  generateWebhookSignature,
} from '@/lib/__mocks__/whatsapp-webhooks';
import { POST as webhookPOST } from '@/app/api/v1/whatsapp/webhook/route';

describe('WhatsApp Onboarding E2E', () => {
  let org: any;
  let trackingCode: string;

  beforeEach(async () => {
    org = await createTestOrganization();
    const { trackingCode: tc } = await createTestOnboarding(org.id);
    trackingCode = tc;
  });

  afterEach(async () => {
    await cleanupTestData(org.id);
  });

  it('deve processar fluxo completo de onboarding', async () => {
    // 1️⃣ Verificar onboarding foi criado
    const onboarding = await db.whatsAppOnboarding.findUnique({
      where: { trackingCode },
    });

    expect(onboarding).toBeDefined();
    expect(onboarding?.status).toBe('pending');
    expect(onboarding?.organizationId).toBe(org.id);

    // 2️⃣ Simular webhook Meta
    const webhookBody = mockPartnerAddedWebhook(trackingCode);
    const request = createMockRequest(webhookBody);

    const response = await webhookPOST(request);
    expect(response.status).toBe(200);

    // 3️⃣ Verificar connection foi criada
    const connection = await db.whatsAppConnection.findFirst({
      where: { wabaId: '26205485689057417' },
    });

    expect(connection).toBeDefined();
    expect(connection?.organizationId).toBe(org.id);
    expect(connection?.status).toBe('active');

    // 4️⃣ Verificar onboarding foi marcado completo
    const updatedOnboarding = await db.whatsAppOnboarding.findUnique({
      where: { trackingCode },
    });

    expect(updatedOnboarding?.status).toBe('completed');
    expect(updatedOnboarding?.completedAt).toBeDefined();
    expect(updatedOnboarding?.wabaId).toBe('26205485689057417');
  });

  it('deve rejeitar webhook com assinatura inválida', async () => {
    const webhookBody = mockPartnerAddedWebhook(trackingCode);
    const request = createMockRequest(webhookBody, {
      'x-hub-signature-256': 'sha256=invalid_hash_12345',
    });

    const response = await webhookPOST(request);
    expect(response.status).toBe(200); // Meta quer 200 sempre

    // Mas webhook não deve ser processado
    const connection = await db.whatsAppConnection.findFirst({
      where: { wabaId: '26205485689057417' },
    });
    expect(connection).toBeUndefined();
  });

  it('deve lidar com tracking code expirado', async () => {
    // Expirar tracking code no BD
    await db.whatsAppOnboarding.update({
      where: { trackingCode },
      data: { expiresAt: new Date(Date.now() - 1000) }, // 1 segundo atrás
    });

    const webhookBody = mockPartnerAddedWebhook(trackingCode);
    const request = createMockRequest(webhookBody);

    const response = await webhookPOST(request);
    expect(response.status).toBe(200);

    // Não deve criar connection
    const connection = await db.whatsAppConnection.findFirst({
      where: { wabaId: '26205485689057417' },
    });
    expect(connection).toBeUndefined();
  });

  it('deve processar webhook sem trackingCode (coexistence mode)', async () => {
    // Criar connection existente com mesmo owner_business_id
    const existingConn = await db.whatsAppConnection.create({
      data: {
        organizationId: org.id,
        wabaId: '26205485689057417',
        ownerBusinessId: '793757329383127',
        status: 'active',
      },
    });

    // Webhook sem trackingCode
    const webhookBody = {
      entry: [
        {
          id: '364015407714967',
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: 'account_update',
              value: {
                event: 'PARTNER_ADDED',
                waba_info: {
                  waba_id: '26205485689057417',
                  owner_business_id: '793757329383127',
                },
                // Sem sessionInfo.trackingCode
              },
            },
          ],
        },
      ],
    };

    const request = createMockRequest(webhookBody);
    const response = await webhookPOST(request);

    expect(response.status).toBe(200);
    // Deve reconhecer via owner_business_id
  });
});
```

### Phase 2: Message Handling

```typescript
// tests/whatsapp-messages.e2e.test.ts

describe('WhatsApp Messages E2E', () => {
  let org: any;
  let connection: any;
  let config: any;

  beforeEach(async () => {
    org = await createTestOrganization();

    // Criar connection com config
    connection = await db.whatsAppConnection.create({
      data: {
        organizationId: org.id,
        wabaId: 'test-waba-123',
        ownerBusinessId: 'test-biz-123',
        status: 'active',
      },
    });

    config = await db.whatsAppConfig.create({
      data: {
        organizationId: org.id,
        connectionId: connection.id,
        phoneId: '123456789',
        status: 'connected',
      },
    });
  });

  it('deve salvar mensagem recebida', async () => {
    const webhookBody = mockMessageWebhook({
      phoneNumberId: '123456789',
      fromPhone: '5511987654321',
      text: 'Olá!',
    });

    const request = createMockRequest(webhookBody);
    const response = await webhookPOST(request);

    expect(response.status).toBe(200);

    // Verificar mensagem foi salva
    const message = await db.message.findFirst({
      where: {
        organizationId: org.id,
        configId: config.id,
      },
    });

    expect(message).toBeDefined();
    expect(message?.direction).toBe('INBOUND');
    expect(message?.body).toBe('Olá!');
    expect(message?.type).toBe('text');
  });

  it('deve atualizar lastWebhookAt no config', async () => {
    const before = config.lastWebhookAt;

    const webhookBody = mockMessageWebhook({
      phoneNumberId: '123456789',
      fromPhone: '5511987654321',
      text: 'Teste',
    });

    const request = createMockRequest(webhookBody);
    await webhookPOST(request);

    const updated = await db.whatsAppConfig.findUnique({
      where: { id: config.id },
    });

    expect(updated?.lastWebhookAt).not.toBe(before);
    expect(updated?.lastWebhookAt).toBeDefined();
  });
});
```

### Phase 3: Coexistence Mode

```typescript
// tests/whatsapp-coexistence.e2e.test.ts

describe('WhatsApp Coexistence Mode E2E', () => {
  it('deve suportar webhook sem trackingCode', async () => {
    // TODO: Testar se Meta realmente envia sessionInfo
  });

  it('deve rejeitar WABA órfã', async () => {
    // TODO: Testar admin claiming
  });
});
```

---

## 4. Webhook Testing Endpoint (Staging Only)

```typescript
// src/app/api/v1/whatsapp/webhook/test/route.ts
// ⚠️ Remover em produção

import { POST as webhookPOST } from '../route';
import {
  mockPartnerAddedWebhook,
  mockMessageWebhook,
  generateWebhookSignature,
} from '@/lib/__mocks__/whatsapp-webhooks';

/**
 * Endpoint para testar webhook manualmente
 * POST /api/v1/whatsapp/webhook/test
 *
 * Body: {
 *   "type": "partner-added",
 *   "trackingCode": "..."
 * }
 */
export async function POST(request: Request) {
  // ⚠️ Remover em produção
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Not available' }, { status: 403 });
  }

  const { type, trackingCode, ...options } = await request.json();

  let webhookBody: any;

  if (type === 'partner-added') {
    if (!trackingCode) {
      return Response.json(
        { error: 'trackingCode required for partner-added' },
        { status: 400 }
      );
    }
    webhookBody = mockPartnerAddedWebhook(trackingCode);
  } else if (type === 'message') {
    webhookBody = mockMessageWebhook(options);
  } else {
    return Response.json({ error: 'Unknown type' }, { status: 400 });
  }

  // Criar request com assinatura válida
  const signature = generateWebhookSignature(webhookBody);
  const testRequest = new Request(
    'http://localhost/api/v1/whatsapp/webhook',
    {
      method: 'POST',
      body: JSON.stringify(webhookBody),
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
      },
    }
  );

  const response = await webhookPOST(testRequest);
  return response;
}
```

---

## 5. Running Tests

```bash
# Testes unitários
npm test -- src/services/whatsapp

# Testes E2E (local)
npm test -- tests/whatsapp-onboarding.e2e.test.ts

# Testes E2E (staging)
NODE_ENV=staging npm test

# Testes de coverage
npm test -- --coverage
```

---

## 6. CI/CD Integration

```yaml
# .github/workflows/whatsapp-tests.yml

name: WhatsApp Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm test -- tests/whatsapp-onboarding.e2e.test.ts
```

---

## Resumo

| Tipo | Cobertura | Comando |
|------|-----------|---------|
| Unit Tests | Services | `npm test -- src/services/whatsapp` |
| E2E Tests | Full flow | `npm test -- tests/whatsapp-*.e2e.test.ts` |
| Manual Tests (staging) | Via endpoint | `curl -X POST http://localhost:3000/api/v1/whatsapp/webhook/test` |

Tudo pronto para testar sem Meta! 🚀
