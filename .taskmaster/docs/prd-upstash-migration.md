# PRD - Migração para Upstash (Redis + QStash)

> **Documento consolidado** - Este PRD substitui o anterior `prd-qstash-webhooks.md`

## 1. Visão Geral

Migrar de infraestrutura local (Docker) para Upstash cloud, consolidando Redis e QStash como camada de dados e fila confiável para webhooks da UAZAPI.

**Status**: Planejamento  
**Prioridade**: Alta  
**Estimativa**: 5.5 horas  
**Autor**: Cascade AI  
**Data**: 15/12/2025

### Objetivos
1. ✅ Usar Upstash Redis para BullMQ (follow-ups)
2. ✅ Usar Upstash QStash para webhooks confiáveis (UAZAPI)
3. ✅ Remover dependência de Docker local
4. ✅ Garantir zero perda de mensagens

---

## 2. Contexto

### Situação Atual
- Redis local (Docker) para BullMQ
- QStash (Upstash) para webhooks
- Dois provedores diferentes

### Objetivo
- Usar Upstash Redis para BullMQ
- Usar Upstash QStash para webhooks
- Remover dependência de Docker
- Manter compatibilidade com código existente

---

## 3. Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Upstash (Cloud)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   Redis (DB 0)   │         │   QStash (Fila)  │         │
│  │  - BullMQ jobs   │         │  - Webhooks      │         │
│  │  - Cache         │         │  - Retry logic   │         │
│  │  - Sessions      │         │  - Monitoring    │         │
│  └──────────────────┘         └──────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         ↑
                         │
┌─────────────────────────────────────────────────────────────┐
│              Backend (Vercel)                               │
├─────────────────────────────────────────────────────────────┤
│  - @upstash/redis (cliente)                                 │
│  - @upstash/qstash (cliente)                                │
│  - BullMQ (compatível com Upstash Redis)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Fases de Implementação

### Fase 1: Preparação (30min)
- [ ] Instalar dependências
- [ ] Criar variáveis de ambiente
- [ ] Documentar mudanças

### Fase 2: Migração Redis (2h)
- [ ] Atualizar `src/lib/redis/redis-client.ts`
- [ ] Testar BullMQ com Upstash Redis
- [ ] Validar follow-ups agendados

### Fase 3: Integração QStash (2h)
- [ ] Criar `src/lib/qstash/client.ts`
- [ ] Criar `src/lib/qstash/verify.ts`
- [ ] Criar endpoint webhook QStash

### Fase 4: Testes e Validação (1h)
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Deploy em staging

---

## 5. Fase 1: Preparação

### 5.1 Instalar Dependências

```bash
npm install @upstash/redis @upstash/qstash
```

### 5.2 Variáveis de Ambiente

```bash
# Redis (Upstash) - TCP para BullMQ
UPSTASH_REDIS_URL="rediss://default:<password>@<host>.upstash.io:6379"

# Redis (Upstash) - HTTP para operações simples (opcional)
UPSTASH_REDIS_REST_URL="https://<host>.upstash.io"
UPSTASH_REDIS_REST_TOKEN="<seu-token-redis>"

# QStash (Upstash)
QSTASH_TOKEN="<seu-token-qstash>"
QSTASH_CURRENT_SIGNING_KEY="<chave-atual>"
QSTASH_NEXT_SIGNING_KEY="<próxima-chave>"
```

**Nota**: Use `rediss://` (com dois 's') para conexão TLS

### 5.3 Verificação de Credenciais

1. Acessar https://console.upstash.com
2. Copiar Redis URL e Token
3. Copiar QStash Token e Signing Keys
4. Adicionar ao `.env`

---

## 6. Fase 2: Migração Redis

### 6.1 Importante: BullMQ + Upstash

⚠️ **BullMQ requer conexão TCP** (não HTTP). Upstash Redis suporta ambos:
- **HTTP**: `@upstash/redis` (para operações simples)
- **TCP**: `ioredis` com URL TCP (para BullMQ)

### 6.2 Cliente Redis para BullMQ (TCP)

**Arquivo**: `src/lib/redis/redis-client.ts`

```typescript
/**
 * Redis Client para BullMQ
 * Usa ioredis com conexão TCP para Upstash Redis
 */
import Redis from 'ioredis'

let redis: Redis | null = null

export function getRedisClient(): Redis {
  if (!redis) {
    // Upstash Redis URL TCP: redis://default:xxx@xxx.upstash.io:6379
    redis = new Redis(process.env.UPSTASH_REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: {
        rejectUnauthorized: false,
      },
    })
  }
  return redis
}

export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
```

### 6.3 Cliente Redis para Operações Simples (HTTP)

**Arquivo**: `src/lib/redis/upstash-client.ts` (opcional)

```typescript
/**
 * Upstash Redis Client (HTTP)
 * Para operações simples que não precisam de TCP
 */
import { Redis } from '@upstash/redis'

let upstashRedis: Redis | null = null

export function getUpstashClient(): Redis {
  if (!upstashRedis) {
    upstashRedis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return upstashRedis
}
```

### 6.4 BullMQ (Sem Mudanças)

```typescript
// Em src/lib/bullmq/queues.ts - FUNCIONA COM IOREDIS
import { Queue } from 'bullmq'
import { getRedisClient } from '@/lib/redis/redis-client'

export function getFollowupQueue(): Queue<FollowupJobData> {
  if (!followupQueue) {
    followupQueue = new Queue<FollowupJobData>('followup', {
      connection: getRedisClient(), // ioredis com Upstash TCP
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    })
  }
  return followupQueue
}
```

### 6.3 Testes

```bash
# Testar conexão
npm run test:redis

# Testar BullMQ
npm run test:bullmq
```

---

## 7. Fase 3: Integração QStash

### 7.1 Cliente QStash

**Arquivo**: `src/lib/qstash/client.ts`

```typescript
import { Client } from '@upstash/qstash'

let qstashClient: Client | null = null

export function getQStashClient(): Client {
  if (!qstashClient) {
    qstashClient = new Client({
      token: process.env.QSTASH_TOKEN!,
    })
  }
  return qstashClient
}
```

### 7.2 Verificação de Assinatura

**Arquivo**: `src/lib/qstash/verify.ts`

```typescript
import { Receiver } from '@upstash/qstash/nextjs'

export function getQStashReceiver(): Receiver {
  return new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  })
}

export async function verifyQStashRequest(
  req: Request
): Promise<Record<string, unknown>> {
  const receiver = getQStashReceiver()
  const body = await req.text()
  
  try {
    await receiver.verify({
      signature: req.headers.get('upstash-signature') || '',
      body,
    })
    return JSON.parse(body)
  } catch (error) {
    console.error('[qstash] Signature verification failed:', error)
    throw new Error('Invalid QStash signature')
  }
}
```

### 7.3 Endpoint Webhook

**Arquivo**: `src/app/api/v1/webhooks/qstash/whatsapp/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyQStashRequest } from '@/lib/qstash/verify'
import { handleQStashWebhook } from '@/services/webhooks/qstash-handler'

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyQStashRequest(req)
    await handleQStashWebhook(payload)
    
    return NextResponse.json(
      { success: true, message: 'Webhook processed' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[qstash-webhook] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

### 7.4 Handler de Webhook

**Arquivo**: `src/services/webhooks/qstash-handler.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { 
  upsertLead, 
  upsertConversation, 
  createMessage 
} from '@/services/chat'
import { publishNewMessage } from '@/lib/centrifugo/publisher'

export async function handleQStashWebhook(
  payload: Record<string, unknown>
): Promise<void> {
  // Normalizar payload UAZAPI
  const normalized = normalizeUazapiPayload(payload)
  
  // Persistir no banco
  const lead = await upsertLead({
    organizationId: normalized.organizationId,
    remoteJid: normalized.remoteJid,
    phone: normalized.phone,
    name: normalized.name,
  })
  
  const conversation = await upsertConversation({
    organizationId: normalized.organizationId,
    leadId: lead.id,
    instanceId: normalized.instanceId,
  })
  
  const message = await createMessage({
    ticketId: conversation.ticketId,
    senderType: normalized.direction === 'inbound' ? 'LEAD' : 'USER',
    senderId: normalized.direction === 'inbound' ? lead.id : null,
    senderName: normalized.name,
    messageType: normalized.messageType,
    content: normalized.content,
    mediaUrl: normalized.mediaUrl,
    sentAt: normalized.sentAt,
  })
  
  // Publicar em tempo real
  await publishNewMessage(conversation.id, {
    id: message.id,
    content: message.content,
    senderType: message.senderType,
    sentAt: message.sentAt,
  })
}

function normalizeUazapiPayload(payload: Record<string, unknown>) {
  // Implementar normalização do payload UAZAPI
  return {
    organizationId: payload.organizationId as string,
    remoteJid: payload.remoteJid as string,
    phone: payload.phone as string,
    name: payload.name as string,
    instanceId: payload.instanceId as string,
    direction: payload.direction as 'inbound' | 'outbound',
    messageType: payload.messageType as string,
    content: payload.content as string,
    mediaUrl: payload.mediaUrl as string | undefined,
    sentAt: new Date(payload.sentAt as string),
  }
}
```

---

## 8. Configuração UAZAPI

Atualizar webhook URL na UAZAPI:

```bash
# Webhook URL (QStash como intermediário)
https://qstash.io/api/v1/publish/https://whatrack.com/api/v1/webhooks/qstash/whatsapp

# Headers (QStash adiciona automaticamente)
Authorization: Bearer <QSTASH_TOKEN>
```

---

## 9. Testes

### 9.1 Testes Unitários

```typescript
// src/__tests__/lib/redis.test.ts
describe('Redis Client', () => {
  it('should connect to Upstash Redis', async () => {
    const redis = getRedisClient()
    const pong = await redis.ping()
    expect(pong).toBe('PONG')
  })
})

// src/__tests__/lib/qstash.test.ts
describe('QStash Verification', () => {
  it('should verify valid signature', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'upstash-signature': validSignature,
      },
      body: JSON.stringify(payload),
    })
    
    const verified = await verifyQStashRequest(req)
    expect(verified).toEqual(payload)
  })
})
```

### 9.2 Testes de Integração

```bash
# Testar webhook completo
npm run test:webhook

# Testar BullMQ com Upstash
npm run test:bullmq
```

### 9.3 Testes Manuais

1. Enviar mensagem via WhatsApp
2. Verificar no Upstash Console (QStash logs)
3. Verificar persistência no banco
4. Verificar atualização em tempo real (Centrifugo)

---

## 10. Monitoramento

### 10.1 Upstash Console

- Dashboard Redis: https://console.upstash.com/redis
- Dashboard QStash: https://console.upstash.com/qstash

### 10.2 Logs da Aplicação

```typescript
console.log('[redis] Connected to Upstash')
console.log('[qstash] Webhook received and verified')
console.log('[qstash] Message processed successfully')
```

### 10.3 Alertas

- Falha de conexão Redis
- Falha de verificação QStash
- Timeout de processamento

---

## 11. Rollback Plan

Se houver problemas:

1. **Redis**: Reverter para `ioredis` local
2. **QStash**: Reverter webhook direto para UAZAPI
3. **BullMQ**: Continua funcionando com qualquer cliente Redis

---

## 12. Estimativa de Esforço

| Fase | Tarefa | Estimativa |
|------|--------|-----------|
| 1 | Preparação | 30min |
| 2 | Migração Redis | 2h |
| 3 | Integração QStash | 2h |
| 4 | Testes e Validação | 1h |
| **Total** | | **5.5h** |

---

## 13. Critérios de Aceitação

- ✅ BullMQ funciona com Upstash Redis
- ✅ Follow-ups agendados funcionam
- ✅ Webhook QStash recebido e validado
- ✅ Mensagens persistidas no banco
- ✅ Atualização em tempo real (Centrifugo)
- ✅ Logs disponíveis no Upstash Console
- ✅ Sem perda de dados em caso de falha

---

## 14. Próximos Passos

1. ✅ Aprovação do PRD
2. ⏳ Implementação das 4 fases
3. ⏳ Testes em staging
4. ⏳ Deploy em produção
