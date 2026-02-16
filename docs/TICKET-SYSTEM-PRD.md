# WhaTrack - Sistema de Tickets e Tracking: PRD v2

## Visão Geral

O **WhaTrack** é um sistema de rastreamento e atendimento via WhatsApp que conecta **Leads** a **Conversas** e **Tickets**, permitindo:

- **Tracking de origem**: UTMs, Click IDs (gclid, fbclid, ctwaclid)
- **Atendimento organizado**: Kanban com estágios personalizáveis
- **Controle de janela 24h**: Saber quando pode enviar mensagem livre vs template
- **Atribuição de ROI**: Qual campanha gerou qual venda

---

## Arquitetura de Dados

```
Organization
├── Lead (contato permanente)
│   └── Conversation (canal: Lead + Instance)
│       ├── Messages[] (histórico completo)
│       └── Tickets[] (atendimentos/oportunidades)
│           ├── TicketTracking (UTM, Click IDs)
│           └── Sales[] (vendas atribuídas)
├── WhatsAppConfig (instâncias/números)
└── TicketStage[] (estágios do Kanban)
```

### Relacionamentos

| Entidade | Cardinalidade | Descrição |
|----------|---------------|-----------|
| Lead → Conversation | 1:N | Um lead pode ter conversas em diferentes números |
| Conversation → Ticket | 1:N | Uma conversa pode ter múltiplos tickets (histórico) |
| Ticket → Message | 1:N | Cada ticket agrupa as mensagens do período |
| Ticket → TicketTracking | 1:1 | Cada ticket tem seus dados de origem |
| Ticket → Sale | 1:N | Um ticket pode gerar múltiplas vendas |

---

## Modelo de Dados (Prisma)

### Enums

```prisma
enum TicketStatus {
  open           // Em atendimento
  closed_won     // Fechado - Vendeu
  closed_lost    // Fechado - Não converteu
  closed_spam    // Fechado - Spam/Inválido
}

enum TicketSourceType {
  paid           // Tráfego pago (ads)
  organic        // Tráfego orgânico
  referral       // Indicação
  direct         // Direto
}

enum TicketCreatorType {
  SYSTEM         // Criado automaticamente
  USER           // Criado manualmente
}
```

### Conversation

```prisma
model Conversation {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  organization   Organization @relation(...)

  leadId         String   @db.Uuid
  lead           Lead     @relation(...)

  instanceId     String   @db.Uuid
  instance       WhatsAppConfig @relation(...)

  // Meta Billing (conversation_id do webhook)
  metaConversationId String?

  // Contadores desnormalizados
  messagesCount  Int      @default(0)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  messages       Message[]
  tickets        Ticket[]

  @@unique([leadId, instanceId])
  @@index([organizationId])
  @@map("conversations")
}
```

### Ticket

```prisma
model Ticket {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  organization   Organization @relation(...)

  conversationId String   @db.Uuid
  conversation   Conversation @relation(...)

  stageId        String   @db.Uuid
  stage          TicketStage @relation(...)

  // === JANELA 24H WHATSAPP ===
  // Cada mensagem INBOUND do cliente renova por +24h
  windowExpiresAt DateTime?
  windowOpen      Boolean  @default(true)

  // === ATRIBUIÇÃO ===
  assigneeId     String?  @db.Uuid
  assignee       User?    @relation(...)

  // === VALOR/NEGOCIAÇÃO ===
  dealValue      Decimal? @db.Decimal(12,2)

  // === STATUS ===
  status         TicketStatus @default(open)
  closedAt       DateTime?
  closedReason   String?

  // === METADADOS ===
  createdBy      TicketCreatorType @default(SYSTEM)
  messagesCount  Int      @default(0)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  tracking       TicketTracking?
  messages       Message[]
  sales          Sale[]

  @@index([organizationId])
  @@index([conversationId])
  @@index([status])
  @@index([stageId])
  @@map("tickets")
}
```

### TicketStage

```prisma
model TicketStage {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @db.Uuid
  organization   Organization @relation(...)

  name           String   // "Novo", "Em Atendimento", etc.
  color          String   // Hex: "#3b82f6"
  order          Int      // Ordem no Kanban
  isDefault      Boolean  @default(false) // Estágio inicial
  isClosed       Boolean  @default(false) // Estágio de fechamento

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  tickets        Ticket[]

  @@unique([organizationId, name])
  @@index([organizationId, order])
  @@map("ticket_stages")
}
```

### TicketTracking

```prisma
model TicketTracking {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ticketId       String   @unique @db.Uuid
  ticket         Ticket   @relation(...)

  // === UTM PARAMETERS ===
  utmSource      String?  // google, facebook, instagram, tiktok
  utmMedium      String?  // cpc, cpm, social, email
  utmCampaign    String?  // nome_da_campanha
  utmTerm        String?  // palavra-chave
  utmContent     String?  // variação do anúncio

  // === CLICK IDS ===
  gclid          String?  // Google Click ID
  fbclid         String?  // Facebook/Meta Click ID
  ctwaclid       String?  // Click to WhatsApp Ads ID
  ttclid         String?  // TikTok Click ID

  // === ORIGEM ===
  sourceType     TicketSourceType @default(organic)
  referrerUrl    String?  // URL de onde veio
  landingPage    String?  // Página de destino

  // === DEVICE INFO ===
  userAgent      String?
  ipAddress      String?

  createdAt      DateTime @default(now())

  @@index([utmSource])
  @@index([sourceType])
  @@index([ctwaclid])
  @@map("ticket_tracking")
}
```

### Message (atualizado)

```prisma
model Message {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

  wamid          String   @unique // WhatsApp Message ID

  // === RELAÇÕES ===
  leadId         String   @db.Uuid
  lead           Lead     @relation(...)

  instanceId     String   @db.Uuid
  instance       WhatsAppConfig @relation(...)

  conversationId String?  @db.Uuid  // NOVO
  conversation   Conversation? @relation(...)

  ticketId       String?  @db.Uuid  // NOVO
  ticket         Ticket?  @relation(...)

  // === CONTEÚDO ===
  direction      String   // INBOUND, OUTBOUND
  type           String   // text, image, audio, video, document, etc.
  body           String?  @db.Text
  mediaUrl       String?

  // === STATUS ===
  status         String   // sent, delivered, read, failed

  // === TIMESTAMPS ===
  timestamp      DateTime // Quando foi enviada/recebida

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([leadId])
  @@index([instanceId])
  @@index([conversationId])
  @@index([ticketId])
  @@map("whatsapp_messages")
}
```

---

## Estágios Padrão

Criados automaticamente por organização (`ensureTicketStages`):

| Ordem | Nome | Cor | isDefault | isClosed |
|-------|------|-----|-----------|----------|
| 1 | Novo | `#6366f1` (indigo) | ✅ | ❌ |
| 2 | Em Atendimento | `#f59e0b` (amber) | ❌ | ❌ |
| 3 | Negociação | `#8b5cf6` (violet) | ❌ | ❌ |
| 4 | Fechado/Ganho | `#22c55e` (green) | ❌ | ✅ |
| 5 | Fechado/Perdido | `#ef4444` (red) | ❌ | ✅ |

---

## Fluxo: Mensagem Recebida (Webhook)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Webhook recebe mensagem INBOUND                          │
│    payload.entry[0].changes[0].value.messages[0]            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Identificar Instance (por phone_number_id)               │
│    → WhatsAppConfig.findUnique({ phoneId })                 │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Find or Create Lead (por waId = message.from)            │
│    → Lead.upsert({ waId, organizationId })                  │
│    → Atualiza pushName se veio no payload                   │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Find or Create Conversation (Lead + Instance)            │
│    → Conversation.upsert({ leadId, instanceId })            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Find Open Ticket ou Create New                           │
│    → Ticket.findFirst({ conversationId, status: 'open' })   │
│    → Se não existe: cria novo com stageId default           │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Atualiza Janela 24h                                      │
│    → windowExpiresAt = now() + 24 horas                     │
│    → windowOpen = true                                      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Extrai Tracking (se primeira mensagem do Ticket)         │
│    → ctwaclid do referral (Click to WhatsApp Ads)           │
│    → Cria TicketTracking com sourceType                     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Salva Message                                            │
│    → Vincula a conversationId e ticketId                    │
│    → Incrementa contadores                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Tracking: Click to WhatsApp Ads

Quando um usuário clica em um anúncio "Click to WhatsApp", a primeira mensagem contém:

```json
{
  "messages": [{
    "from": "5511999998888",
    "type": "text",
    "text": { "body": "Oi, vim pelo anúncio!" },
    "referral": {
      "source_url": "https://fb.me/...",
      "source_type": "ad",
      "source_id": "123456789",
      "headline": "Título do Anúncio",
      "body": "Descrição do Anúncio",
      "ctwa_clid": "ARAkLkX..."  // ← CLICK ID
    }
  }]
}
```

O `ctwa_clid` é salvo em `TicketTracking.ctwaclid` para atribuição.

---

## API Endpoints

### Tickets

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/tickets` | Lista tickets com filtros |
| GET | `/api/v1/tickets/:id` | Detalhes do ticket |
| POST | `/api/v1/tickets` | Criar ticket manual |
| PATCH | `/api/v1/tickets/:id` | Atualizar ticket (stage, assignee, dealValue) |
| POST | `/api/v1/tickets/:id/close` | Fechar ticket |

### Listagem de Tickets

**GET `/api/v1/tickets`**

Query Params:

| Param | Tipo | Descrição |
|-------|------|-----------|
| `q` | string | Busca por nome/telefone do lead |
| `status` | enum | `open`, `closed_won`, `closed_lost`, `closed_spam` |
| `stageId` | uuid | Filtrar por estágio |
| `assigneeId` | uuid | Filtrar por atendente |
| `sourceType` | enum | `paid`, `organic`, `referral`, `direct` |
| `utmSource` | string | Filtrar por utm_source |
| `dateRange` | preset | `today`, `7d`, `30d`, `thisMonth` |
| `windowStatus` | enum | `open`, `expired` |
| `page` | number | Página (default: 1) |
| `pageSize` | number | Itens por página (default: 20) |

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "lead": {
        "id": "uuid",
        "name": "João Silva",
        "phone": "+5511999998888",
        "pushName": "João"
      },
      "stage": {
        "id": "uuid",
        "name": "Novo",
        "color": "#6366f1"
      },
      "assignee": {
        "id": "uuid",
        "name": "Maria"
      },
      "tracking": {
        "utmSource": "google",
        "sourceType": "paid",
        "ctwaclid": "ARAkLkX..."
      },
      "status": "open",
      "windowOpen": true,
      "windowExpiresAt": "2026-02-17T20:00:00Z",
      "dealValue": 1500.00,
      "messagesCount": 12,
      "salesCount": 0,
      "createdAt": "2026-02-16T20:00:00Z",
      "lastMessageAt": "2026-02-16T21:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "stats": {
    "open": 45,
    "closed_won": 80,
    "closed_lost": 20,
    "totalDealValue": 125000.00
  }
}
```

---

## Janela de 24 Horas

O WhatsApp Business API só permite envio de mensagens livres dentro de **24 horas** após a última mensagem do cliente.

### Lógica:

```typescript
// Cada INBOUND renova a janela
ticket.windowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
ticket.windowOpen = true;

// Verificar se pode enviar
const canSendFreeMessage = ticket.windowOpen && ticket.windowExpiresAt > new Date();

// Se expirou
if (ticket.windowExpiresAt <= new Date()) {
  ticket.windowOpen = false;
  // Só pode enviar TEMPLATE
}
```

### UI:

- 🟢 **Janela aberta**: "Pode enviar mensagem livre (expira em 5h 30min)"
- 🔴 **Janela fechada**: "Envie um template para reabrir a conversa"

---

## Cenário de Uso

```
Lead: João Silva (+55 11 99999-8888)

├── Ticket #1 (Janeiro 2026)
│   ├── Origem: Instagram Ads (fbclid: EAIaIQ...)
│   ├── UTM: source=instagram, medium=cpc, campaign=promo_verao
│   ├── Stage: Fechado/Ganho
│   ├── Venda: R$ 500,00
│   └── Duração: 3 dias, 15 mensagens
│
├── Ticket #2 (Março 2026)
│   ├── Origem: Orgânico (sem tracking)
│   ├── Stage: Fechado/Perdido
│   ├── Motivo: "Preço alto"
│   └── Duração: 1 dia, 8 mensagens
│
└── Ticket #3 (Hoje) ← ATIVO
    ├── Origem: Google Ads (gclid: Cj0KCQ...)
    ├── UTM: source=google, medium=cpc, campaign=remarketing
    ├── Stage: Em Atendimento
    ├── Janela: Aberta (expira em 22h)
    └── Mensagens: 4
```

**Análise possível:**
- João converteu em 33% das vezes (1 de 3)
- Primeira conversão veio do Instagram
- Google remarketing trouxe ele de volta
- Ticket médio: R$ 500,00

---

## Próximos Passos

### Fase 1: Core (Esta implementação)
- [ ] Migration do schema (Conversation, Ticket, TicketStage, TicketTracking)
- [ ] Ajustar webhook handler para criar Ticket automaticamente
- [ ] Ajustar Message para vincular a Conversation e Ticket
- [ ] API de listagem de Tickets
- [ ] Seed de estágios padrão

### Fase 2: UI
- [ ] Melhorar Inbox existente com dados de Ticket
- [ ] Indicador de janela 24h
- [ ] Kanban de tickets por estágio
- [ ] Filtros por tracking/origem

### Fase 3: Analytics
- [ ] Dashboard de conversão por origem
- [ ] ROI por campanha (integrar com Sale)
- [ ] Tempo médio de atendimento
- [ ] Taxa de resposta

---

## Observações Técnicas

1. **Apenas um Ticket aberto por Conversation**: Quando fecha um ticket, próxima mensagem cria novo
2. **Tracking só na criação**: `TicketTracking` é criado junto com o Ticket, não atualiza depois
3. **Janela 24h é do Ticket**: Cada ticket controla sua própria janela
4. **Messages sempre vinculadas**: Toda mensagem nova precisa ter `conversationId` e `ticketId`
