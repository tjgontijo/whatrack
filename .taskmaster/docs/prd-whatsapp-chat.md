# PRD: WhatsApp Chat Interface

## Overview

Interface de chat estilo WhatsApp Web para comunicação 1:1 com leads. Utiliza WuzAPI como provider principal (self-hosted, sem restrições de mensagens).

**Status**: Parcialmente implementado - requer migração PartyKit → Centrifugo + consolidação de models.

---

## Arquitetura de Dados

### Modelo de Domínio

```
Lead (1) ←──→ (1) Conversation (1) ←──→ (N) Ticket (1) ←──→ (N) Message
  │                    │                      │
  │                    │                      ├── TicketAnalysis (1:1)
  │                    │                      └── ScheduledMessage (1:N)
  │                    │
  │                    └── ConversationMetrics (1:1)
  │
  ├── firstSource (primeira origem do Lead)
  │
  └── Ticket.source (origem de cada sessão)
```

### Atribuição de Origem (Multi-Touch)

| Campo | Model | Descrição |
|-------|-------|-----------|
| `firstSource`, `firstCampaign`, `firstMedium` | **Lead** | Primeira origem (first touch) |
| `source`, `campaign`, `medium` | **Ticket** | Origem daquela sessão específica |

**Exemplo de jornada:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Lead: João (phone: +5511999999999)                                 │
│  firstSource: "meta_ads"                                            │
│  firstCampaign: "black_friday_2024"                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Ticket #1 (Jan/2024)          Ticket #2 (Abr/2024)                 │
│  ├─ source: "meta_ads"         ├─ source: "google_ads"              │
│  ├─ campaign: "black_friday"   ├─ campaign: "remarketing"           │
│  ├─ status: RESOLVED           ├─ status: RESOLVED                  │
│  └─ outcome: "lost_price"      └─ outcome: "lost_timing"            │
│                                                                      │
│  Ticket #3 (Set/2024)                                               │
│  ├─ source: "organic"                                               │
│  ├─ campaign: null                                                  │
│  ├─ status: RESOLVED                                                │
│  └─ outcome: "sale" ✅                                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Análise possível:**
- First touch: Meta Ads (Black Friday)
- Last touch: Orgânico
- Jornada completa: 3 tickets em 9 meses até conversão

### Conceitos Principais

| Entidade | Descrição |
|----------|-----------|
| **Lead** | Contato do cliente (phone, name, origem UTM) |
| **Conversation** | Thread permanente 1:1 com o Lead |
| **Ticket** | Sessão de atendimento (antes chamado "Inbound") |
| **Message** | Mensagem dentro de um Ticket |

### Ciclo de Vida do Ticket

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CICLO DO TICKET                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Lead envia mensagem                                                 │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────────┐                                                │
│  │ Ticket existe   │──── Sim ───► Usa ticket existente              │
│  │ e está OPEN?    │                                                │
│  └────────┬────────┘                                                │
│           │ Não                                                      │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │ Cria novo       │                                                │
│  │ Ticket (OPEN)   │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    TICKET ABERTO                             │    │
│  │                                                              │    │
│  │  - Recebe mensagens do Lead e do Atendente                  │    │
│  │  - Follow-up automático pode ser ativado                    │    │
│  │  - Análise AI pode ser executada                            │    │
│  │                                                              │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                        │
│           ┌─────────────────┼─────────────────┐                     │
│           │                 │                 │                      │
│           ▼                 ▼                 ▼                      │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐             │
│   │ Follow-up     │ │ Inatividade   │ │ Fechamento    │             │
│   │ completo      │ │ (tempo X)     │ │ manual        │             │
│   └───────┬───────┘ └───────┬───────┘ └───────┬───────┘             │
│           │                 │                 │                      │
│           └─────────────────┼─────────────────┘                     │
│                             │                                        │
│                             ▼                                        │
│                    ┌─────────────────┐                              │
│                    │ Ticket RESOLVED │                              │
│                    └─────────────────┘                              │
│                                                                      │
│  * Próxima mensagem do Lead → Cria NOVO Ticket                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Status do Ticket

| Status | Descrição |
|--------|-----------|
| `OPEN` | Ticket ativo, recebendo mensagens |
| `FOLLOW_UP` | Em sequência de follow-up automático |
| `RESOLVED` | Fechado (venda, perda, abandono) |

### Regras de Fechamento

O fechamento do Ticket é definido no **PRD de Follow-up** (`prd-auto-followup.md`):

1. **Follow-up completo**: Todas as etapas do follow-up foram executadas sem resposta
2. **Inatividade**: Tempo X sem interação (configurável por organização)
3. **Manual**: Atendente fecha o ticket
4. **Venda**: Ticket marcado como ganho

---

## Models Legados (Remover)

### ❌ WhatsappMessage

**Problema**: Duplicação de dados - mensagens são salvas em `Message` E `WhatsappMessage`.

**Ação**: Remover persistência duplicada do webhook e deprecar model.

```typescript
// REMOVER do webhook (src/app/api/v1/whatsapp/w/webhook/[id]/route.ts):
// await prisma.whatsappMessage.upsert({...})
```

### ⚠️ Inbound

**Problema**: Conceito substituído por `Ticket`.

**Ação**: 
- Migrar dados de **primeira origem** para `Lead` (first touch)
- Migrar dados de **cada sessão** para `Ticket` (multi-touch)
- Remover model após migração

---

## Código Existente (Reutilizar)

### Estrutura de Arquivos

```
src/app/dashboard/inbox/
├── page.tsx                              # Redireciona para primeira instância
└── instance/[instanceId]/page.tsx        # Inbox completo (3 colunas resizable)

src/components/dashboard/inbox/
├── index.ts                              # Barrel exports
├── conversation-list/
│   ├── conversation-list.tsx             # ✅ Reutilizar
│   └── conversation-item.tsx             # ✅ Reutilizar
├── chat/
│   ├── chat-input.tsx                    # ✅ Reutilizar
│   ├── chat-message.tsx                  # ✅ Reutilizar
│   └── connection-status.tsx             # ✅ Reutilizar
└── contact-panel/
    └── contact-panel.tsx                 # ⚠️ Renomear para lead-panel

src/hooks/
├── use-conversations.ts                  # ✅ Reutilizar (React Query)
└── use-inbox-socket.ts                   # ❌ Remover (PartyKit)

src/services/inbox/
└── index.ts                              # ✅ Serviço de inbox (Lead, Conversation, Ticket, Message)
```

### O que Funciona

| Feature | Status | Notas |
|---------|--------|-------|
| Lista de conversas | ✅ | Componente pronto |
| Visualizar mensagens | ✅ | Componente pronto |
| Enviar mensagem texto | ✅ | Componente pronto |
| Painel do lead | ✅ | Precisa renomear contact → lead |
| Layout 3 colunas | ✅ | ResizablePanel implementado |
| React Query hooks | ✅ | useConversations, useMessages, etc |
| Centrifugo real-time | ✅ | Implementado |

### O que Precisa Mudar

| Item | Ação |
|------|------|
| `use-inbox-socket.ts` | ❌ Remover (substituído por `use-centrifugo.ts`) |
| `contact-panel/` | Renomear para `lead-panel/` |
| PartyKit config | Remover |
| Webhook handler | Remover persistência duplicada em `WhatsappMessage` |
| Envio de mensagem | Persistir em `Message` (atualmente não persiste!) |

---

## Ajustes de Nomenclatura

### Migração de Termos

| Termo Antigo | Termo Novo | Contexto |
|--------------|------------|----------|
| `Contact` | `Lead` | Entidade do cliente |
| `Inbound` | `Ticket` | Sessão de atendimento |
| `CONTACT` | `LEAD` | SenderType enum |
| `AI_AGENT` | `AI` | SenderType enum |

### Componentes

| Arquivo Atual | Renomear Para |
|---------------|---------------|
| `contact-panel/contact-panel.tsx` | `lead-panel/lead-panel.tsx` |
| `ContactPanel` | `LeadPanel` |
| `ContactInfo` | `LeadInfo` |
| `conversation.contact` | `conversation.lead` |

---

## Real-time: Centrifugo (Substituindo PartyKit)

### Por que Centrifugo

| Aspecto | PartyKit (atual) | Centrifugo (novo) |
|---------|------------------|-------------------|
| Hosting | Cloudflare | Self-hosted (Docker) |
| Custo | Pago após free tier | Grátis |
| Controle | Limitado | Total |
| Redis | Não | Sim (já temos) |
| Maturidade | Novo | 9.6k stars, usado pelo Grafana |

### Arquitetura Centrifugo

```
┌─────────────────────────────────────────────────────────────┐
│                     Whatrack Chat                           │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js)                                         │
│    └── centrifuge-js client                                 │
│         └── subscribe(`chat:org:${orgId}`)                  │
│         └── subscribe(`chat:conversation:${convId}`)        │
├─────────────────────────────────────────────────────────────┤
│  Centrifugo Server (Docker :8000)                           │
│    └── WebSocket connections                                │
│    └── Channel subscriptions                                │
│    └── JWT authentication                                   │
│    └── Redis backend (para escalar)                         │
├─────────────────────────────────────────────────────────────┤
│  Backend (Next.js API)                                      │
│    └── POST centrifugo/api/publish                          │
│    └── Gera JWT tokens para clientes                        │
├─────────────────────────────────────────────────────────────┤
│  Webhook WuzAPI                                             │
│    └── Salva mensagem no DB                                 │
│    └── Publica no Centrifugo → broadcast                    │
└─────────────────────────────────────────────────────────────┘
```

### Channels

| Channel | Propósito |
|---------|-----------|
| `chat:org:${orgId}` | Atualizações da lista de conversas |
| `chat:conversation:${convId}` | Mensagens de uma conversa |

### Eventos

```typescript
type ChatEvent =
  | { type: 'new_message'; data: Message }
  | { type: 'message_status'; data: { messageId: string; status: MessageStatus } }
  | { type: 'conversation_updated'; data: Conversation }
  | { type: 'typing'; data: { conversationId: string; isTyping: boolean } }
```

---

## Implementação Centrifugo

### 1. Docker Compose

```yaml
# docker-compose.yml
centrifugo:
  image: centrifugo/centrifugo:v6
  ports:
    - "8000:8000"
  volumes:
    - ./config/centrifugo.json:/centrifugo/config.json
  command: centrifugo -c config.json
  environment:
    - CENTRIFUGO_TOKEN_HMAC_SECRET_KEY=${CENTRIFUGO_TOKEN_SECRET}
    - CENTRIFUGO_API_KEY=${CENTRIFUGO_API_KEY}
  depends_on:
    - redis
```

### 2. Config (`config/centrifugo.json`)

```json
{
  "token_hmac_secret_key": "${CENTRIFUGO_TOKEN_SECRET}",
  "api_key": "${CENTRIFUGO_API_KEY}",
  "admin": true,
  "admin_password": "${CENTRIFUGO_ADMIN_PASSWORD}",
  "admin_secret": "${CENTRIFUGO_ADMIN_SECRET}",
  "allowed_origins": ["http://localhost:3000", "${APP_URL}"],
  "engine": "redis",
  "redis_address": "redis:6379",
  "namespaces": [
    {
      "name": "chat",
      "presence": true,
      "join_leave": false,
      "history_size": 100,
      "history_ttl": "24h"
    }
  ]
}
```

### 3. Backend Client (`src/lib/centrifugo.ts`)

```typescript
interface CentrifugoConfig {
  url: string
  apiKey: string
}

class CentrifugoClient {
  constructor(private config: CentrifugoConfig) {}

  async publish(channel: string, data: unknown): Promise<void> {
    const response = await fetch(`${this.config.url}/api/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ channel, data }),
    })

    if (!response.ok) {
      throw new Error(`Centrifugo error: ${response.status}`)
    }
  }
}

export const centrifugo = new CentrifugoClient({
  url: process.env.CENTRIFUGO_URL || 'http://centrifugo:8000',
  apiKey: process.env.CENTRIFUGO_API_KEY!,
})

export async function publishNewMessage(conversationId: string, message: Message) {
  await centrifugo.publish(`chat:conversation:${conversationId}`, {
    type: 'new_message',
    data: message,
  })
}

export async function publishConversationUpdate(orgId: string, conversation: Conversation) {
  await centrifugo.publish(`chat:org:${orgId}`, {
    type: 'conversation_updated',
    data: conversation,
  })
}
```

### 4. Token Endpoint (`src/app/api/v1/chat/centrifugo/token/route.ts`)

```typescript
import jwt from 'jsonwebtoken'
import { getServerSession } from '@/lib/auth'

export async function POST() {
  const session = await getServerSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = jwt.sign(
    {
      sub: session.user.id,
      exp: Math.floor(Date.now() / 1000) + 86400, // 24h
    },
    process.env.CENTRIFUGO_TOKEN_SECRET!
  )

  return Response.json({ token })
}
```

### 5. Hook (`src/hooks/use-centrifugo.ts`)

```typescript
'use client'

import { Centrifuge, Subscription } from 'centrifuge'
import { useEffect, useRef, useState, useCallback } from 'react'

interface UseCentrifugoOptions {
  organizationId: string
  enabled?: boolean
  onNewMessage?: (message: Message) => void
  onConversationUpdated?: (conversation: Conversation) => void
}

export function useCentrifugo({
  organizationId,
  enabled = true,
  onNewMessage,
  onConversationUpdated,
}: UseCentrifugoOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<Centrifuge | null>(null)
  const subRef = useRef<Subscription | null>(null)

  useEffect(() => {
    if (!enabled || !organizationId) return

    const getToken = async () => {
      const res = await fetch('/api/v1/chat/centrifugo/token', { method: 'POST' })
      const { token } = await res.json()
      return token
    }

    const client = new Centrifuge(
      process.env.NEXT_PUBLIC_CENTRIFUGO_URL!,
      { getToken }
    )

    client.on('connected', () => {
      setIsConnected(true)
      setError(null)
    })

    client.on('disconnected', () => {
      setIsConnected(false)
    })

    client.on('error', (ctx) => {
      setError(ctx.error?.message || 'Connection error')
    })

    // Subscribe to org channel
    const sub = client.newSubscription(`chat:org:${organizationId}`)

    sub.on('publication', (ctx) => {
      const event = ctx.data
      if (event.type === 'new_message') {
        onNewMessage?.(event.data)
      } else if (event.type === 'conversation_updated') {
        onConversationUpdated?.(event.data)
      }
    })

    sub.subscribe()
    client.connect()

    clientRef.current = client
    subRef.current = sub

    return () => {
      sub.unsubscribe()
      client.disconnect()
    }
  }, [organizationId, enabled, onNewMessage, onConversationUpdated])

  return { isConnected, error }
}
```

---

## Webhook Handler (Atualizar)

Modificar `/api/v1/whatsapp/webhook/[id]` para publicar no Centrifugo:

```typescript
import { publishNewMessage, publishConversationUpdate } from '@/lib/centrifugo'

async function handleIncomingMessage(payload: WuzAPIPayload) {
  // ... código existente de salvar mensagem ...

  // Publicar no Centrifugo
  await publishNewMessage(conversation.id, message)
  await publishConversationUpdate(organizationId, conversation)
}
```

---

## Environment Variables

```env
# Centrifugo
CENTRIFUGO_URL=http://centrifugo:8000
CENTRIFUGO_API_KEY=your-api-key-here
CENTRIFUGO_TOKEN_SECRET=your-jwt-secret-here
CENTRIFUGO_ADMIN_PASSWORD=admin-password
CENTRIFUGO_ADMIN_SECRET=admin-secret

# Frontend
NEXT_PUBLIC_CENTRIFUGO_URL=ws://localhost:8000/connection/websocket
```

---

## Tarefas de Implementação

### Fase 1: Infraestrutura Centrifugo

1. Adicionar Centrifugo ao `docker-compose.yml`
2. Criar `config/centrifugo.json`
3. Configurar variáveis de ambiente
4. Testar conexão básica

### Fase 2: Backend

1. Criar `src/lib/centrifugo.ts` (client)
2. Criar endpoint `/api/v1/chat/centrifugo/token`
3. Modificar webhook para publicar no Centrifugo
4. Modificar envio de mensagem para publicar no Centrifugo

### Fase 3: Frontend

1. Instalar `centrifuge-js`
2. Criar `src/hooks/use-centrifugo.ts`
3. Substituir `use-inbox-socket.ts` por `use-centrifugo.ts`
4. Atualizar `instance/[instanceId]/page.tsx`

### Fase 4: Nomenclatura

1. Atualizar `src/lib/inbox/types.ts` (CONTACT → LEAD)
2. Renomear `contact-panel/` → `lead-panel/`
3. Atualizar componentes e APIs

### Fase 5: Limpeza

1. Remover PartyKit do projeto
2. Remover `src/lib/partykit/`
3. Remover dependência `partysocket`

---

## Database Models

### Models Ativos

```prisma
model Lead {
  id             String   @id @default(cuid())
  organizationId String
  phone          String?
  remoteJid      String?
  name           String?
  
  // Origem (migrado de Inbound)
  firstSource    String?      // "whatsapp", "meta_ads", "organic"
  firstCampaign  String?      // UTM campaign
  firstMedium    String?      // UTM medium
  
  conversation   Conversation?
}

model Conversation {
  id             String   @id @default(cuid())
  organizationId String
  leadId         String   @unique
  instanceId     String
  
  status         ConversationStatus  // OPEN, PENDING, RESOLVED, SNOOZED
  priority       ConversationPriority
  unreadCount    Int      @default(0)
  lastMessageAt  DateTime?
  
  tickets        Ticket[]
  metrics        ConversationMetrics?
}

model Ticket {
  id             String   @id @default(cuid())
  conversationId String
  
  status         TicketStatus  // OPEN, FOLLOW_UP, RESOLVED
  
  // Origem desta sessão (multi-touch attribution)
  source         String?      // "whatsapp", "meta_ads", "google_ads", "organic"
  campaign       String?      // UTM campaign
  medium         String?      // UTM medium
  adId           String?      // ID do anúncio (Meta/Google)
  
  assigneeId     String?
  assigneeName   String?
  resolvedAt     DateTime?
  
  // Follow-up
  followUpEnabled     Boolean @default(false)
  currentFollowUpStep Int?
  
  messages          Message[]
  scheduledMessages ScheduledMessage[]
  analysis          TicketAnalysis?
}

model Message {
  id         String   @id @default(cuid())
  ticketId   String
  
  senderType MessageSenderType  // LEAD, USER, AI, SYSTEM
  senderId   String?
  senderName String?
  
  messageType String   // TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT
  content     String?
  mediaUrl    String?
  mediaType   String?
  
  status      MessageStatus  // PENDING, SENT, DELIVERED, READ, FAILED
  sentAt      DateTime
}
```

### Models a Deprecar

```prisma
// ❌ REMOVER - Substituído por Message
model WhatsappMessage { ... }

// ❌ REMOVER - Substituído por Ticket + Lead.firstSource
model Inbound { ... }
```

### Migração de Dados

```sql
-- 1. Migrar PRIMEIRA origem do Inbound para Lead (first touch)
UPDATE leads l
SET first_source = i.source_type,
    first_campaign = i.utm_campaign,
    first_medium = i.utm_medium
FROM tickets i
WHERE i.lead_id = l.id
  AND i.id = (SELECT id FROM tickets WHERE lead_id = l.id ORDER BY created_at ASC LIMIT 1);

-- 2. Migrar CADA Inbound para Ticket (multi-touch)
-- Criar Ticket para cada Inbound existente com dados de origem
INSERT INTO tickets (conversation_id, source, campaign, medium, status, created_at)
SELECT 
  c.id,
  i.source_type,
  i.utm_campaign,
  i.utm_medium,
  'RESOLVED',
  i.created_at
FROM tickets i
JOIN leads l ON i.lead_id = l.id
JOIN conversations c ON c.lead_id = l.id;

-- 3. Após validação, remover tabelas legadas
-- DROP TABLE whatsapp_message;
-- DROP TABLE tickets;
```

---

## Fluxo de Mensagens

### Recebimento (Webhook)

```
WuzAPI → POST /api/v1/whatsapp/w/webhook/[id]
              │
              ├─ 1. upsertLead()
              ├─ 2. upsertConversation()
              ├─ 3. resolveTicket() ← Encontra OPEN ou cria novo
              ├─ 4. createMessage() → Message
              ├─ 5. updateConversationLastMessage()
              ├─ 6. publishNewMessage() → Centrifugo
              └─ 7. cancelFollowupsOnReply() ← Se lead respondeu
```

### Envio (API)

```
Frontend → POST /api/v1/whatsapp/messages
                │
                ├─ 1. Validar acesso
                ├─ 2. sendWhatsappMessage() → WuzAPI
                ├─ 3. createMessage() → Message ← ADICIONAR!
                └─ 4. publishNewMessage() → Centrifugo ← ADICIONAR!
```

**BUG ATUAL**: Mensagens enviadas não são persistidas em `Message`!

---

## Success Metrics

- Conversas carregam em < 2s
- Mensagem enviada aparece em < 500ms (optimistic update)
- Mensagem recebida aparece em < 1s (via Centrifugo)
- Taxa de erro < 1%
- Conexão WebSocket estável

---

## Tarefas Pendentes

### Fase 1: Consolidação de Models

- [ ] Remover persistência em `WhatsappMessage` do webhook
- [ ] Adicionar persistência de mensagens enviadas em `Message`
- [ ] Publicar no Centrifugo ao enviar mensagem
- [ ] Migrar dados de origem de `Inbound` para `Lead`

### Fase 2: Limpeza de Código

- [ ] Remover `src/hooks/use-inbox-socket.ts` (PartyKit)
- [ ] Remover `src/hooks/use-chat-socket.ts` (PartyKit)
- [ ] Remover dependência `partysocket` do package.json
- [ ] Renomear `contact-panel/` → `lead-panel/`

### Fase 3: Deprecação de Models

- [ ] Criar migration para remover `WhatsappMessage`
- [ ] Criar migration para remover `Inbound`
- [ ] Atualizar schema Prisma

---

## Out of Scope

- Chatbots/automações (ver [prd-auto-followup.md](prd-auto-followup.md))
- IA para sugestões (ver [prd-ai-insights.md](prd-ai-insights.md))
- Campanhas em massa (ver [prd-whatsapp-campaigns.md](prd-whatsapp-campaigns.md))
- Grupos do WhatsApp
