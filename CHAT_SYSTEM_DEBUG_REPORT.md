# Relatório de Depuração Completa - Sistema de Chat Whatrack

**Data**: Dezembro 2024
**Status**: Análise concluída - 5 problemas críticos identificados
**Prioridade**: 🔴 CRÍTICA - Requer refatoração

---

## Executivo

A análise completa do sistema de chat (`/dashboard/chat`) revelou uma **arquitetura frontend sólida** mas uma **infraestrutura de dados problemática** no backend. O sistema sofre de **duplicação crítica de dados**, **webhook não funcional** e **lógica duplicada**.

### Problemas Críticos Encontrados

| # | Problema | Severidade | Impacto |
|---|----------|-----------|---------|
| 1 | Duplicação: WhatsappMessage vs Message | 🔴 CRÍTICA | Confusão, inconsistência, código dividido |
| 2 | Webhook não persiste mensagens | 🔴 CRÍTICA | Mensagens recebidas não aparecem |
| 3 | Lógica duplicada (upsertLead/Conversation) | 🟡 ALTA | Inconsistência, manutenção difícil |
| 4 | Campos redundantes no schema | 🟡 ALTA | Violação de 3NF, risco de bugs |
| 5 | Real-time incompleto | 🟡 MÉDIA | Sem atualização em tempo real |

---

## PARTE 1: Modelos de Dados do Sistema

### 1.1 Models Principais do Chat

#### **WhatsappConversation** (Ativo) ✅
```
Localização: prisma/schema.prisma:658-688
Propósito: Thread permanente 1:1 entre Lead e Instância WhatsApp
Status: Em produção

Campos principais:
  - id: String (Primary Key)
  - organizationId: String
  - leadId: String
  - instanceId: String
  - status: ConversationStatus (OPEN | PENDING | RESOLVED | SNOOZED)
  - priority: ConversationPriority (LOW | MEDIUM | HIGH | URGENT)
  - unreadCount: Int
  - lastMessageAt: DateTime?
  - createdAt, updatedAt: DateTime

Constraint Único: @@unique([leadId, instanceId])

Usado em:
  ✓ GET /api/v1/chat/conversations
  ✓ GET /api/v1/chat/conversations/[id]
  ✓ PATCH /api/v1/chat/conversations/[id]
  ✓ POST /api/v1/chat/conversations/[id]/messages
  ✓ Component: ConversationList
  ✓ Component: ContactPanel
```

#### **Message** (Ativo - Sistema Atual) ✅
```
Localização: prisma/schema.prisma:758-791
Propósito: Mensagens dentro de tickets (sistema atual)
Status: Em produção

Campos principais:
  - id: String (Primary Key)
  - ticketId: String (Obrigatório)
  - senderType: MessageSenderType (CONTACT | USER | AI_AGENT | SYSTEM)
  - senderId: String?
  - senderName: String?
  - messageType: MessageType (TEXT | IMAGE | VIDEO | AUDIO | DOCUMENT)
  - content: String? (Texto da mensagem)
  - mediaUrl: String? (URL da mídia)
  - mediaType: String? (ex: image/jpeg)
  - fileName: String?
  - mediaSizeBytes: Int?
  - mediaDurationSeconds: Int?
  - providerMessageId: String? @unique (ID do provider - para idempotência)
  - status: MessageStatus (PENDING | SENT | DELIVERED | READ | FAILED)
  - sentAt: DateTime
  - deliveredAt: DateTime?
  - readAt: DateTime?
  - createdAt, updatedAt: DateTime

Constraint Único: providerMessageId @unique

Usado em:
  ✓ GET /api/v1/chat/conversations/[id]/messages
  ✓ POST /api/v1/chat/conversations/[id]/messages
  ✓ Component: ChatMessage
  ✓ Hook: useMessages()
```

#### **WhatsappMessage** (Legado - DUPLICADO) ❌
```
Localização: prisma/schema.prisma:545-578
Propósito: Sistema antigo de mensagens (duplica Message)
Status: Marcado para remoção no PRD, MAS AINDA EXISTE!

Campos principais:
  - id: String (Primary Key)
  - organizationId: String
  - instanceId: String
  - leadId: String?
  - ticketId: String?
  - remoteJid: String
  - direction: MessageDirection (INBOUND | OUTBOUND)
  - providerMessageId: String (em @@unique composto)
  - messageType: String
  - mediaMimeType: String?
  - mediaType: String?
  - contentText: String?
  - mediaUrl: String?
  - mediaSizeBytes: Int?
  - mediaDurationSeconds: Int?
  - sentAt: DateTime
  - createdAt, updatedAt: DateTime

Usado em:
  ✗ GET /api/v1/leads/[leadId]/messages (API legada)

🔴 PROBLEMA CRÍTICO:
  Campos duplicados com Message:
    - contentText vs content
    - mediaUrl (ambos)
    - mediaMimeType vs mediaType
    - mediaSizeBytes (ambos)
    - mediaDurationSeconds (ambos)
    - providerMessageId (ambos)
    - sentAt (ambos)
```

#### **Ticket** (Ativo)
```
Localização: prisma/schema.prisma:230-294
Propósito: Sessão de atendimento (vincula conversa ao atendimento)
Status: Em produção

Campos principais:
  - id: String (Primary Key)
  - organizationId: String
  - whatsappConversationId: String
  - leadId: String? (🔴 REDUNDANTE)
  - status: TicketStatus (OPEN | RESOLVED | FOLLOW_UP)
  - assigneeId: String?
  - assigneeName: String?
  - lastMessageAt: DateTime? (🔴 DUPLICADO com WhatsappConversation)
  - closedAt: DateTime?
  - followUpEnabled: Boolean
  - currentFollowUpStep: Int
  - Tracking: gclid, fbclid, utm_source, utm_medium, utm_campaign, campaign_id

🔴 PROBLEMAS:
  1. leadId é redundante: já existe em whatsappConversation.leadId
  2. lastMessageAt é duplicado: existe em WhatsappConversation também
```

#### **Lead** (Ativo)
```
Localização: prisma/schema.prisma:207-228
Propósito: Contato/cliente
Status: Em produção

Campos principais:
  - id: String (Primary Key)
  - organizationId: String
  - name: String
  - phone: String?
  - remoteJid: String? (ID do WhatsApp)
  - mail: String?
  - createdAt, updatedAt: DateTime

Constraints Únicos:
  @@unique([organizationId, phone])
  @@unique([organizationId, remoteJid])

Usado em:
  ✓ Service: upsertLead() (3 implementações diferentes)
  ✓ Relacionamento com: WhatsappConversation, Ticket, WhatsappMessage
```

#### **WhatsappInstance** (Ativo)
```
Localização: prisma/schema.prisma:505-522
Propósito: Instância WhatsApp (número de telefone conectado)
Status: Em produção

Campos principais:
  - id: String (Primary Key)
  - organizationId: String
  - instanceId: String
  - token: String
  - label: String?
  - phone: String?
  - provider: String
  - createdAt, updatedAt: DateTime

Usado em:
  ✓ GET /api/v1/instances/with-unread
  ✓ Validação em todas as rotas de chat
```

#### **WhatsappConversationMetrics** (Ativo)
```
Localização: prisma/schema.prisma:728-755
Propósito: Métricas de engajamento da conversa
Status: Em produção

Campos principais:
  - Tempos de resposta (leadAvgResponseTime, agentAvgResponseTime)
  - Contadores (leadMessagesCount, agentMessagesCount)
  - Duração total da conversa
  - Lead score (0-100)
  - Tier: HOT | WARM | COLD | INACTIVE

Usado em:
  ✓ GET /api/v1/conversations/[id]/metrics
  ✓ Component: MetricsAccordion
```

---

## PARTE 2: Arquitetura do Sistema de Chat

### 2.1 Fluxo de Componentes (Frontend)

```
/dashboard/chat (Roteador)
  └─ Função: useInstancesWithUnread() → GET /api/v1/instances/with-unread
  └─ Se há instâncias: router.replace() para /dashboard/chat/instance/{id}

/dashboard/chat/instance/[instanceId] (Página Principal)
  │
  ├─ ResizablePanel (25% - Esquerda)
  │  └─ ConversationList
  │     ├─ Hook: useConversations(filters)
  │     │  └─ GET /api/v1/chat/conversations?instanceId={id}
  │     └─ ConversationItem (múltiplos)
  │        ├─ Avatar com iniciais
  │        ├─ Preview de última mensagem
  │        ├─ Badge com contagem não lidas
  │        └─ Formatação inteligente de data
  │
  ├─ ResizableHandle
  ├─ ResizablePanel (50% - Centro)
  │  └─ ChatArea (ou EmptyChatState)
  │     ├─ Header (nome, instância, ConnectionStatus)
  │     ├─ Messages Area (auto-scroll)
  │     │  ├─ Hook: useConversation(id)
  │     │  │  └─ GET /api/v1/chat/conversations/{id}
  │     │  ├─ Hook: useMessages(id)
  │     │  │  └─ GET /api/v1/chat/conversations/{id}/messages
  │     │  └─ ChatMessage (múltiplos)
  │     │     ├─ Avatar + Iniciais
  │     │     ├─ Timestamp formatado
  │     │     ├─ Status Indicator (PENDING, SENT, DELIVERED, READ, FAILED)
  │     │     ├─ Suporte a múltiplos tipos (TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT)
  │     │     └─ Botão Copiar (no hover)
  │     └─ ChatInput
  │        ├─ Textarea auto-expandível
  │        ├─ Enter para enviar, Shift+Enter para quebra de linha
  │        ├─ Hook: useSendMessage()
  │        │  └─ POST /api/v1/chat/conversations/{id}/messages
  │        └─ Invalidações: messages, conversation detail, list
  │
  ├─ ResizableHandle
  └─ ResizablePanel (25% - Direita)
     └─ ContactPanel
        ├─ Avatar do contato (80x80)
        ├─ Nome + Telefone
        ├─ Info instância + Data criação
        ├─ Status e Prioridade (badges)
        ├─ Botões (Resolver/Reabrir)
        │  └─ Hook: useUpdateConversation()
        │     └─ PATCH /api/v1/chat/conversations/{id}
        └─ MetricsAccordion
           ├─ Hook: useConversationMetrics(id)
           │  └─ GET /api/v1/conversations/{id}/metrics
           ├─ Lead Score (0-100) com barra de progresso
           │  └─ Fatores: engagement, response speed, content quality, recency
           ├─ Contagem de mensagens (Total, Lead, Agent)
           ├─ Tempos de resposta
           ├─ Duração total
           └─ Botão Recalcular Métricas
              └─ Hook: useRecalculateMetrics()
                 └─ POST /api/v1/conversations/{id}/metrics
```

### 2.2 Fluxo de Dados (Backend)

#### Ao Enviar Mensagem:
```
1. Frontend: ChatInput → handleSend(content)
   ↓
2. Frontend: onSend callback → handleSendMessage(content)
   ↓
3. Frontend: useSendMessage() mutation
   ↓
4. API: POST /api/v1/chat/conversations/{id}/messages
   ├─ Validar conversationId
   ├─ Busca WhatsappConversation + Lead
   ├─ Busca WhatsappInstance
   ├─ resolveTicket(conversationId)
   │  ├─ Busca Ticket com status='OPEN'
   │  └─ Se não existe: cria novo Ticket (organizationId, whatsappConversationId, leadId, status='OPEN')
   ├─ createMessage()
   │  └─ prisma.message.create({
   │       ticketId, senderType='USER', senderId, senderName,
   │       content, messageType='TEXT', status='PENDING', sentAt
   │     })
   ├─ sendWhatsappMessage() → UAZAPI (integração externa)
   ├─ Update WhatsappConversation.lastMessageAt
   ├─ ❌ FALTA: publishNewMessage() → Centrifugo (real-time)
   └─ Retorna Message criada
   ↓
5. Frontend: React Query onSuccess
   ├─ Invalida: ["conversations", "detail", conversationId, "messages"]
   ├─ Invalida: ["conversations", "detail", conversationId]
   ├─ Invalida: ["conversations", "list"]
   └─ UI atualiza + auto-scroll
```

#### Ao Receber Mensagem (Webhook):
```
1. WuzAPI envia webhook
   ↓
2. API: POST /api/v1/whatsapp/instances/[id]/webhook/[webhookId]
   ↓
3. ❌ APENAS FAZ LOG (console.log) - NÃO PERSISTE!
   ├─ Deveria fazer:
   ├─ Verificar providerMessageId (idempotência)
   ├─ upsertLead()
   ├─ upsertConversation()
   ├─ resolveTicket()
   ├─ createMessage() → Message
   ├─ Update WhatsappConversation.lastMessageAt
   ├─ publishNewMessage() → Centrifugo
   └─ ❌ REMOVER: Salvar em WhatsappMessage (legado)
   ↓
4. ❌ Resultado: Mensagens recebidas NÃO aparecem no chat!
```

#### Ao Atualizar Conversa (Resolve/Reopens):
```
1. Frontend: ContactPanel → handleStatusChange(status)
   ↓
2. Frontend: useUpdateConversation() mutation
   ↓
3. API: PATCH /api/v1/chat/conversations/{id}
   ├─ Validar conversationId
   ├─ Busca WhatsappConversation
   ├─ Update conversation (status, priority, assigneeId)
   ├─ ❌ FALTA: publishConversationUpdated() → Centrifugo
   └─ Retorna conversation atualizada
   ↓
4. Frontend: React Query onSuccess
   ├─ Invalida: ["conversations", "list"]
   ├─ Invalida: ["conversations", "detail", id]
   └─ UI atualiza
```

### 2.3 Relacionamentos Entre Models

```
Organization (1)
│
├─ WhatsappConversation (N)
│  ├─ Lead (1)
│  │  ├─ name: String
│  │  ├─ phone: String? @unique
│  │  └─ remoteJid: String? @unique
│  │
│  ├─ WhatsappInstance (1) via instanceId
│  │  ├─ label: String?
│  │  └─ phone: String?
│  │
│  ├─ Ticket (N)
│  │  ├─ leadId: String? (🔴 REDUNDANTE)
│  │  │
│  │  ├─ Message (N)
│  │  │  ├─ senderType: CONTACT | USER | AI_AGENT | SYSTEM
│  │  │  ├─ messageType: TEXT | IMAGE | VIDEO | AUDIO | DOCUMENT
│  │  │  ├─ status: PENDING | SENT | DELIVERED | READ | FAILED
│  │  │  └─ [providerMessageId @unique]
│  │  │
│  │  ├─ WhatsappMessage (N) (🔴 LEGADO - DUPLICA Message)
│  │  │  └─ direction: INBOUND | OUTBOUND
│  │  │
│  │  ├─ ScheduledMessage (N)
│  │  │  └─ Para follow-up agendado
│  │  │
│  │  └─ TicketAnalysis (1)
│  │     └─ Análise de IA
│  │
│  └─ WhatsappConversationMetrics (1)
│     ├─ leadAvgResponseTime: Int?
│     ├─ agentAvgResponseTime: Int?
│     ├─ leadMessagesCount: Int
│     ├─ agentMessagesCount: Int
│     ├─ conversationDuration: Int?
│     ├─ score: Int (0-100)
│     └─ tier: HOT | WARM | COLD | INACTIVE
│
└─ Lead (N)
   ├─ WhatsappConversation (N)
   ├─ Ticket (N)
   └─ WhatsappMessage (N) (🔴 LEGADO)
```

---

## PARTE 3: Problemas Identificados

### 3.1 🔴 CRÍTICO: Duplicação WhatsappMessage vs Message

#### Situação
Existem **DUAS tabelas** armazenando mensagens com funcionalidades quase idênticas.

#### Evidência
- `Message` (linhas 758-791): Tabela ativa, usada no chat principal
- `WhatsappMessage` (linhas 545-578): Tabela legada, marcada para remoção no PRD, mas ainda existe

#### Campos Duplicados
| Campo | WhatsappMessage | Message | Função |
|-------|-----------------|---------|--------|
| `contentText` | ✓ | `content` | Texto da mensagem |
| `mediaUrl` | ✓ | ✓ | URL da mídia |
| `mediaMimeType` | ✓ | `mediaType` | Tipo de mídia |
| `mediaSizeBytes` | ✓ | ✓ | Tamanho em bytes |
| `mediaDurationSeconds` | ✓ | ✓ | Duração (áudio/vídeo) |
| `providerMessageId` | ✓ | ✓ | ID do provider (idempotência) |
| `sentAt` | ✓ | ✓ | Timestamp de envio |

#### Impacto
- ❌ Confusão sobre qual tabela usar
- ❌ Código dividido entre dois sistemas
- ❌ Risco de inconsistência de dados
- ❌ API legada mantém `WhatsappMessage`: `/api/v1/leads/[leadId]/messages`
- ❌ Queries duplicadas, índices duplicados
- ❌ Histórico fragmentado

#### Evidência no Código
```typescript
// Arquivo: src/services/chat/service.ts
// Usa Message ✓
await prisma.message.create({ ... })

// Arquivo: src/app/api/v1/leads/[leadId]/messages/route.ts
// Usa WhatsappMessage ✗
const messages = await prisma.whatsappMessage.findMany({ ... })
```

#### Solução Recomendada
1. Confirmar que `Message` tem todos os campos necessários
2. Migrar dados históricos de `WhatsappMessage` para `Message`
3. Remover API legada `/api/v1/leads/[leadId]/messages`
4. Remover model `WhatsappMessage` do schema
5. Atualizar PRD como concluído

---

### 3.2 🔴 CRÍTICO: Webhook Não Persiste Mensagens

#### Situação
Webhook apenas loga eventos, não salva mensagens recebidas do WhatsApp.

#### Localização
`src/app/api/v1/whatsapp/instances/[id]/webhook/[webhookId]/route.ts` linhas 53-75

#### Código Atual
```typescript
// ❌ APENAS LOGA
console.log('📱 Message received:', {
  type: body.type,
  phone: body.data?.phone,
  message: body.data?.message,
});
```

#### Fluxo Esperado (segundo PRD)
```
WuzAPI Webhook → POST /webhook
  ↓
1. ✓ Receber event payload
2. ✓ Validar assinatura (já faz)
3. ❌ Verificar idempotência (providerMessageId)
4. ❌ upsertLead()
5. ❌ upsertConversation()
6. ❌ resolveTicket()
7. ❌ createMessage() → Message
8. ❌ Update WhatsappConversation.lastMessageAt
9. ❌ publishNewMessage() → Centrifugo
10. ❌ REMOVER: Salvar em WhatsappMessage
```

#### Fluxo Atual
```
WuzAPI Webhook → POST /webhook
  ↓
❌ console.log() ... NADA!
```

#### Impacto
- ❌ Mensagens recebidas do WhatsApp **NÃO aparecem** no chat
- ❌ Sistema apenas **recebe** mensagens, não exibe
- ❌ Dados totalmente perdidos
- ❌ Chat não funciona bidirecional

#### Critérios de Aceite para Corrigir
- ✓ Mensagens recebidas aparecem no chat
- ✓ Idempotência garantida (duplicatas ignoradas)
- ✓ Logs estruturados para debugging
- ✓ Retry logic para falhas

---

### 3.3 🟡 ALTA: Lógica Duplicada em Múltiplos Arquivos

#### 3.3.1 `upsertLead()` - 3 Implementações

**Implementação 1**: `src/services/chat/index.ts` linhas 27-65
```typescript
// Atualiza name E remoteJid se não existirem
export async function upsertLead(
  phone: string,
  remoteJid?: string,
  name?: string,
  organizationId?: string
) {
  // ... lógica específica
}
```

**Implementação 2**: `src/services/chat/service.ts` linhas 53-84
```typescript
// Atualiza apenas name se não existir
export async function upsertLead(
  phone: string,
  organizationId: string,
  name?: string
) {
  // ... lógica diferente
}
```

**Implementação 3**: `src/services/chat/contact-service.ts` linhas 20-51
```typescript
// Função findOrCreateContact, atualiza name se diferente
export async function findOrCreateContact(
  phone: string,
  name?: string,
  organization: string
) {
  // ... outra lógica
}
```

**Problema**: Comportamentos **inconsistentes**
- Uma atualiza `remoteJid`, a outra não
- Uma atualiza `name` se diferente, a outra se não existir
- Difícil saber qual usar, qual é a "correta"

#### 3.3.2 `upsertConversation()` - 3 Implementações

**Implementação 1**: `src/services/chat/index.ts` linhas 77-106
```typescript
// Busca por leadId_instanceId
const conversation = await prisma.whatsappConversation.findUnique({
  where: { leadId_instanceId: { leadId, instanceId } }
})
```

**Implementação 2**: `src/services/chat/service.ts` linhas 94-119
```typescript
// Também busca por leadId_instanceId
const conversation = await prisma.whatsappConversation.findUnique({
  where: { leadId_instanceId: { leadId, instanceId } }
})
```

**Implementação 3**: `src/services/chat/conversation-service.ts` linhas 19-53
```typescript
// Busca por leadId + tem lógica de reabrir resolvidas
const conversation = await prisma.whatsappConversation.findFirst({
  where: { leadId, instanceId }
})
// + Lógica para reabrir conversas RESOLVED
```

**Problema**: Código duplicado, difícil de manter

#### 3.3.3 Busca de Instance Repetida em Todas Rotas

```typescript
// Este código aparece em PELO MENOS 3 locais:

// 1. /api/v1/chat/conversations/[id]/route.ts linhas 62-73
const instance = await prisma.whatsappInstance.findFirst({
  where: {
    instanceId: conversation.instanceId,
    organizationId: organization.id,
  },
  select: { id, instanceId, label, phone }
})

// 2. /api/v1/chat/conversations/[id]/route.ts linhas 152-163
const instance = await prisma.whatsappInstance.findFirst({
  where: {
    instanceId: conversation.instanceId,
    organizationId: organization.id,
  },
  select: { id, instanceId, label, phone }
})

// 3. /api/v1/chat/conversations/[id]/messages/route.ts linhas 162-167
const instance = await prisma.whatsappInstance.findFirst({
  where: {
    instanceId: conversation.instanceId,
    organizationId: organization.id,
  },
  select: { id, instanceId, label, phone }
})
```

**Problema**: Violação DRY (Don't Repeat Yourself)

#### Solução Recomendada
1. Consolidar em `/services/chat/conversation-service.ts`
2. Uma única implementação de `upsertLead()` com documentação clara
3. Uma única implementação de `upsertConversation()`
4. Helper `getInstanceByConversation()` para queries de instance
5. Remover duplicatas de `index.ts` e `service.ts`
6. Testes unitários para edge cases

---

### 3.4 🟡 ALTA: Campos Redundantes no Schema

#### 3.4.1 `Ticket.leadId` é Redundante

**Situação**:
```typescript
model Ticket {
  leadId: String? // ❌ REDUNDANTE
  lead: Lead? @relation(...)

  whatsappConversationId: String // ✅ OBRIGATÓRIO
  whatsappConversation: WhatsappConversation @relation(...)
}
```

**Análise**:
O `leadId` pode ser derivado de:
```typescript
Ticket
  → whatsappConversationId
  → WhatsappConversation
  → leadId
  → Lead
```

**Problema**:
- ❌ Viola 3ª Forma Normal (3NF) - Dependência transitiva
- ❌ Risco: `Ticket.leadId` pode divergir de `Ticket.whatsappConversation.leadId`
- ❌ Dados desnormalizados sem necessidade
- ❌ Duplicação de coluna no banco

**Exemplo de Inconsistência Possível**:
```typescript
const ticket = {
  leadId: "lead-123",
  whatsappConversationId: "conv-456",
  whatsappConversation: {
    leadId: "lead-789" // ❌ DIFERENTE!
  }
}
```

#### 3.4.2 `lastMessageAt` Duplicado

**Localização**:
- `WhatsappConversation.lastMessageAt` (linha 673)
- `Ticket.lastMessageAt` (linha 259)

**Análise**:
```typescript
// Faz sentido:
WhatsappConversation.lastMessageAt // Última mensagem na conversa

// Redundante:
Ticket.lastMessageAt // Poderia ser derivado de:
  Ticket → Message[] → max(sentAt)
```

**Problema**:
- ❌ Necessário atualizar em dois lugares (risco de inconsistência)
- ❌ Query precisa escolher qual usar
- ❌ Violação de DRY

#### Solução Recomendada

**Para `Ticket.leadId`**:
```prisma
model Ticket {
  // ❌ REMOVER:
  // leadId String?
  // lead   Lead?   @relation(...)

  // ✅ MANTER:
  whatsappConversationId String
  whatsappConversation   WhatsappConversation @relation(...)

  // Acesso ao lead via:
  // ticket.whatsappConversation.lead
}

// Em código TypeScript:
const lead = ticket.whatsappConversation.lead
```

**Para `lastMessageAt`**:
- Opção A: Remover de `Ticket`, calcular dinamicamente quando necessário
- Opção B: Manter apenas em `WhatsappConversation`, remover de `Ticket`

---

### 3.5 🟡 MÉDIA: Real-time Incompleto

#### Situação
Sistema preparado para real-time (WebSocket com Centrifugo), mas não implementado.

#### Frontend - Preparação Incompleta
```typescript
// Arquivo: src/app/dashboard/chat/instance/[instanceId]/page.tsx

// ❌ Hardcoded
const isConnected = true;
const connectionError = null;

// ✓ Buscado mas não usado
const { data: organization } = useOrganization();
// Deveria usar: organization.id para namespace
```

#### Backend - Faltando Publicações

**Em POST `/api/v1/chat/conversations/[id]/messages`**:
```typescript
// ✓ Cria mensagem
await prisma.message.create({ ... })

// ❌ FALTA: Publicar evento
// await publishNewMessage({
//   channel: `chat:org:${organization.id}`,
//   data: { ... }
// })
```

**Em PATCH `/api/v1/chat/conversations/[id]`**:
```typescript
// ✓ Atualiza conversa
await prisma.whatsappConversation.update({ ... })

// ❌ FALTA: Publicar evento
// await publishConversationUpdated({
//   channel: `chat:org:${organization.id}`,
//   data: { ... }
// })
```

#### Endpoint de Token Existe
```typescript
// GET /api/v1/chat/centrifugo/token (funciona)
// Gera token JWT para conexão WebSocket ao Centrifugo
```

#### Impacto
- ❌ Chat não atualiza em tempo real
- ❌ Necessário refresh manual da página
- ❌ Múltiplos atendentes não veem mensagens uns dos outros
- ❌ Métricas não atualizam em tempo real

#### Solução Recomendada
1. Frontend: Conectar ao Centrifugo com token
2. Frontend: Subscrever ao canal `chat:org:{organizationId}`
3. Frontend: Implementar handlers para `newMessage` e `conversationUpdated`
4. Backend: Publicar em POST de mensagem
5. Backend: Publicar em PATCH de conversa
6. Backend: Publicar em webhook de mensagem recebida
7. Frontend: Atualizar `isConnected` com estado real do WebSocket

---

## PARTE 4: Análise de Normalização

### 4.1 Violações de Forma Normal

#### 3ª Forma Normal (3NF) - VIOLADA ❌
```
Violação: Ticket.leadId

Regra 3NF: Nenhum atributo não-chave é funcionalmente dependente
de outro atributo não-chave.

Violação detectada:
  leadId → name, phone (atributos de Lead)

Mas leadId também pode ser derivado de:
  Ticket.whatsappConversationId → whatsappConversation.leadId
```

#### 2ª Forma Normal (2NF) - RESPEITADA ✓
Sem dependências parciais em chaves compostas.

#### 1ª Forma Normal (1NF) - RESPEITADA ✓
Valores atômicos, sem listas/arrays.

### 4.2 Desnormalização Intencional (Aceitável)

Alguns campos desnormalizados **intencionalmente** para performance:
- `Ticket.assigneeName` - Cache do nome do atendente
- `WhatsappConversation.unreadCount` - Contador agregado
- `WhatsappConversation.lastMessageAt` - Cache do timestamp

**Recomendação**: Manter, mas requer triggers para manutenção.

---

## PARTE 5: Recomendações de Refatoração

### Fase 1: Consolidação de Mensagens (CRÍTICO)
**Objetivo**: Eliminar duplicação WhatsappMessage vs Message
**Complexidade**: Alta
**Risco**: Médio
**Prioridade**: 🔴 Crítica

**Checklist**:
- [ ] Confirmar Message tem todos os campos
- [ ] Migrar dados de WhatsappMessage → Message
- [ ] Deprecar API `/api/v1/leads/[leadId]/messages`
- [ ] Remover model WhatsappMessage
- [ ] Atualizar PRD

---

### Fase 2: Implementar Webhook Funcional (CRÍTICO)
**Objetivo**: Receber e persistir mensagens do WhatsApp
**Complexidade**: Média
**Risco**: Alto
**Prioridade**: 🔴 Crítica

**Checklist**:
- [ ] Implementar persistência no webhook
- [ ] Verificar idempotência (providerMessageId)
- [ ] Chamar upsertLead()
- [ ] Chamar upsertConversation()
- [ ] Chamar resolveTicket()
- [ ] Criar Message no banco
- [ ] Publicar no Centrifugo
- [ ] Testes para cada tipo de mensagem

---

### Fase 3: Consolidar Lógica Duplicada (IMPORTANTE)
**Objetivo**: Eliminar múltiplas implementações
**Complexidade**: Média
**Risco**: Baixo
**Prioridade**: 🟡 Importante

**Checklist**:
- [ ] Consolidar upsertLead()
- [ ] Consolidar upsertConversation()
- [ ] Criar helper getInstanceByConversation()
- [ ] Remover duplicatas
- [ ] Atualizar imports
- [ ] Testes unitários

---

### Fase 4: Limpar Redundâncias (IMPORTANTE)
**Objetivo**: Remover campos redundantes
**Complexidade**: Alta
**Risco**: Médio
**Prioridade**: 🟡 Importante

**Checklist**:
- [ ] Remover Ticket.leadId (migration)
- [ ] Consolidar lastMessageAt
- [ ] Adicionar índices compostos
- [ ] Testar queries

---

### Fase 5: Implementar Real-time (MELHORIA)
**Objetivo**: Chat atualizando em tempo real
**Complexidade**: Média
**Risco**: Médio
**Prioridade**: 🟢 Melhoria

**Checklist**:
- [ ] Conectar ao Centrifugo (frontend)
- [ ] Subscrever ao canal (frontend)
- [ ] Implementar handlers (frontend)
- [ ] Publicar ao enviar (backend)
- [ ] Publicar ao resolver (backend)
- [ ] Publicar no webhook (backend)

---

### Fase 6: Testes e Validação
**Objetivo**: Garantir funcionamento
**Complexidade**: Baixa
**Risco**: Baixo
**Prioridade**: 🟢 Validação

**Checklist**:
- [ ] Enviar mensagem → aparece no chat
- [ ] Receber via webhook → aparece no chat
- [ ] Resolver conversa → atualiza em tempo real
- [ ] Múltiplos clientes → todos recebem atualizações
- [ ] Webhook duplicado → idempotência
- [ ] Performance: 1000 conversas < 500ms
- [ ] Performance: 100 mensagens < 200ms

---

## PARTE 6: Tabela de Referência - Endpoints

| Método | Endpoint | Model | Status | Issue |
|--------|----------|-------|--------|-------|
| GET | `/api/v1/chat/conversations` | WhatsappConversation | ✓ | - |
| GET | `/api/v1/chat/conversations/[id]` | WhatsappConversation | ✓ | - |
| PATCH | `/api/v1/chat/conversations/[id]` | WhatsappConversation | ✓ | Sem real-time |
| GET | `/api/v1/chat/conversations/[id]/messages` | Message | ✓ | Limite 7 dias hardcoded |
| POST | `/api/v1/chat/conversations/[id]/messages` | Ticket, Message | ✓ | Sem real-time, sem webhook |
| POST | `/api/v1/whatsapp/instances/[id]/webhook/[webhookId]` | - | ❌ | Apenas loga, não persiste |
| GET | `/api/v1/conversations/[id]/metrics` | WhatsappConversationMetrics | ✓ | - |
| POST | `/api/v1/conversations/[id]/metrics` | WhatsappConversationMetrics | ✓ | - |
| GET | `/api/v1/leads/[leadId]/messages` | WhatsappMessage | ❌ | LEGADO - duplicado |
| GET | `/api/v1/chat/centrifugo/token` | - | ✓ | Real-time não implementado |

---

## PARTE 7: Arquivos Críticos

### Frontend
- `src/app/dashboard/chat/page.tsx` - Roteador
- `src/app/dashboard/chat/instance/[instanceId]/page.tsx` - Página principal
- `src/components/dashboard/chat/conversation-list/` - Lista de conversas
- `src/components/dashboard/chat/chat/` - Área de chat
- `src/components/dashboard/chat/contact-panel/` - Painel lateral
- `src/hooks/use-conversations.ts` - React Query hooks

### Backend - APIs
- `src/app/api/v1/chat/conversations/route.ts` - GET lista
- `src/app/api/v1/chat/conversations/[id]/route.ts` - GET/PATCH detalhes
- `src/app/api/v1/chat/conversations/[id]/messages/route.ts` - GET/POST mensagens
- `src/app/api/v1/whatsapp/instances/[id]/webhook/[webhookId]/route.ts` - **CRÍTICO**
- `src/app/api/v1/conversations/[id]/metrics/route.ts` - Métricas
- `src/app/api/v1/leads/[leadId]/messages/route.ts` - **LEGADO**

### Backend - Services
- `src/services/chat/index.ts` - Duplicada ❌
- `src/services/chat/service.ts` - Duplicada ❌
- `src/services/chat/conversation-service.ts` - **Consolidar aqui**
- `src/services/chat/message-service.ts` - Criar mensagens
- `src/services/chat/contact-service.ts` - Duplicada ❌

### Database
- `prisma/schema.prisma` - Schema (linhas 545-791)

---

## PARTE 8: Impacto em Produção

### Funcionalidades Afetadas

| Funcionalidade | Status | Impacto |
|---|---|---|
| Enviar mensagem | ✓ Funciona | OK |
| Receber mensagem | ❌ Não funciona | CRÍTICO |
| Ver conversa | ✓ Funciona | OK |
| Resolver conversa | ✓ Funciona | OK |
| Real-time (múltiplos clientes) | ❌ Não funciona | IMPORTANTE |
| Métricas | ✓ Funciona | OK |
| Histórico (7 dias) | ✓ Funciona | OK |

### Risco de Data Loss
- ❌ **ALTO**: Webhook não persiste = mensagens recebidas perdidas
- ⚠️ **MÉDIO**: Duplicação de dados = possível inconsistência
- ✓ **BAIXO**: Outros dados preservados

---

## PARTE 9: Conclusão e Próximos Passos

### Resumo dos Problemas

A análise identificou **5 problemas críticos**:

1. **Duplicação de Dados** (WhatsappMessage vs Message)
   - Impacto: Confusão, inconsistência, código complexo
   - Solução: Consolidar em Message, remover WhatsappMessage

2. **Webhook Não Funcional** (apenas loga)
   - Impacto: Mensagens recebidas perdidas
   - Solução: Implementar persistência completa

3. **Lógica Duplicada** (3 implementações de funções)
   - Impacto: Inconsistência, manutenção difícil
   - Solução: Consolidar em um único service

4. **Campos Redundantes** (leadId, lastMessageAt)
   - Impacto: Violação de 3NF, risco de bugs
   - Solução: Remover redundâncias, normalizar schema

5. **Real-time Incompleto** (sem Centrifugo)
   - Impacto: Sem atualização em tempo real
   - Solução: Implementar publicações no Centrifugo

### Recomendação de Ação

**Prioridade 1 (URGENTE)**: Implementar webhook funcional
- Mensagens recebidas não estão aparecendo
- Impacto crítico no produto

**Prioridade 2 (IMPORTANTE)**: Consolidar sistema de mensagens
- Eliminar WhatsappMessage
- Simplificar lógica

**Prioridade 3 (MELHORIA)**: Refatorar serviços e schema
- Remover duplicações
- Normalizar dados

---

## Apêndice: Glossário de Termos

- **WhatsappConversation**: Thread permanente entre Lead e Instância
- **Ticket**: Sessão de atendimento (pode haver múltiplos por conversa)
- **Message**: Mensagem individual em um ticket
- **Lead**: Contato/cliente
- **Instance**: Número de WhatsApp conectado
- **senderType**: Quem enviou (CONTACT, USER, AI_AGENT, SYSTEM)
- **messageType**: Tipo de conteúdo (TEXT, IMAGE, VIDEO, etc.)
- **providerMessageId**: ID único da mensagem no provedor (WhatsApp)
- **Idempotência**: Garantia de que operação duplicada não cria duplicatas
- **Real-time**: Atualização instantânea via WebSocket

---

**Fim do Relatório**
Gerado: Dezembro 2024
Sistema: Whatrack Chat
Status: Requer Refatoração Crítica
