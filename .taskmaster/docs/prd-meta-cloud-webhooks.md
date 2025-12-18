# PRD: Meta Cloud Webhooks - Arquitetura de Dados Específica

## Overview

Sistema completo de processamento de webhooks da API oficial do WhatsApp (Meta Cloud) com **models específicas** para preparar o abandono das APIs não oficiais (Wuzapi, Uazapi).

Implementa **modo de coexistência** onde o número do WhatsApp pode ser usado simultaneamente no aplicativo e via API oficial.

**Status**: Em Planejamento

## Problema

### Limitações Atuais

1. **Dados genéricos**: WhatsappMessage é compartilhada entre Wuzapi, Uazapi e Meta Cloud
2. **Sem histórico completo**: Não armazena payload completo dos webhooks
3. **Sem idempotency robusta**: Pode processar webhook duplicado
4. **Sem tracking de media**: Download de mídia não gerenciado
5. **Sem histórico de status**: Apenas status atual, sem audit trail

### Bloqueadores para Migração

- Impossível abandonar APIs não oficiais sem migração de dados complexa
- Perda de informações específicas da Meta (wamid, context, interactive)
- Dificulta debugging de problemas no webhook

## Solução

### Arquitetura de Dados Específica para Meta Cloud

Criar **models separadas** para Meta Cloud com:

1. **MetaCloudWebhookEvent**: Armazenamento de todos os webhooks (idempotency + debugging)
2. **MetaCloudMessage**: Mensagens com dados ricos da Meta (wamid, context, interactive)
3. **MetaCloudMedia**: Gestão completa do lifecycle de download de mídia
4. **MetaCloudMessageStatus**: Histórico completo de status updates

### Bridge com Sistema Existente

Manter **compatibilidade** com sistema atual:
- Criar Message genérica em paralelo à MetaCloudMessage
- Integrar com Lead/Conversation/Ticket existentes
- UI/relatórios continuam funcionando sem mudanças

## Objetivos

### Funcionais

- ✅ Processar mensagens de texto
- ✅ Processar mensagens de mídia (image, video, audio, document)
- ✅ Fazer download e armazenar mídia
- ✅ Receber e processar status updates (sent/delivered/read/failed)
- ✅ Armazenar histórico completo de webhooks
- ✅ Prevenir processamento duplicado (idempotency)
- ✅ Integrar com sistema Lead/Conversation/Ticket
- ✅ Suportar tipos de mensagem extensíveis (location, contacts, interactive)

### Não-Funcionais

- ✅ Sempre retornar 200 à Meta (evitar retries)
- ✅ Processar webhook < 500ms (p95)
- ✅ Download de mídia < 5s (p95)
- ✅ Armazenar payload completo para debugging
- ✅ Idempotency 100% (zero duplicatas)

## Tipos de Webhooks (MVP)

### Mensagens

| Tipo | Descrição | Campos Específicos | Media |
|------|-----------|-------------------|-------|
| **text** | Mensagem de texto | text.body | - |
| **image** | Imagem | image.id, caption | ✅ |
| **video** | Vídeo | video.id, caption | ✅ |
| **audio** | Áudio/voice | audio.id | ✅ |
| **document** | Documento | document.id, filename, caption | ✅ |
| **location** | Localização | latitude, longitude, name, address | - |
| **contacts** | Cartão de contato | contact cards array | - |
| **button** | Resposta de botão | payload, text | - |
| **interactive** | Lista/botão reply | button_reply, list_reply | - |

### Status Updates

| Status | Descrição | Timestamp | Error |
|--------|-----------|-----------|-------|
| **sent** | Enviada para servidor WhatsApp | ✅ | - |
| **delivered** | Entregue no dispositivo | ✅ | - |
| **read** | Lida pelo destinatário | ✅ | - |
| **failed** | Falha no envio | ✅ | ✅ |

### History Sync

- Sincronização de histórico ao conectar número
- Recebe mensagens antigas via webhook
- Mesmo formato que mensagens novas

## Arquitetura de Dados

### Schema Prisma Completo

```prisma
// ============================================
// META CLOUD WEBHOOK EVENTS
// ============================================

/// Eventos de webhook da Meta (idempotency + debugging)
model MetaCloudWebhookEvent {
  id String @id @default(cuid())

  // Identificação
  webhookId String @unique // Message ID ou Status ID da Meta
  eventType String // "message" ou "status"

  // Lookup de organização
  phoneNumberId String // Link para MetaWhatsAppCredential
  organizationId String
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Estado de processamento
  processed Boolean @default(false)
  processedAt DateTime?
  error String? @db.Text

  // Payload completo (para debugging/reprocessing)
  payload Json @db.JsonB

  // Timestamps
  receivedAt DateTime @default(now())

  // Relações
  messages MetaCloudMessage[]
  statuses MetaCloudMessageStatus[]

  @@unique([phoneNumberId, webhookId])
  @@index([organizationId, processed])
  @@index([phoneNumberId])
  @@index([eventType])
  @@index([receivedAt])
  @@map("meta_cloud_webhook_events")
}

// ============================================
// META CLOUD MESSAGES
// ============================================

enum MetaCloudMessageType {
  TEXT
  IMAGE
  VIDEO
  AUDIO
  DOCUMENT
  STICKER
  LOCATION
  CONTACTS
  BUTTON_REPLY
  LIST_REPLY
  INTERACTIVE
  REACTION
  UNSUPPORTED
}

enum MetaCloudMessageDirection {
  INBOUND  // Recebida do cliente
  OUTBOUND // Enviada pela organização
}

/// Mensagens Meta Cloud (dados ricos específicos da Meta)
model MetaCloudMessage {
  id String @id @default(cuid())

  // Identificação Meta
  wamid String @unique // WhatsApp Message ID (wamid.xxx)

  // Organização e webhook
  organizationId String
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  webhookEventId String?
  webhookEvent MetaCloudWebhookEvent? @relation(fields: [webhookEventId], references: [id], onDelete: SetNull)

  // Número do telefone (credencial Meta)
  phoneNumberId String // De MetaWhatsAppCredential

  // Participantes da conversa
  direction MetaCloudMessageDirection
  from String // Número de telefone (5511999999999)
  to String? // Número de telefone (para outbound)

  // Tipo e conteúdo
  type MetaCloudMessageType

  // Conteúdo de texto
  text String? @db.Text

  // Info do contato (primeira mensagem ou contato atualizado)
  contactName String?
  contactWaId String?

  // Context (reply, forwarding)
  contextMessageId String? // Se está respondendo outra mensagem
  isForwarded Boolean @default(false)
  forwardedCount Int @default(0)

  // Referência de mídia
  mediaId String?
  media MetaCloudMedia? @relation(fields: [mediaId], references: [id], onDelete: SetNull)

  // Dados de localização (para mensagens de location)
  locationLatitude Float?
  locationLongitude Float?
  locationName String?
  locationAddress String?

  // Dados interativos/botão
  interactiveType String? // button_reply, list_reply
  buttonPayload String?
  buttonText String?
  listId String?
  listTitle String?
  listDescription String?

  // Dados de reação
  reactionEmoji String?
  reactionMessageId String? // Mensagem sendo reagida

  // Estrutura completa da mensagem (para tipos não suportados ou expansão futura)
  rawMessageData Json? @db.JsonB

  // Timestamps
  timestamp String // Unix timestamp da Meta
  sentAt DateTime // Timestamp convertido

  // Integração com sistema existente
  leadId String?
  lead Lead? @relation(fields: [leadId], references: [id], onDelete: SetNull)

  conversationId String?
  conversation Conversation? @relation(fields: [conversationId], references: [id], onDelete: SetNull)

  ticketId String?
  ticket Ticket? @relation(fields: [ticketId], references: [id], onDelete: SetNull)

  // Link para mensagem genérica (bridge)
  messageId String? @unique
  message Message? @relation(fields: [messageId], references: [id], onDelete: SetNull)

  // Tracking de status
  currentStatus MetaCloudMessageStatusEnum @default(PENDING)
  lastStatusUpdate DateTime?

  statuses MetaCloudMessageStatus[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, wamid])
  @@index([organizationId, direction])
  @@index([phoneNumberId])
  @@index([from])
  @@index([to])
  @@index([leadId])
  @@index([conversationId])
  @@index([ticketId])
  @@index([sentAt])
  @@index([type])
  @@index([currentStatus])
  @@map("meta_cloud_messages")
}

// ============================================
// META CLOUD MEDIA
// ============================================

enum MetaCloudMediaType {
  IMAGE
  VIDEO
  AUDIO
  DOCUMENT
  STICKER
}

enum MetaCloudMediaStatus {
  PENDING     // Recebido media_id, ainda não baixado
  DOWNLOADING // Download em progresso
  DOWNLOADED  // Baixado com sucesso
  FAILED      // Falha no download
  EXPIRED     // URL de download expirou
}

/// Arquivos de mídia de mensagens Meta Cloud
model MetaCloudMedia {
  id String @id @default(cuid())

  // Identificação de mídia Meta
  mediaId String @unique // Media ID da Meta (para download)
  sha256 String? // Hash SHA256 da Meta

  // Tipo e metadata
  type MetaCloudMediaType
  mimeType String

  // Informações do arquivo
  fileName String?
  caption String? @db.Text
  sizeBytes Int?
  durationSeconds Int? // Para áudio/vídeo

  // Dimensões (para imagem/vídeo)
  width Int?
  height Int?

  // Informações de download
  status MetaCloudMediaStatus @default(PENDING)
  downloadUrl String? @db.Text // URL temporária da Meta (expira)
  downloadUrlExpiresAt DateTime?

  // Armazenamento (após download)
  storageProvider String? // "s3", "r2", "local"
  storageKey String? // Chave/path no storage
  storageBucket String?
  storageUrl String? @db.Text // URL permanente

  // Tentativas de download
  downloadAttempts Int @default(0)
  lastDownloadAttempt DateTime?
  downloadError String? @db.Text

  // Organização
  organizationId String
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Mensagens relacionadas
  messages MetaCloudMessage[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@index([status])
  @@index([type])
  @@index([downloadUrlExpiresAt])
  @@map("meta_cloud_media")
}

// ============================================
// META CLOUD MESSAGE STATUS
// ============================================

enum MetaCloudMessageStatusEnum {
  PENDING   // Mensagem aceita pela Meta
  SENT      // Enviada para servidor WhatsApp
  DELIVERED // Entregue no dispositivo do destinatário
  READ      // Lida pelo destinatário
  FAILED    // Falha ao enviar
}

/// Histórico de status updates para mensagens Meta Cloud
model MetaCloudMessageStatus {
  id String @id @default(cuid())

  // Referência da mensagem
  messageId String
  message MetaCloudMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)

  // Evento de webhook (status updates vêm via webhook)
  webhookEventId String?
  webhookEvent MetaCloudWebhookEvent? @relation(fields: [webhookEventId], references: [id], onDelete: SetNull)

  // Informação de status
  status MetaCloudMessageStatusEnum
  timestamp String // Unix timestamp da Meta
  statusAt DateTime // Timestamp convertido

  // Destinatário (para mensagens outbound)
  recipientId String? // Número do telefone que recebeu/leu

  // Informação de erro (para status failed)
  errorCode Int?
  errorTitle String?
  errorMessage String? @db.Text
  errorDetails Json? @db.JsonB

  // Informação de preço (do webhook Meta)
  pricingModel String? // "CBP" (conversation-based pricing)
  pricingCategory String? // "business_initiated", "user_initiated"

  createdAt DateTime @default(now())

  @@index([messageId, status])
  @@index([statusAt])
  @@map("meta_cloud_message_statuses")
}
```

### Relacionamentos com Models Existentes

```prisma
// Adicionar ao model Organization
model Organization {
  // ... campos existentes ...

  metaCloudWebhookEvents MetaCloudWebhookEvent[]
  metaCloudMessages MetaCloudMessage[]
  metaCloudMedia MetaCloudMedia[]
}

// Adicionar ao model Lead
model Lead {
  // ... campos existentes ...

  metaCloudMessages MetaCloudMessage[]
}

// Adicionar ao model Conversation
model Conversation {
  // ... campos existentes ...

  metaCloudMessages MetaCloudMessage[]
}

// Adicionar ao model Ticket
model Ticket {
  // ... campos existentes ...

  metaCloudMessages MetaCloudMessage[]
}

// Adicionar ao model Message
model Message {
  // ... campos existentes ...

  metaCloudMessage MetaCloudMessage?
}
```

## Arquitetura de Serviços

### Estrutura de Pastas

```
src/services/whatsapp/meta-cloud/
├── config.ts                      # EXISTING
├── webhook-verify.ts              # EXISTING
├── send-message.ts                # EXISTING (minor updates)
├── webhook/
│   ├── types.ts                   # NEW - TypeScript types
│   ├── webhook-event-service.ts   # NEW - Idempotency layer
│   ├── webhook-processor.ts       # NEW - Main orchestrator
│   ├── status-handler.ts          # NEW - Status update handler
│   ├── message-handlers/
│   │   ├── index.ts               # NEW - Factory
│   │   ├── base-handler.ts        # NEW - Abstract base
│   │   ├── text-handler.ts        # NEW
│   │   ├── image-handler.ts       # NEW
│   │   ├── video-handler.ts       # NEW
│   │   ├── audio-handler.ts       # NEW
│   │   ├── document-handler.ts    # NEW
│   │   ├── location-handler.ts    # NEW
│   │   ├── contacts-handler.ts    # NEW
│   │   ├── button-handler.ts      # NEW
│   │   ├── list-handler.ts        # NEW
│   │   ├── reaction-handler.ts    # NEW
│   │   └── unsupported-handler.ts # NEW
│   └── index.ts
├── message/
│   ├── message-service.ts         # NEW - Message CRUD
│   ├── media-service.ts           # NEW - Media download/storage
│   └── index.ts
├── integration/
│   ├── lead-service.ts            # NEW - Lead upsert
│   ├── conversation-service.ts    # NEW - Conversation management
│   ├── ticket-service.ts          # NEW - Ticket creation
│   └── index.ts
└── index.ts                       # UPDATED exports
```

### Padrões de Design

#### 1. WebhookEventService (Idempotency)

**Padrão**: Similar a `src/services/billing/webhook-service.ts`

```typescript
export class MetaCloudWebhookEventService {
  async isProcessed(phoneNumberId: string, webhookId: string): Promise<boolean>
  async store(data: StoreWebhookEventData): Promise<WebhookEvent>
  async markProcessed(eventId: string): Promise<void>
  async markFailed(eventId: string, error: string): Promise<void>
  async getUnprocessed(limit: number): Promise<WebhookEvent[]>
}
```

#### 2. WebhookProcessor (Orchestrator)

```typescript
export class MetaCloudWebhookProcessor {
  async process(payload: MetaWebhookPayload) {
    // 1. Validar estrutura
    // 2. Lookup organização por phoneNumberId
    // 3. Para cada mensagem/status:
    //    a. Check idempotency
    //    b. Store webhook event
    //    c. Process message/status
    //    d. Mark as processed/failed
  }
}
```

#### 3. Message Handler Pattern (Strategy + Factory)

```typescript
// Base handler (template method)
export abstract class BaseMessageHandler {
  async handle(context: MessageHandlerContext) {
    // 1. Create MetaCloudMessage
    const metaMessage = await this.createMetaCloudMessage(context)

    // 2. Process type-specific logic (implemented by subclass)
    await this.processMessage(context, metaMessage)

    // 3. Integrate with existing system
    await this.integrateWithExistingSystem(context, metaMessage)
  }

  protected abstract processMessage(context, metaMessage): Promise<void>
}

// Concrete handlers
export class TextMessageHandler extends BaseMessageHandler {
  protected async processMessage(context, metaMessage) {
    // Text já armazenado em createMetaCloudMessage
  }
}

export class ImageMessageHandler extends BaseMessageHandler {
  protected async processMessage(context, metaMessage) {
    // 1. Create media record
    // 2. Schedule download
  }
}

// Factory
export class MessageHandlerFactory {
  getHandler(messageType: string): BaseMessageHandler {
    // Return appropriate handler
  }
}
```

#### 4. MediaService (Download & Storage)

```typescript
export class MediaService {
  async createFromWebhook(data): Promise<Media>
  async scheduleDownload(mediaId: string): Promise<void>
  async downloadMedia(mediaId: string): Promise<void>

  private async getMediaDownloadUrl(mediaId, token): Promise<string>
  private async downloadFile(url): Promise<Buffer>
  private async uploadToStorage(media, buffer): Promise<StorageResult>
}
```

#### 5. StatusHandler

```typescript
export class StatusHandler {
  async handle(context: StatusHandlerContext) {
    // 1. Find message by wamid
    // 2. Create status record
    // 3. Update message current status
    // 4. Update generic Message (if linked)
    // 5. Update CampaignRecipient (if from campaign)
  }
}
```

## Fluxos de Processamento

### 1. Webhook Receipt Flow

```
┌──────────────────────────────────────┐
│     Meta Cloud Webhook POST          │
│     /webhook (payload)                │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│   WebhookProcessor.process()         │
│                                      │
│   1. Validate payload structure      │
│   2. Lookup org by phoneNumberId     │
│   3. For each message/status:        │
│      a. Check idempotency            │
│      b. Store webhook event          │
│      c. Process message/status       │
│      d. Mark processed/failed        │
└──────────────────────────────────────┘
                 │
         ┌───────┴───────┐
         ▼               ▼
   ┌─────────┐     ┌─────────┐
   │ Message │     │ Status  │
   │Processing│     │Processing│
   └─────────┘     └─────────┘
```

### 2. Message Processing Flow

```
┌──────────────────────────────────────┐
│  MessageHandlerFactory.getHandler()  │
│     (based on message.type)          │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│   BaseMessageHandler.handle()        │
│                                      │
│   1. Create MetaCloudMessage         │
│      - wamid, type, timestamp        │
│      - text/media/location data      │
│                                      │
│   2. Process type-specific logic     │
│      - Text: nothing                 │
│      - Image/Video: create media     │
│      - Location: store coords        │
│                                      │
│   3. Integrate with system           │
│      a. Upsert Lead                  │
│      b. Upsert Conversation          │
│      c. Find/Create Ticket           │
│      d. Create Message (bridge)      │
│      e. Link MetaCloudMessage        │
│      f. Update metrics               │
└──────────────────────────────────────┘
```

### 3. Media Download Flow

```
┌──────────────────────────────────────┐
│  ImageHandler.processMessage()       │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  MediaService.createFromWebhook()    │
│  - Create MetaCloudMedia             │
│  - Status: PENDING                   │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  MediaService.scheduleDownload()     │
│  - Queue job OR immediate            │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  MediaService.downloadMedia()        │
│                                      │
│  1. Status → DOWNLOADING             │
│  2. GET /{mediaId} from Meta         │
│  3. Download file from URL           │
│  4. Upload to storage (S3/R2)        │
│  5. Update record:                   │
│     - status → DOWNLOADED            │
│     - storageUrl, storageKey         │
│                                      │
│  On error:                           │
│     - status → FAILED                │
│     - downloadError, attempts++      │
└──────────────────────────────────────┘
```

### 4. Status Update Flow

```
┌──────────────────────────────────────┐
│   StatusHandler.handle()             │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  1. Find MetaCloudMessage by wamid   │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  2. Create MetaCloudMessageStatus    │
│     - status (SENT/DELIVERED/READ)   │
│     - timestamp, recipientId         │
│     - error (if failed)              │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  3. Update MetaCloudMessage          │
│     .currentStatus                   │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  4. Update generic Message           │
│     (if linked)                      │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  5. Update CampaignRecipient         │
│     (if from campaign)               │
└──────────────────────────────────────┘
```

## Webhook Route (Updated)

```typescript
// src/app/api/v1/whatsapp/meta-cloud/webhook/route.ts

export async function GET(request: Request) {
  // Webhook verification (unchanged)
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const result = verifyMetaWebhook({ mode, token, challenge })

  if (result.success) {
    return new Response(result.challenge, { status: 200 })
  }

  return NextResponse.json({ error: result.error }, { status: 403 })
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    // NEW: Use new webhook processor
    const processor = new MetaCloudWebhookProcessor()
    const result = await processor.process(payload)

    // Always return 200 (even on errors) to prevent Meta retries
    return NextResponse.json({
      received: true,
      messagesProcessed: result.messagesProcessed,
      statusesProcessed: result.statusesProcessed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (error) {
    console.error('[meta-cloud/webhook] POST error:', error)

    // Always return 200
    return NextResponse.json({
      received: true,
      error: 'Internal error',
      message: error.message,
    })
  }
}
```

## Error Handling

### Estratégia de Retry

| Cenário | Ação | Retry |
|---------|------|-------|
| **Invalid payload** | Log, return 200 | ❌ Não |
| **Organization not found** | Log warning, return 200 | ❌ Não |
| **Database error** | Log error, return 200, mark unprocessed | ✅ Via job |
| **Media download failure** | Mark FAILED, increment attempts | ✅ 3x exponential backoff |
| **Status update failure** | Log warning, continue | ❌ Não (não crítico) |

### Idempotency

```typescript
// Check before processing
const alreadyProcessed = await webhookService.isProcessed(phoneNumberId, messageId)
if (alreadyProcessed) {
  return { skipped: true, reason: 'Already processed' }
}

// Store before processing
const event = await webhookService.store({
  webhookId: messageId,
  eventType: 'message',
  phoneNumberId,
  organizationId,
  payload: message,
})

// Process...

// Mark as processed
await webhookService.markProcessed(event.id)
```

## Performance & Indexes

### Database Indexes

Todos os indexes críticos incluídos no schema:

- **meta_cloud_webhook_events**: phoneNumberId, webhookId (unique), processed, receivedAt
- **meta_cloud_messages**: wamid (unique), organizationId+wamid (unique), phoneNumberId, leadId, sentAt, type, currentStatus
- **meta_cloud_media**: mediaId (unique), status, type, downloadUrlExpiresAt
- **meta_cloud_message_statuses**: messageId+status, statusAt

### Query Optimization

- Use `select` para buscar apenas campos necessários
- Paginação com skip/take (limit 100 default)
- Soft deletes não necessário (manter histórico completo)

### Background Jobs

- **Media downloads**: Imediato para MVP, queue para produção
- **Webhook reprocessing**: Cron job para unprocessed webhooks
- **Media cleanup**: Deletar URLs expiradas, arquivos órfãos

## Testing Strategy

### Unit Tests

- `WebhookEventService`: idempotency, storage, status
- `MessageHandlers`: cada handler isoladamente
- `MediaService`: download logic, storage logic
- `StatusHandler`: status mapping, updates

### Integration Tests

- Fluxo completo de webhook (text message)
- Mensagem de mídia com download
- Fluxo de status update
- Integração Lead/Conversation/Ticket
- Campaign status update

### E2E Tests

- Enviar webhook do simulador Meta
- Verificar records no banco
- Verificar mídia baixada e armazenada
- Verificar status updates propagam

## Migration Plan

### Phase 1: Schema Migration (Semana 1)
- ✅ Criar novos models Prisma
- ✅ Executar migration
- ✅ Verificar schema em staging

### Phase 2: Service Implementation (Semanas 2-3)
- WebhookEventService
- MessageHandlers (text, image, video, audio, document)
- StatusHandler
- MediaService (download básico)

### Phase 3: Integration (Semana 3)
- Atualizar webhook route
- Integrar com Lead/Conversation/Ticket
- Bridge para Message genérica

### Phase 4: Testing (Semana 4)
- Unit tests para todos services
- Integration tests
- E2E tests em staging

### Phase 5: Deployment (Semana 5)
- Deploy para produção (1 organização piloto)
- Monitorar métricas e logs
- Rollout gradual para todas organizações

### Phase 6: Optimization (Semana 6+)
- Adicionar queue de download de mídia
- Implementar job de cleanup de mídia
- Adicionar ferramenta de reprocessamento
- Performance tuning

## Monitoring & Observability

### Métricas

- Webhooks recebidos por minuto
- Latência de processamento (p50, p95, p99)
- Webhooks falhados (por tipo de erro)
- Downloads de mídia (taxa de sucesso, latência)
- Status updates recebidos

### Alertas

- Taxa de falha de webhook > 5%
- Taxa de falha de download de mídia > 10%
- Queue de webhooks não processados > 100
- Erros de banco de dados

### Logging

- Logs JSON estruturados com contexto
- Log levels: DEBUG (dev), INFO (prod)
- Incluir: organizationId, webhookId, messageType, wamid

## Future Enhancements

### Post-MVP

1. **Tipos de mensagem interativos**: Sticker, Reaction, Template
2. **Media transcoding**: Redimensionar imagens, comprimir vídeos
3. **Webhook signature validation**: Se Meta adicionar
4. **Dashboard de monitoring em tempo real**
5. **Ferramenta de replay de webhooks**: Admin UI
6. **Media CDN**: Servir mídia via CDN para performance
7. **History sync**: Backfill de mensagens históricas

### Recursos Avançados

1. **Busca de mensagens**: Full-text search em MetaCloudMessage
2. **Analytics**: Distribuição de tipos de mensagem, uso de mídia
3. **Compliance**: Políticas de retenção de dados, exports GDPR
4. **Multi-region**: Armazenar mídia na região do usuário

## Risks & Mitigations

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Rate limits da Meta API | Alto | Médio | Respeitar limites, backoff |
| Expiração de URL de mídia | Médio | Alto | Download imediato, armazenar expiry |
| Performance do banco | Alto | Baixo | Indexes adequados, query optimization |
| Custos de storage | Médio | Médio | Implementar cleanup, compressão |
| Mudanças no payload do webhook | Alto | Baixo | Armazenar payload completo, versionar handlers |
| Processamento duplicado | Alto | Baixo | Idempotency robusta |

## Dependencies

### Externas
- Meta Cloud API (v21.0+)
- Storage provider (S3/R2 ou filesystem local)
- Redis (para BullMQ se usar background jobs)

### Internas
- Models existentes: Lead, Conversation, Ticket, Message
- MetaWhatsAppCredential (já existe)
- Infraestrutura BullMQ (já existe)
- Prisma ORM (já existe)

## Success Criteria

### Funcionais
- ✅ Processar mensagens de texto com 100% de taxa de sucesso
- ✅ Processar mensagens de mídia com 95%+ de taxa de download
- ✅ Rastrear status updates com 99%+ de precisão
- ✅ Zero processamento duplicado (idempotency)
- ✅ Sempre retornar 200 à Meta (sem retries)

### Performance
- ✅ Processamento de webhook < 500ms (p95)
- ✅ Download de mídia < 5s (p95)
- ✅ Queries de banco < 100ms (p95)
- ✅ Suportar 1000+ webhooks/min

### Confiabilidade
- ✅ 99.9% uptime
- ✅ Retry automático para falhas transitórias
- ✅ Degradação graciosa (falhas de download não bloqueiam processamento)
- ✅ Audit trail completo (todos webhooks armazenados)

## Conclusão

Esta arquitetura de dados específica para Meta Cloud prepara o Whatrack para:

1. **Abandonar APIs não oficiais** sem migração complexa
2. **Suportar todos tipos de mensagem** com handler extensível
3. **Gestão completa de mídia** com tracking de download/storage
4. **Histórico completo** de webhooks e status updates
5. **Debugging robusto** com payloads completos armazenados
6. **Idempotency 100%** com WebhookEventService
7. **Performance otimizada** com indexes adequados
8. **Integração limpa** com sistema existente via bridge

---

**Próximas Ações**:
1. Validar PRD com stakeholders
2. Criar migration Prisma
3. Implementar services core
4. Criar unit/integration tests
5. Deploy gradual em produção
