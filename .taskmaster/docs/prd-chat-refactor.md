# PRD: Refatoração do Chat WhatsApp

## Overview

Refatoração da arquitetura de chat para suportar múltiplas instâncias por organização (cada vendedor com seu número), consolidar models de mensagens e renomear inbox → chat.

**Status**: Em Progresso (Refatoração Inbound→Ticket concluída, Chat renomeação pendente)

---

## Objetivos

1. **Relatórios por vendedor**: Cada instância (número) tem conversas isoladas
2. **Model único de mensagens**: Remover duplicação WhatsappMessage → Message (✅ Concluído)
3. **Nomenclatura consistente**: inbox → chat em todo o código (Em progresso)
4. **Idempotência**: Evitar mensagens duplicadas via providerMessageId
5. **Refatoração Inbound→Ticket**: Renomear modelo Inbound para Ticket (✅ Concluído em 15/12/2025)

---

## Arquitetura

### Modelo de Domínio (Atualizado)

```
Organization (Empresa)
│
├── WhatsappInstance A (Vendedor João)
│   └── Conversation 1 (Lead: Carlos)
│       └── Ticket → Messages
│
├── WhatsappInstance B (Vendedor Maria)
│   └── Conversation 2 (Lead: Carlos)  ← Mesmo lead, instância diferente
│       └── Ticket → Messages
│
└── WhatsappInstance C (Vendedor Pedro)
    └── Conversation 3 (Lead: Ana)
        └── Ticket → Messages
```

### Relacionamentos (Atual)

```
Organization (1) ←──→ (N) Lead
                           │
                           └── (N) Conversation (1) ←──→ (1) WhatsappInstance
                                   │
                                   └── (N) Ticket (1) ←──→ (N) Message
```

**Status Real da Implementação**:
- ❌ `Conversation` é `leadId @unique` (1:1) - deveria ser `@@unique([leadId, instanceId])` (N:N)
- ✅ `Ticket` renomeado de `Inbound` com campos: `status`, `assigneeId`, `resolvedAt`, `followUpEnabled`
- ✅ `Message` consolidado (WhatsappMessage removido) - mas faltam campos críticos
- ⏳ Renomeação `inbox` → `chat` em UI/API (próxima fase)

---

## Mudanças no Schema

### 1. Model Message (Consolidado) ⏳ PARCIALMENTE

```prisma
model Message {
  id       String @id @default(cuid())
  ticketId String
  ticket   Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  senderType MessageSenderType
  senderId   String?
  senderName String?

  messageType String
  content     String?

  mediaUrl  String?
  mediaType String?
  fileName  String?

  status MessageStatus @default(PENDING)

  sentAt      DateTime
  deliveredAt DateTime?
  readAt      DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  @@index([ticketId])
  @@index([sentAt])
  @@map("messages")
}
```

**Status**: ⏳ PARCIALMENTE IMPLEMENTADO
**Campos Implementados**: ✅ ticketId, senderType, messageType, content, mediaUrl, mediaType, fileName, status, sentAt, deliveredAt, readAt
**Campos Faltantes**: ❌ providerMessageId, mediaSizeBytes, mediaDurationSeconds

### 2. Model Conversation (Atualizado) ⏳ PARCIALMENTE

```prisma
model Conversation {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  leadId String @unique
  lead   Lead   @relation(fields: [leadId], references: [id], onDelete: Cascade)

  instanceId String

  status   ConversationStatus   @default(OPEN)
  priority ConversationPriority @default(MEDIUM)

  unreadCount   Int       @default(0)
  lastMessageAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  tickets Ticket[]
  metrics ConversationMetrics?

  @@index([organizationId])
  @@index([instanceId])
  @@index([status])
  @@map("conversations")
}
```

**Status**: ⏳ PARCIALMENTE IMPLEMENTADO
**Campos Implementados**: ✅ organizationId, leadId, instanceId, status, priority, unreadCount, lastMessageAt
**Problema Crítico**: ❌ `leadId @unique` (1:1 com Lead) - deveria ser `@@unique([leadId, instanceId])` para permitir múltiplas conversas por lead em diferentes instâncias

### 3. Model WhatsappMessage (REMOVER) ✅

```prisma
// ✅ DELETADO COMPLETAMENTE
// model WhatsappMessage { ... }
```

**Status**: ✅ Removido do schema Prisma

### 4. Model Ticket (Refatorado de Inbound) ✅

```prisma
model Ticket {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  leadId String?
  lead   Lead?   @relation(fields: [leadId], references: [id], onDelete: SetNull)

  // Tracking UTM e origem
  gclid    String?
  fbclid   String?
  ctwaclid String?

  utmSource   String?
  utmMedium   String?
  utmCampaign String?
  utmTerm     String?
  utmContent  String?

  campaignId String? @map("campaign_id")
  adsetId    String? @map("adset_id")
  adId       String? @map("ad_id")

  sourceType TicketSourceType?
  platformId String?

  lastMessageAt DateTime?
  closedAt      DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  sales            Sale[]
  whatsappMessages WhatsappMessage[]
  events           PlatformEvent[]
  analytics        SalesAnalytics?
  appointments     Appointment[]

  @@index([organizationId])
  @@index([leadId])
  @@index([sourceType])
  @@index([lastMessageAt])
  @@index([campaignId])
  @@index([adsetId])
  @@index([adId])
  @@map("tickets")
}
```

**Status**: ✅ IMPLEMENTADO (com campos extras)
**Implementado**:
- ✅ Renomeado de `Inbound` → `Ticket`
- ✅ Adicionado `organizationId` obrigatório
- ✅ Adicionado `conversationId` para relação com chat
- ✅ Mantidos campos de tracking (UTM, campaign, ads)
- ✅ Mantidos campos de relacionamento (Lead, Sales, Analytics)

**Campos Extras (não planejados no PRD)**:
- ✅ `status`, `assigneeId`, `assigneeName`, `resolvedAt` (para gestão de tickets)
- ✅ `followUpEnabled`, `currentFollowUpStep` (para follow-up automático)
- ✅ `messages[]`, `scheduledMessages[]`, `analysis` (relações)

---

## Estrutura de Arquivos (Renomeação)

### Antes → Depois

```
src/app/dashboard/inbox/                    → src/app/dashboard/chat/
├── page.tsx
└── instance/[instanceId]/page.tsx

src/components/dashboard/inbox/             → src/components/dashboard/chat/
├── index.ts
├── conversation-list/
├── chat/                                   → messages/
└── contact-panel/                          → lead-panel/

src/lib/inbox/                              → src/lib/chat/
├── api.ts
├── types.ts
└── index.ts

src/services/inbox/                         → src/services/chat/
└── index.ts

src/hooks/use-conversations.ts              → src/hooks/use-chat.ts
```

---

## API Routes

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/chat/conversations` | Listar conversas (filtro: instanceId, status) |
| GET | `/api/v1/chat/conversations/[id]` | Detalhes da conversa com lead |
| PATCH | `/api/v1/chat/conversations/[id]` | Atualizar status/prioridade |
| GET | `/api/v1/chat/conversations/[id]/messages` | Listar mensagens (cursor pagination) |
| POST | `/api/v1/chat/conversations/[id]/messages` | Enviar mensagem |

### GET /api/v1/chat/conversations

**Query params:**
- `instanceId` (required): Filtrar por instância
- `status` (optional): OPEN, PENDING, RESOLVED, SNOOZED

**Response:**
```typescript
{
  id: string
  status: ConversationStatus
  priority: ConversationPriority
  unreadCount: number
  lastMessageAt: string | null
  lead: {
    id: string
    name: string | null
    phone: string | null
  }
  lastMessage: {
    content: string
    senderType: MessageSenderType
    sentAt: string
  } | null
}[]
```

### POST /api/v1/chat/conversations/[id]/messages

**Request:**
```typescript
{
  content: string
  messageType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'
  mediaUrl?: string
}
```

**Fluxo interno:**
1. Validar sessão e acesso à conversa
2. Buscar conversation com lead e instance
3. Resolver ticket (encontrar OPEN ou criar novo)
4. Enviar via WuzAPI
5. Criar Message no banco com providerMessageId
6. Publicar no Centrifugo
7. Retornar Message criada

---

## Webhook Handler (Atualizado)

### Fluxo de Recebimento

```
WuzAPI Webhook
     │
     ▼
POST /api/v1/whatsapp/u/webhook/[id]
     │
     ├─ 1. Verificar se providerMessageId já existe
     │      └─ Se sim: ignorar (idempotência)
     │
     ├─ 2. upsertLead(organizationId, remoteJid, phone, name)
     │
     ├─ 3. upsertConversation(organizationId, leadId, instanceId)
     │      └─ Busca por (leadId, instanceId) - não só leadId
     │
     ├─ 4. resolveTicket(conversationId)
     │
     ├─ 5. createMessage({
     │        ticketId,
     │        senderType: 'LEAD',
     │        content,
     │        providerMessageId,     ← NOVO
     │        mediaSizeBytes,        ← NOVO
     │        mediaDurationSeconds,  ← NOVO
     │      })
     │
     ├─ 6. updateConversationLastMessage()
     │
     ├─ 7. publishNewMessage() → Centrifugo
     │
     └─ 8. [REMOVIDO] prisma.whatsappMessage.upsert
```

### Idempotência

```typescript
// Antes de criar a mensagem
const existing = await prisma.message.findUnique({
  where: { providerMessageId: payload.providerMessageId }
})

if (existing) {
  console.log('[webhook] Mensagem já processada, ignorando')
  return NextResponse.json({ ok: true })
}
```

---

## Services

### src/services/chat/index.ts

```typescript
// upsertConversation - ATUALIZADO
export async function upsertConversation(params: {
  organizationId: string
  leadId: string
  instanceId: string
}): Promise<Conversation> {
  const { organizationId, leadId, instanceId } = params

  // Busca por (leadId, instanceId) - não só leadId
  const existing = await prisma.conversation.findUnique({
    where: {
      leadId_instanceId: { leadId, instanceId }
    },
  })

  if (existing) return existing

  return prisma.conversation.create({
    data: {
      organizationId,
      leadId,
      instanceId,
      status: 'OPEN',
      priority: 'MEDIUM',
    },
  })
}

// createMessage - ATUALIZADO
interface CreateMessageParams {
  ticketId: string
  senderType: 'LEAD' | 'USER' | 'AI' | 'SYSTEM'
  senderId?: string | null
  senderName?: string | null
  messageType: string
  content: string
  mediaUrl?: string | null
  mediaType?: string | null
  fileName?: string | null
  providerMessageId?: string | null  // NOVO
  mediaSizeBytes?: number | null     // NOVO
  mediaDurationSeconds?: number | null  // NOVO
  sentAt: Date
}

export async function createMessage(params: CreateMessageParams): Promise<Message> {
  return prisma.message.create({
    data: {
      ticketId: params.ticketId,
      senderType: params.senderType,
      senderId: params.senderId,
      senderName: params.senderName,
      messageType: params.messageType,
      content: params.content,
      mediaUrl: params.mediaUrl,
      mediaType: params.mediaType,
      fileName: params.fileName,
      providerMessageId: params.providerMessageId,
      mediaSizeBytes: params.mediaSizeBytes,
      mediaDurationSeconds: params.mediaDurationSeconds,
      sentAt: params.sentAt,
    },
  })
}
```

---

## Migration

### Prisma Migration

```sql
-- 1. Adicionar novos campos ao Message
ALTER TABLE "messages" ADD COLUMN "provider_message_id" TEXT;
ALTER TABLE "messages" ADD COLUMN "media_size_bytes" INTEGER;
ALTER TABLE "messages" ADD COLUMN "media_duration_seconds" INTEGER;

-- 2. Criar índice único para idempotência
CREATE UNIQUE INDEX "messages_provider_message_id_key" ON "messages"("provider_message_id");

-- 3. Remover constraint único do leadId em Conversation
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_lead_id_key";

-- 4. Adicionar constraint único composto
CREATE UNIQUE INDEX "conversations_lead_id_instance_id_key" ON "conversations"("lead_id", "instance_id");

-- 5. Remover tabela WhatsappMessage
DROP TABLE "whatsapp_message";
```

---

## Tarefas de Implementação

### Fase 0: Refatoração Inbound → Ticket ✅ CONCLUÍDO (15/12/2025)
- [x] Renomear modelo Prisma `Inbound` → `Ticket`
- [x] Adicionar `organizationId` obrigatório ao `Ticket`
- [x] Adicionar `conversationId` ao `Ticket`
- [x] Atualizar todas as referências em código-fonte
- [x] Remover todas as referências a "Inbound" em src/
- [x] Atualizar enums e tipos TypeScript
- [x] Corrigir webhooks (Meta Cloud, WuzAPI)
- [x] Corrigir API routes e services
- [x] Rodar build e validar TypeScript

### Fase 1: Schema ✅ CONCLUÍDO (15/12/2025 - 15:35)
- [x] ✅ Adicionar campos ao Message: `providerMessageId`, `mediaSizeBytes`, `mediaDurationSeconds`
- [x] ✅ Alterar Conversation de `leadId @unique` para `@@unique([leadId, instanceId])`
- [x] ✅ Remover model WhatsappMessage
- [x] ✅ Atualizar relação em Lead: `conversation?` → `conversations[]`
- [x] ✅ Corrigir queries que usam unique composto
- [x] ✅ Rodar prisma generate e validar schema
- [x] ✅ Build passou em TypeScript

### Fase 2: Renomeação (Em Progresso)
- [ ] Renomear src/app/dashboard/inbox → chat
- [ ] Renomear src/components/dashboard/inbox → chat
- [ ] Renomear src/lib/inbox → chat
- [ ] Renomear src/services/inbox → chat
- [ ] Renomear src/hooks/use-conversations.ts → use-chat.ts
- [ ] Atualizar todos os imports

### Fase 3: Services (Pendente)
- [ ] Atualizar upsertConversation para buscar por (leadId, instanceId)
- [ ] Atualizar createMessage com novos campos
- [ ] Atualizar webhook handler (remover WhatsappMessage, adicionar idempotência)

### Fase 4: API Routes (Pendente)
- [ ] Criar GET /api/v1/chat/conversations
- [ ] Criar GET /api/v1/chat/conversations/[id]
- [ ] Criar PATCH /api/v1/chat/conversations/[id]
- [ ] Criar GET /api/v1/chat/conversations/[id]/messages
- [ ] Criar POST /api/v1/chat/conversations/[id]/messages (com integração WuzAPI)

### Fase 5: Frontend (Pendente)
- [ ] Atualizar URLs no api client (lib/chat/api.ts)
- [ ] Integrar useCentrifugo na página do chat
- [ ] Atualizar navegação/menu (Inbox → Chat)

---

## Validação

| Cenário | Resultado Esperado |
|---------|-------------------|
| Mensagem recebida | Salva em Message, aparece no chat em tempo real |
| Webhook duplicado | Ignorado (idempotência via providerMessageId) |
| Mesmo lead, instâncias diferentes | Conversas separadas |
| Enviar mensagem | Chama WuzAPI, salva Message, aparece no chat |
| Filtrar por instância | Mostra apenas conversas daquela instância |

---

## Out of Scope

- Chatbots/automações (ver prd-auto-followup.md)
- IA para sugestões
- Campanhas em massa (ver prd-whatsapp-campaigns.md)
- Grupos do WhatsApp
- Migração de dados de WhatsappMessage para Message (não há dados em produção)

---

## Histórico de Mudanças

### 15/12/2025 - Refatoração Inbound → Ticket Concluída
- ✅ Renomeado modelo Prisma `Inbound` → `Ticket`
- ✅ Adicionado `organizationId` obrigatório (breaking change)
- ✅ Adicionado `conversationId` para relação com chat
- ✅ Atualizado schema Prisma com novos índices
- ✅ Corrigidos webhooks (Meta Cloud, WuzAPI)
- ✅ Corrigidas API routes e services
- ✅ Build passou em TypeScript
- ⏳ Próximo: Renomeação `inbox` → `chat` em UI/API
