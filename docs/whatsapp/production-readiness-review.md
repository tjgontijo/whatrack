# 🚨 Production Readiness Review: WhatsApp Onboarding v2

Você identificou **pontos críticos reais**. Vou estruturar mitigações para cada um.

---

## 1️⃣ REDIS É CRÍTICO (RISCO ALTO)

### 🔴 Problema
```
Tracking code em Redis com fallback fraco:
- Redis falha → webhook fica 10x mais lento (queryar BD)
- Múltiplos webhooks simultâneos → race condition
- Job diário de cleanup não garante TTL
```

### ✅ Solução Proposta

#### A) Hybrid Redis+BD (mais seguro)

```typescript
// src/services/whatsapp/onboarding-cache.service.ts

interface OnboardingCache {
  organizationId: string;
  initiatedAt: Date;
}

export class OnboardingCacheService {
  /**
   * Salva em AMBOS: Redis (speed) + BD (durability)
   */
  async save(trackingCode: string, data: OnboardingCache, ttlSeconds = 86400) {
    // 1️⃣ Redis (rápido)
    try {
      await redis.setex(
        `whatsapp:onboarding:${trackingCode}`,
        ttlSeconds,
        JSON.stringify(data)
      );
    } catch (error) {
      logger.warn('Redis save failed, relying on DB only', { trackingCode });
      // Continua mesmo se Redis falhar
    }

    // 2️⃣ BD (durável)
    // Já salvo em WhatsAppOnboarding
  }

  /**
   * Busca: Redis primeiro, BD como fallback
   */
  async get(trackingCode: string): Promise<OnboardingCache | null> {
    // 1️⃣ Tentar Redis (rápido)
    try {
      const cached = await redis.get(`whatsapp:onboarding:${trackingCode}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Redis get failed', { trackingCode });
    }

    // 2️⃣ Fallback: BD (mais lento, ~50-100ms)
    const onboarding = await db.whatsAppOnboarding.findUnique({
      where: { trackingCode },
      select: { organizationId: true, initiatedAt: true },
    });

    if (onboarding) {
      // Validar TTL
      const age = Date.now() - onboarding.initiatedAt.getTime();
      const ttl24h = 24 * 60 * 60 * 1000;

      if (age > ttl24h) {
        return null; // Expirado
      }

      return {
        organizationId: onboarding.organizationId,
        initiatedAt: onboarding.initiatedAt,
      };
    }

    return null;
  }

  /**
   * Cleanup automático (não depende de Redis)
   */
  async cleanupExpired() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

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
      logger.warn('Redis cleanup failed', { error });
    }

    return expired.count;
  }
}
```

#### B) Job de cleanup diário (Cron)

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
      console.log(`[WhatsApp Cleanup] Limpou ${cleaned} onboardings expirados`);
    } catch (error) {
      console.error('[WhatsApp Cleanup] Erro:', error);
      // Alert para Sentry
      Sentry.captureException(error, {
        tags: { job: 'whatsapp-cleanup' },
      });
    }
  },
  null,
  true,
  'America/Sao_Paulo'
);

// Em src/main.ts ou startup
whatsappCleanupJob.start();
```

#### C) Monitoramento de saúde do Redis

```typescript
// src/lib/redis-health.ts

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return false;
  }
}

// Verificar periodicamente
setInterval(async () => {
  const isHealthy = await checkRedisHealth();
  if (!isHealthy) {
    Sentry.captureMessage('Redis is down!', 'error');
    // Enviar alert ao ops
  }
}, 60000); // A cada minuto
```

### 📊 Impacto de fallback
```
Cenário 1: Redis ok
- Webhook processado em ~50ms
- Busca em Redis: ~1-5ms

Cenário 2: Redis down
- Webhook processado em ~100-150ms (mais lento)
- Busca em BD com fallback: ~50-100ms
- Usuário não nota (é async)
- Sistema continua funcionando ✅
```

---

## 2️⃣ COEXISTENCE MODE (RISCO MÉDIO-ALTO)

### 🔴 Problema
```
1. Documentação Meta não confirma se sessionInfo é retornado
2. Cliente pode conectar direto sem passar por seu flow
3. Webhook PARTNER_ADDED pode chegar sem trackingCode
```

### ✅ Solução Proposta

#### A) Teste com Meta (antes de produção)

```bash
# Contatar suporte Meta: https://developers.facebook.com/support/
# Pergunta: "Coexistence mode embedded signup returns sessionInfo in account_update webhook?"
# Esperado: Sim, sessionInfo vem em account_update com evento PARTNER_ADDED
```

#### B) Tratamento de ambos os casos

```typescript
// src/services/whatsapp/webhook/account-update.service.ts

async handlePartnerAdded(value: any) {
  const trackingCode = value.sessionInfo?.trackingCode;
  const { waba_id, owner_business_id } = value.waba_info;

  let organizationId: string | null = null;

  // CASO 1: Cliente passou por seu fluxo (tem trackingCode)
  if (trackingCode) {
    const onboarding = await db.whatsAppOnboarding.findUnique({
      where: { trackingCode },
      select: { organizationId: true },
    });
    organizationId = onboarding?.organizationId ?? null;
  }

  // CASO 2: Cliente conectou direto na Meta (sem trackingCode)
  // ⚠️ Você PRECISA identificar quem é
  if (!organizationId) {
    // Estratégia: Procurar por owner_business_id
    const existingConn = await db.whatsAppConnection.findFirst({
      where: { ownerBusinessId: owner_business_id },
      select: { organizationId: true },
    });

    if (existingConn) {
      organizationId = existingConn.organizationId;
      logger.warn(
        `PARTNER_ADDED sem trackingCode, encontrado via owner_business_id: ${organizationId}`
      );
    }
  }

  // CASO 3: Não conseguiu identificar
  if (!organizationId) {
    logger.error(
      `Não conseguiu identificar org para PARTNER_ADDED`,
      { trackingCode, waba_id, owner_business_id }
    );

    // Criar "phantom connection" para análise
    await db.whatsAppConnection.create({
      data: {
        organizationId: null, // ⚠️ Nullable temporariamente
        wabaId: waba_id,
        ownerBusinessId: owner_business_id,
        status: 'error',
      },
    });

    // Alert para ops
    Sentry.captureMessage(
      `Orphan WABA connection detected: ${waba_id}`,
      'warning'
    );
    return;
  }

  // Resto do flow normal
  await createConnection(organizationId, waba_id, owner_business_id);
}
```

#### C) UI para reclamar WABA órfã

```typescript
// Admin dashboard
// "Conectar WABA órfã"
// Lista WABAs que não têm org
// Admin seleciona org + confirma

export async function claimOrphanWaba(
  adminId: string,
  wabaId: string,
  organizationId: string
) {
  const connection = await db.whatsAppConnection.update({
    where: { wabaId },
    data: {
      organizationId,
      status: 'active',
    },
  });

  await db.auditLog.create({
    data: {
      organizationId,
      action: 'WABA_CLAIMED',
      metadata: { wabaId, claimedBy: adminId },
    },
  });

  return connection;
}
```

---

## 3️⃣ MÚLTIPLOS TELEFONES POR WABA (RISCO MÉDIO)

### 🔴 Problema
```
Schema suporta N telefones por WABA
Mas fluxo não menciona seleção de telefone
UI não está documentada
```

### ✅ Solução Proposta

#### A) MVP: Um telefone por WABA (mais simples)

```typescript
// src/services/whatsapp/webhook/account-update.service.ts

async handlePartnerAdded(value: any) {
  // Assumir que Meta retorna o primeiro telefone
  const phoneNumberId = value.phone_number_id; // Esperado vir do webhook?

  // ⚠️ Precisa validar com Meta se isso vem
  // Se não vier, precisa fazer GET /waba_id/phone_numbers

  if (!phoneNumberId) {
    // Plan B: Listar e pegar o primeiro
    const phones = await metaCloudService.listPhoneNumbers({
      wabaId: value.waba_info.waba_id,
      accessToken: exchangedToken,
    });

    phoneNumberId = phones[0]?.id;
  }

  // Criar config com esse telefone
  await db.whatsAppConfig.create({
    data: {
      organizationId,
      connectionId,
      phoneId: phoneNumberId,
      status: 'connected',
    },
  });
}
```

#### B) Múltiplos telefones (próxima versão)

```typescript
// v2.1: UI para seleção

// 1. Webhook vem, cria connection com status "awaiting_phone_selection"
// 2. Frontend exibe modal: "Escolha qual telefone usar"
// 3. User clica em um telefone
// 4. POST /api/v1/whatsapp/select-phone { wabaId, phoneId }
// 5. Cria WhatsAppConfig, update connection status

export async function selectPhoneNumber(
  organizationId: string,
  wabaId: string,
  phoneNumberId: string
) {
  const connection = await db.whatsAppConnection.findFirst({
    where: { organizationId, wabaId },
  });

  if (!connection) throw new Error('Connection not found');

  // Criar config
  const config = await db.whatsAppConfig.create({
    data: {
      organizationId,
      connectionId: connection.id,
      phoneId: phoneNumberId,
      status: 'connected',
    },
  });

  // Update connection
  await db.whatsAppConnection.update({
    where: { id: connection.id },
    data: { status: 'active' },
  });

  return config;
}
```

---

## 4️⃣ FEATURE FLAG (RISCO BAIXO)

### 🔴 Problema
```
Feature flag binary (on/off) é arriscado
Manter v1 + v2 em paralelo por 1 semana custa performance
```

### ✅ Solução Proposta: Rollout Gradual

```typescript
// src/lib/feature-flags.ts

import { UnleashClient } from 'unleash-client';

const unleash = new UnleashClient({
  url: process.env.UNLEASH_URL,
  clientKey: process.env.UNLEASH_CLIENT_KEY,
});

export function isWhatsAppV2Enabled(organizationId: string): boolean {
  // Rollout em % de orgs
  // Dia 1: 10% de orgs
  // Dia 3: 25% de orgs
  // Dia 5: 50% de orgs
  // Dia 7: 100% de orgs

  return unleash.isEnabled('whatsapp-v2-onboarding', {
    userId: organizationId,
    // Unleash usa consistent hashing, então mesma org sempre pega mesmo resultado
  });
}
```

```typescript
// No route handler
export async function GET(request: Request) {
  const organizationId = getOrgId(request);
  const useV2 = isWhatsAppV2Enabled(organizationId);

  if (useV2) {
    return handleV2(request);
  } else {
    return handleV1(request);
  }
}
```

**Dashboard Unleash:**
```
Feature: whatsapp-v2-onboarding
├── Estratégia: flexibleRollout
│   ├── Dia 1: stickiness=userId, percentage=10
│   ├── Dia 3: percentage=25
│   ├── Dia 5: percentage=50
│   └── Dia 7: percentage=100
```

**Monitoramento:**
```
Métrica: whatsapp.v2.errors
├── Se > 5% de erro: reverter para v1
├── Se latência > 2x: reverter
└── Se sucesso > 95%: aumentar %
```

---

## 5️⃣ TOKEN ENCRYPTION (RISCO ALTO)

### 🔴 Problema
```
Token Meta em plaintext no BD é vulnerável
Precisa fazer antes de produção
```

### ✅ Solução Proposta: AES-256-GCM

```typescript
// src/lib/encryption.ts

import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const keyLength = 32; // 256 bits

class TokenEncryption {
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

    // Formato: iv:authTag:encrypted
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
// Gerar chave (UMA VEZ)
const key = crypto.randomBytes(32);
console.log(key.toString('hex')); // Salvar em .env como TOKEN_ENCRYPTION_KEY
```

```typescript
// Usar ao salvar
export async function saveAccessToken(
  configId: string,
  token: string
) {
  const encrypted = encryption.encrypt(token);

  await db.whatsAppConfig.update({
    where: { id: configId },
    data: {
      accessToken: encrypted,
      accessTokenEncrypted: true, // Flag para saber se precisa descriptografar
    },
  });
}

// Usar ao ler
export async function getAccessToken(configId: string): Promise<string> {
  const config = await db.whatsAppConfig.findUnique({
    where: { id: configId },
    select: { accessToken: true, accessTokenEncrypted: true },
  });

  if (!config?.accessToken) {
    throw new Error('No token found');
  }

  if (config.accessTokenEncrypted) {
    return encryption.decrypt(config.accessToken);
  }

  return config.accessToken; // Fallback para tokens antigos
}
```

---

## 6️⃣ REFRESH DE TOKENS (RISCO ALTO)

### 🔴 Problema
```
Tokens Meta expiram em 60 dias
Sem refresh automático, conexão morre depois de 2 meses
Zero lógica de refresh mencionada
```

### ✅ Solução Proposta

#### A) Verificação de saúde periódica

```typescript
// src/services/whatsapp/token-health.service.ts

import axios from 'axios';

export class TokenHealthService {
  /**
   * Verificar se token é válido usando debug_token
   */
  async checkTokenHealth(token: string): Promise<{
    valid: boolean;
    expiresIn?: number; // segundos
  }> {
    try {
      const response = await axios.get(
        `https://graph.instagram.com/debug_token`,
        {
          params: {
            input_token: token,
            access_token: process.env.META_APP_ACCESS_TOKEN, // App token para checar outros tokens
          },
        }
      );

      const { data } = response.data;

      return {
        valid: data.is_valid,
        expiresIn: data.expires_at
          ? data.expires_at - Math.floor(Date.now() / 1000)
          : undefined,
      };
    } catch (error) {
      logger.error('Failed to check token health', { error });
      return { valid: false };
    }
  }

  /**
   * Verificar todos os tokens de uma org
   */
  async checkOrgTokensHealth(organizationId: string) {
    const configs = await db.whatsAppConfig.findMany({
      where: { organizationId, status: 'connected' },
      select: { id: true, accessToken: true },
    });

    const results = [];

    for (const config of configs) {
      const token = encryption.decrypt(config.accessToken);
      const health = await this.checkTokenHealth(token);

      results.push({
        configId: config.id,
        ...health,
      });

      // Update status no BD
      if (!health.valid) {
        await db.whatsAppConfig.update({
          where: { id: config.id },
          data: { tokenStatus: 'invalid' },
        });
      } else if (health.expiresIn && health.expiresIn < 7 * 24 * 3600) {
        // Menos de 7 dias
        await db.whatsAppConfig.update({
          where: { id: config.id },
          data: { tokenStatus: 'expiring_soon' },
        });
      }
    }

    return results;
  }
}
```

#### B) Job diário de verificação

```typescript
// src/jobs/token-health-check.job.ts

import { CronJob } from 'cron';

const tokenHealthService = new TokenHealthService();

export const tokenHealthCheckJob = new CronJob(
  '0 2 * * *', // 2AM
  async () => {
    try {
      // Verificar todas as orgs
      const orgs = await db.organization.findMany({
        select: { id: true },
      });

      for (const org of orgs) {
        const results = await tokenHealthService.checkOrgTokensHealth(org.id);

        const invalid = results.filter(r => !r.valid).length;
        const expiring = results.filter(r => r.expiresIn && r.expiresIn < 7 * 24 * 3600).length;

        if (invalid > 0 || expiring > 0) {
          logger.warn(
            `Org ${org.id}: ${invalid} invalid, ${expiring} expiring soon`
          );

          // Alert para ops/org
          // TODO: Enviar email/notificação
        }
      }
    } catch (error) {
      logger.error('Token health check failed', { error });
      Sentry.captureException(error);
    }
  },
  null,
  true,
  'America/Sao_Paulo'
);

tokenHealthCheckJob.start();
```

#### C) Refresh automático (se Meta suportar)

```typescript
// ⚠️ Meta NÃO suporta refresh de tokens de longa duração
// Você precisa fazer re-authentication via embedded signup

// Solução: Alert 30 dias antes de expirar
// "Reconecte seu WhatsApp para continuar"
```

---

## 7️⃣ RATE LIMITING (RISCO MÉDIO)

### 🔴 Problema
```
Webhook sem proteção contra:
- Spam de requests
- DDoS
- Ataque de signature bruta
```

### ✅ Solução Proposta

```typescript
// src/middleware/webhook-rate-limit.ts

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const limiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'webhook-rate-limit:',
  }),
  windowMs: 60 * 1000, // 1 minuto
  max: 1000, // 1000 requests por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware mais agressivo por organizationId
export const orgWebhookLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'webhook-org-limit:',
  }),
  windowMs: 60 * 1000,
  max: 100, // 100 webhooks por minuto por org
  keyGenerator: (req) => {
    // Extrair organizationId do payload (após validation)
    return `org-${extractOrgIdFromWebhook(req.body)}`;
  },
});

export async function extractOrgIdFromWebhook(body: any): Promise<string | null> {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === 'account_update') {
        const trackingCode = change.value?.sessionInfo?.trackingCode;
        if (trackingCode) {
          const onboarding = await db.whatsAppOnboarding.findUnique({
            where: { trackingCode },
            select: { organizationId: true },
          });
          return onboarding?.organizationId || null;
        }
      }
    }
  }
  return null;
}
```

```typescript
// src/app/api/v1/whatsapp/webhook/route.ts

import { limiter, orgWebhookLimiter } from '@/middleware/webhook-rate-limit';

export async function POST(request: Request) {
  // 1️⃣ Rate limit por IP
  // (implementar via middleware Next.js)

  const body = await request.json();
  const signature = request.headers.get('x-hub-signature-256');

  // 2️⃣ Validar signature ANTES de rate limit por org
  if (!validateWebhookSignature(body, signature)) {
    return Response.json({ error: 'Invalid' }, { status: 403 });
  }

  // 3️⃣ Rate limit por org
  const orgId = await extractOrgIdFromWebhook(body);
  if (orgId) {
    const isLimited = await checkOrgRateLimit(orgId);
    if (isLimited) {
      return Response.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }
  }

  // Processar...
}
```

---

## 8️⃣ DEAD LETTER QUEUE (RISCO ALTO)

### 🔴 Problema
```
Webhook falha → perdido forever
Não há retry automático
Mensagens/eventos podem não ser processados
```

### ✅ Solução Proposta

#### A) Marcar processed = true apenas ao final

```typescript
// src/services/whatsapp/webhook-processor.ts

export async function POST(request: Request) {
  const body = await request.json();

  // 1️⃣ Log webhook ANTES de processar
  const webhookLog = await db.whatsAppWebhookLog.create({
    data: {
      organizationId: /* se possível determinar */,
      payload: body,
      processed: false, // Começa como false
    },
  });

  try {
    // 2️⃣ Processar
    const processor = new WebhookProcessor();
    await processor.process(body);

    // 3️⃣ Marcar como processado APENAS se tudo ok
    await db.whatsAppWebhookLog.update({
      where: { id: webhookLog.id },
      data: { processed: true, processedAt: new Date() },
    });

  } catch (error) {
    // Marcar com erro (mas processed continua false)
    await db.whatsAppWebhookLog.update({
      where: { id: webhookLog.id },
      data: { processingError: error.message },
    });

    logger.error('Webhook processing failed', { webhookLogId: webhookLog.id, error });
  }

  // 4️⃣ Sempre retornar 200 OK para Meta
  return Response.json({ received: true });
}
```

#### B) Job de retry

```typescript
// src/jobs/webhook-retry.job.ts

import { CronJob } from 'cron';

export const webhookRetryJob = new CronJob(
  '*/5 * * * *', // A cada 5 minutos
  async () => {
    try {
      // Buscar webhooks que falharam
      const failed = await db.whatsAppWebhookLog.findMany({
        where: {
          processed: false,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24h
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 100, // Processar 100 por vez
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

          logger.info(`Webhook retry successful: ${log.id}`);

        } catch (error) {
          // Falhou novamente
          const attempts = (await db.whatsAppWebhookLog.findUnique({
            where: { id: log.id },
          }))?.payload?.retryCount || 0;

          if (attempts < 3) {
            // Tentar novamente
            await db.whatsAppWebhookLog.update({
              where: { id: log.id },
              data: {
                payload: {
                  ...log.payload,
                  retryCount: attempts + 1,
                },
              },
            });
          } else {
            // Desistir após 3 tentativas
            logger.error(
              `Webhook retry failed after 3 attempts: ${log.id}`,
              { error }
            );

            Sentry.captureException(error, {
              tags: { webhookLogId: log.id },
            });
          }
        }
      }
    } catch (error) {
      logger.error('Webhook retry job failed', { error });
    }
  },
  null,
  true,
  'America/Sao_Paulo'
);

webhookRetryJob.start();
```

#### C) Dashboard de webhooks mortos

```typescript
// API para listar failed webhooks
export async function getFailedWebhooks(organizationId: string, limit = 50) {
  return await db.whatsAppWebhookLog.findMany({
    where: {
      organizationId,
      processed: false,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// Manual retry
export async function manuallyRetryWebhook(webhookLogId: string) {
  const log = await db.whatsAppWebhookLog.findUnique({
    where: { id: webhookLogId },
  });

  const processor = new WebhookProcessor();
  await processor.process(log.payload);

  await db.whatsAppWebhookLog.update({
    where: { id: webhookLogId },
    data: { processed: true, processedAt: new Date() },
  });
}
```

---

## 9️⃣ VALIDAÇÃO DE SIGNATURE (RISCO BAIXO)

### ✅ Implementação

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

  // Meta envia: sha256={hash}
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expectedSignature = `sha256=${hash}`;

  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

**Teste:**
```typescript
it('deve validar signature corretamente', () => {
  const secret = 'test-secret';
  const body = { test: 'data' };
  const payload = JSON.stringify(body);

  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const signature = `sha256=${hash}`;

  const isValid = validateWebhookSignature(body, signature);
  expect(isValid).toBe(true);
});
```

---

## 🔟 TESTING STRATEGY (RISCO ALTO)

### 🔴 Problema
```
Sem Meta Test WABA, é arriscado testar webhook real
Staging pode não ter Meta app configurado
```

### ✅ Solução Proposta

#### A) Mock de webhooks (local + staging)

```typescript
// src/lib/webhook-mocks.ts

export const mockPartnerAddedWebhook = (trackingCode: string) => ({
  entry: [{
    id: '364015407714967',
    time: Math.floor(Date.now() / 1000),
    changes: [{
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
    }],
  }],
  object: 'whatsapp_business_account',
});

export const mockMessageWebhook = (fromPhone: string, text: string) => ({
  entry: [{
    id: '364015407714967',
    time: Math.floor(Date.now() / 1000),
    changes: [{
      field: 'messages',
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '5511999999999',
          phone_number_id: '123456789',
        },
        messages: [{
          from: fromPhone,
          id: `wamid.${Date.now()}`,
          timestamp: Math.floor(Date.now() / 1000),
          type: 'text',
          text: { body: text },
        }],
      },
    }],
  }],
  object: 'whatsapp_business_account',
});
```

#### B) E2E test com mocks

```typescript
// tests/whatsapp-onboarding.e2e.test.ts

import { createOnboarding, mockPartnerAddedWebhook } from '@/test-helpers';

describe('WhatsApp Onboarding E2E', () => {
  it('deve processar onboarding completo', async () => {
    // 1. Criar onboarding
    const { trackingCode, onboardingId } = await createOnboarding('org-123');

    // 2. Simular webhook Meta
    const webhookBody = mockPartnerAddedWebhook(trackingCode);
    const response = await POST(createRequest(webhookBody));

    expect(response.status).toBe(200);

    // 3. Validar resultado
    const connection = await db.whatsAppConnection.findFirst({
      where: { wabaId: '26205485689057417' },
    });

    expect(connection).toBeDefined();
    expect(connection.organizationId).toBe('org-123');
    expect(connection.status).toBe('active');

    // 4. Validar onboarding foi marcado completo
    const onboarding = await db.whatsAppOnboarding.findUnique({
      where: { id: onboardingId },
    });

    expect(onboarding.status).toBe('completed');
    expect(onboarding.completedAt).toBeDefined();
  });
});
```

#### C) Webhook testing endpoint (staging only)

```typescript
// src/app/api/v1/whatsapp/webhook/test/route.ts
// ⚠️ Remover em produção

if (process.env.NODE_ENV !== 'staging') {
  return Response.json({ error: 'Not available' }, { status: 403 });
}

export async function POST(request: Request) {
  const { type, trackingCode } = await request.json();

  let webhook;
  if (type === 'partner-added') {
    webhook = mockPartnerAddedWebhook(trackingCode);
  } else if (type === 'message') {
    webhook = mockMessageWebhook(request.body.phone, request.body.text);
  }

  // Assinar webhook (para testar signature validation também)
  const signature = generateWebhookSignature(webhook);

  const testRequest = new Request('http://localhost/api/v1/whatsapp/webhook', {
    method: 'POST',
    body: JSON.stringify(webhook),
    headers: {
      'x-hub-signature-256': signature,
    },
  });

  const response = await POST(testRequest);
  return response;
}

function generateWebhookSignature(body: any): string {
  const payload = JSON.stringify(body);
  const hash = crypto
    .createHmac('sha256', process.env.META_APP_SECRET!)
    .update(payload)
    .digest('hex');

  return `sha256=${hash}`;
}
```

---

## 📋 Checklist de Produção

- [ ] **Redis**
  - [ ] Hybrid cache (Redis + BD)
  - [ ] Job de cleanup diário
  - [ ] Monitoramento de health
  - [ ] Alertas se Redis down

- [ ] **Coexistence**
  - [ ] Testar com Meta se sessionInfo é enviado
  - [ ] Tratamento de webhooks sem trackingCode
  - [ ] UI para reclamar WABA órfã

- [ ] **Token encryption**
  - [ ] AES-256-GCM implementado
  - [ ] Chave gerada e rotacionada
  - [ ] Decrypt testado

- [ ] **Token refresh**
  - [ ] Job de health check (diário)
  - [ ] Alertas 30 dias antes de expirar
  - [ ] Dashboard de tokens inválidos

- [ ] **Rate limiting**
  - [ ] IP-based
  - [ ] Org-based
  - [ ] Alerts se ativado muito

- [ ] **Dead letter queue**
  - [ ] Webhook log com processed flag
  - [ ] Job de retry (a cada 5min, max 3 tentativas)
  - [ ] Dashboard de webhooks mortos

- [ ] **Signature validation**
  - [ ] HMAC-SHA256
  - [ ] Timing-safe comparison
  - [ ] Testes

- [ ] **Testing**
  - [ ] E2E mocks
  - [ ] Staging webhook endpoint (temp)
  - [ ] Production smoke test

- [ ] **Monitoring**
  - [ ] Sentry para errors
  - [ ] CloudWatch/Datadog para métricas
  - [ ] PagerDuty para alerts críticos

---

## 📊 Risco vs Esforço

| Item | Risco | Esforço | Prioridade |
|------|-------|---------|-----------|
| Redis fallback | Alto | Médio | 🔴 Alta |
| Token encryption | Alto | Baixo | 🔴 Alta |
| Token refresh check | Alto | Médio | 🔴 Alta |
| Dead letter queue | Alto | Médio | 🔴 Alta |
| Coexistence testing | Médio-Alto | Médio | 🟠 Alta |
| Rate limiting | Médio | Baixo | 🟡 Média |
| Feature flag gradual | Médio | Baixo | 🟡 Média |
| Signature validation | Baixo | Muito Baixo | 🟢 Baixa |

---

## 🎯 Recomendação Final

**Não deploy para produção sem:**
1. ✅ Redis com fallback (crítico)
2. ✅ Token encryption (crítico)
3. ✅ Dead letter queue (crítico)
4. ✅ Token health check (crítico)
5. ✅ Coexistence testing com Meta (crítico)

**Pode esperar:**
- Rate limiting (1 semana pós-deploy)
- Feature flag gradual (ok usar binary se quiser)
- Múltiplos telefones (próxima versão)

**Timeline realista:** 16h → 24h com tudo isso

Quer que eu detalhe qualquer um desses itens?
