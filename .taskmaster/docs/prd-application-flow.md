# PRD: Fluxo da Aplicação (Arquitetura de Dados)

## Visão Geral

Este documento define a arquitetura de dados e o fluxo completo da aplicação, desde a entrada de um lead até o registro de venda.

**Canal único**: WhatsApp (via WuzAPI/Meta Cloud API)

---

## Hierarquia de Entidades

```
Organization (tenant)
    │
    ├── WhatsappInstance (número conectado)
    │
    ├── Lead (pessoa física/jurídica)
    │       │
    │       └── Conversation (histórico completo de mensagens - 1:1 com Lead)
    │               │
    │               ├── Message[] (todas as mensagens, de todos os tempos)
    │               │
    │               └── Ticket[] (sessões de atendimento)
    │                       │
    │                       ├── Sale[] (vendas)
    │                       │
    │                       ├── Appointment[] (agendamentos)
    │                       │       │
    │                       │       └── Attendance? (comparecimento)
    │                       │
    │                       ├── TicketAnalysis? (análise IA)
    │                       │
    │                       └── ScheduledMessage[] (follow-ups)
    │
    └── User (atendente)
```

**Conceito chave**:
- **Conversation** = histórico permanente de chat com o lead (nunca é fechada, só cresce)
- **Ticket** = sessão de atendimento com início e fim (pode ser fechado como WON, LOST, etc.)
- Um lead tem **1 Conversation** e **N Tickets** ao longo do tempo

---

## Entidades Principais

### 1. Lead (Contato)

Representa uma pessoa ou empresa que entrou em contato.

```prisma
model Lead {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(...)

  // Identificação WhatsApp
  remoteJid      String   // "5511999999999@s.whatsapp.net"
  phone          String   // "5511999999999" (normalizado)

  // Dados do contato
  name           String?
  email          String?

  // Dados empresa (se PJ)
  companyName    String?
  cnpj           String?

  // Tracking de origem (primeiro contato)
  firstSource    String?  // "whatsapp", "landing_page", "import"
  firstCampaign  String?  // UTM campaign
  firstMedium    String?  // UTM medium

  // Status do lead (global, não do ticket)
  status         LeadStatus @default(NEW)

  // Relacionamentos
  tickets        Ticket[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([organizationId, phone])
  @@unique([organizationId, remoteJid])
  @@index([organizationId])
  @@map("leads")
}

enum LeadStatus {
  NEW           // Novo, nunca atendido
  ACTIVE        // Tem ticket aberto
  CUSTOMER      // Já comprou
  INACTIVE      // Sem interação há muito tempo
}
```

**Regras**:
- Lead é **único por telefone** dentro da organização
- Mesmo lead pode ter múltiplos tickets ao longo do tempo
- Status do Lead é independente do status do Ticket

---

### 2. Ticket (Sessão de Atendimento)

Representa uma sessão/oportunidade de atendimento. Substitui o antigo "Inbound".

```prisma
model Ticket {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(...)

  // Relacionamento com Conversation (N tickets : 1 conversation)
  conversationId String
  conversation   Conversation @relation(...)

  // Atribuição
  assignedToId   String?
  assignedTo     User? @relation(...)

  // Status do ticket
  status         TicketStatus @default(OPEN)
  priority       TicketPriority @default(MEDIUM)

  // Tracking de origem (deste ticket específico)
  source         String?       // "organic", "campaign", "referral"
  campaignId     String?       // ID da campanha se veio de ads
  utmSource      String?
  utmMedium      String?
  utmCampaign    String?

  // Follow-up
  followUpEnabled     Boolean @default(false)
  currentFollowUpStep Int?

  // Timestamps importantes
  openedAt       DateTime @default(now())  // Quando o ticket foi aberto
  firstReplyAt   DateTime?                 // Primeira resposta do agente
  closedAt       DateTime?                 // Quando foi fechado

  // Relacionamentos
  sales             Sale[]
  appointments      Appointment[]
  analysis          TicketAnalysis?
  scheduledMessages ScheduledMessage[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId, status])
  @@index([conversationId])
  @@index([assignedToId])
  @@map("tickets")
}

enum TicketStatus {
  OPEN          // Novo, aguardando atendimento
  IN_PROGRESS   // Em atendimento ativo
  WAITING       // Aguardando resposta do lead
  FOLLOW_UP     // Em follow-up automático
  SNOOZED       // Pausado temporariamente
  RESOLVED      // Resolvido (neutro)
  WON           // Fechou venda
  LOST          // Perdido (não comprou)
  ABANDONED     // Lead parou de responder
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

**Regras**:
- Um Lead pode ter **múltiplos Tickets** ao longo do tempo (dentro da mesma Conversation)
- Novo Ticket é criado quando: não existe ticket aberto (último está fechado ou é o primeiro)
- Ticket **fechado** (RESOLVED/WON/LOST/ABANDONED) não recebe mais mensagens - cria novo ticket

---

### 3. Conversation (Histórico Completo de Mensagens)

Histórico permanente de todas as mensagens com um lead. Relação 1:1 com Lead.

```prisma
model Conversation {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(...)

  // Relação 1:1 com Lead (histórico permanente)
  leadId         String   @unique
  lead           Lead @relation(...)

  // Instância WhatsApp usada
  instanceId     String
  instance       WhatsappInstance @relation(...)

  // Contadores (cache para performance)
  messageCount      Int @default(0)
  unreadCount       Int @default(0)

  // Última mensagem (cache)
  lastMessageAt     DateTime?
  lastMessagePreview String?

  // Relacionamentos
  messages       Message[]
  tickets        Ticket[]     // Todos os tickets deste lead

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@index([leadId])
  @@index([lastMessageAt])
  @@map("conversations")
}
```

**Regras**:
- Conversation é criada automaticamente junto com o Lead (primeira mensagem)
- Relação 1:1 com Lead: Um Lead tem exatamente uma Conversation
- Conversation **nunca é fechada** - só cresce com novas mensagens
- Múltiplos Tickets podem existir dentro de uma Conversation

---

### 4. Message (Mensagem Individual)

Cada mensagem enviada ou recebida.

```prisma
model Message {
  id             String   @id @default(cuid())
  organizationId String

  // Relacionamento com Conversation (obrigatório)
  conversationId String
  conversation   Conversation @relation(...)

  // Relacionamento com Ticket (opcional - associa msg ao ticket ativo)
  ticketId       String?
  ticket         Ticket? @relation(...)

  // Identificador do provider (para idempotência)
  providerMessageId String?

  // Conteúdo
  content        String?       // Texto da mensagem
  contentType    MessageType   // text, image, audio, video, document, sticker

  // Mídia (se houver)
  mediaUrl       String?
  mediaMimeType  String?
  mediaFileName  String?

  // Direção e remetente
  direction      MessageDirection  // INBOUND (lead) ou OUTBOUND (agente/sistema)
  senderType     SenderType        // LEAD, USER, SYSTEM, AI
  senderId       String?           // ID do User se foi enviado por agente

  // Status de entrega
  status         MessageStatus @default(PENDING)

  // Timestamps
  sentAt         DateTime
  deliveredAt    DateTime?
  readAt         DateTime?

  createdAt      DateTime @default(now())

  @@unique([organizationId, providerMessageId])
  @@index([conversationId])
  @@index([ticketId])
  @@index([sentAt])
  @@map("messages")
}

enum MessageType {
  TEXT
  IMAGE
  AUDIO
  VIDEO
  DOCUMENT
  STICKER
  LOCATION
  CONTACT
}

enum MessageDirection {
  INBOUND   // Lead → Empresa
  OUTBOUND  // Empresa → Lead
}

enum SenderType {
  LEAD      // Mensagem do lead
  USER      // Mensagem de um atendente
  SYSTEM    // Mensagem automática do sistema
  AI        // Mensagem gerada por IA (follow-up)
}

enum MessageStatus {
  PENDING     // Aguardando envio
  SENT        // Enviado ao provider
  DELIVERED   // Entregue ao destinatário
  READ        // Lido pelo destinatário
  FAILED      // Falha no envio
}
```

---

### 5. Sale (Venda)

Registro de venda vinculada a um ticket.

```prisma
model Sale {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(...)

  // Relacionamentos
  ticketId       String
  ticket         Ticket @relation(...)

  leadId         String
  lead           Lead @relation(...)

  // Quem fechou a venda
  closedById     String?
  closedBy       User? @relation(...)

  // Valores
  totalAmount    Decimal  @db.Decimal(10, 2)
  currency       String   @default("BRL")

  // Produtos/Itens (opcional - detalhamento)
  items          SaleItem[]

  // Status da venda
  status         SaleStatus @default(PENDING)

  // Pagamento
  paymentMethod  String?   // "pix", "credit_card", "boleto", etc.
  paymentStatus  PaymentStatus @default(PENDING)
  paidAt         DateTime?

  // Notas
  notes          String?

  // Timestamps
  closedAt       DateTime  // Data do fechamento
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@index([ticketId])
  @@index([leadId])
  @@map("sales")
}

model SaleItem {
  id          String   @id @default(cuid())
  saleId      String
  sale        Sale @relation(...)

  description String
  quantity    Int      @default(1)
  unitPrice   Decimal  @db.Decimal(10, 2)
  totalPrice  Decimal  @db.Decimal(10, 2)

  // Referência a produto (opcional)
  productId   String?

  createdAt   DateTime @default(now())

  @@index([saleId])
  @@map("sale_items")
}

enum SaleStatus {
  PENDING     // Venda registrada, aguardando confirmação
  CONFIRMED   // Venda confirmada
  COMPLETED   // Venda concluída (entregue/finalizada)
  CANCELLED   // Venda cancelada
  REFUNDED    // Venda reembolsada
}

enum PaymentStatus {
  PENDING     // Aguardando pagamento
  PAID        // Pago
  PARTIAL     // Parcialmente pago
  OVERDUE     // Vencido
  REFUNDED    // Reembolsado
}
```

**Regras**:
- Uma venda está sempre vinculada a um Ticket
- Um Ticket pode ter múltiplas vendas (upsell, cross-sell)
- Ao registrar venda, o Ticket é automaticamente marcado como `WON`
- Lead.status é atualizado para `CUSTOMER` após primeira venda

---

## Fluxo de Entrada de Mensagem

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WEBHOOK: NOVA MENSAGEM RECEBIDA                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. RECEBE PAYLOAD DO WHATSAPP                                           │
│     └─ Extrai: phone, remoteJid, name, content, mediaUrl, timestamp      │
│                                                                          │
│  2. RESOLVE LEAD + CONVERSATION                                          │
│     ┌──────────────────────────────────────────────────────────────────┐ │
│     │ SELECT l.*, c.* FROM leads l                                      │ │
│     │ LEFT JOIN conversations c ON c.leadId = l.id                      │ │
│     │ WHERE l.organizationId = ? AND (l.phone = ? OR l.remoteJid = ?)   │ │
│     └──────────────────────────────────────────────────────────────────┘ │
│            │                                                              │
│            ├─── Lead existe? ─── SIM ──▶ Usa lead + conversation         │
│            │                                                              │
│            └─── Lead existe? ─── NÃO ──▶ Cria Lead + Conversation        │
│                                          { phone, remoteJid, name,       │
│                                            firstSource: 'whatsapp' }     │
│                                                                          │
│  3. RESOLVE TICKET (dentro da conversation)                              │
│     ┌──────────────────────────────────────────────────────────────────┐ │
│     │ SELECT * FROM tickets                                             │ │
│     │ WHERE conversationId = ?                                          │ │
│     │   AND status NOT IN ('RESOLVED', 'WON', 'LOST', 'ABANDONED')      │ │
│     │ ORDER BY createdAt DESC LIMIT 1                                   │ │
│     └──────────────────────────────────────────────────────────────────┘ │
│            │                                                              │
│            ├─── Ticket aberto existe? ─── SIM ──▶ Usa ticket existente   │
│            │                                                              │
│            └─── Ticket aberto existe? ─── NÃO ──▶ Cria novo Ticket       │
│                                                                          │
│  4. CANCELA FOLLOW-UPS (se ticket tem follow-up ativo)                   │
│     ┌──────────────────────────────────────────────────────────────────┐ │
│     │ Se ticket.followUpEnabled = true:                                 │ │
│     │   - Cancela ScheduledMessages pendentes                           │ │
│     │   - Remove jobs do BullMQ                                         │ │
│     │   - Reseta currentFollowUpStep para 1                             │ │
│     └──────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  5. CRIA MESSAGE                                                         │
│     { conversationId, ticketId, content, direction: INBOUND,             │
│       senderType: LEAD, providerMessageId, sentAt }                      │
│                                                                          │
│  6. ATUALIZA CACHES                                                      │
│     - Conversation.lastMessageAt = now()                                 │
│     - Conversation.lastMessagePreview = content.substring(0, 100)        │
│     - Conversation.messageCount++                                        │
│     - Conversation.unreadCount++ (se não está visualizado)               │
│                                                                          │
│  7. NOTIFICA REAL-TIME                                                   │
│     └─ Publica evento no Centrifugo para atualizar UI                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Envio de Mensagem (Agente)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    POST /api/v1/tickets/:id/messages                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. VALIDA PERMISSÕES                                                    │
│     - User pertence à organização?                                       │
│     - Ticket existe e está acessível?                                    │
│                                                                          │
│  2. CRIA MESSAGE (status: PENDING)                                       │
│     { conversationId, content, direction: OUTBOUND,                      │
│       senderType: USER, senderId: user.id }                              │
│                                                                          │
│  3. ENVIA VIA WHATSAPP API                                               │
│     - WuzAPI.sendText(instanceId, phone, content)                        │
│     - Recebe providerMessageId                                           │
│                                                                          │
│  4. ATUALIZA MESSAGE                                                     │
│     - status: SENT                                                       │
│     - providerMessageId                                                  │
│                                                                          │
│  5. ATUALIZA TICKET                                                      │
│     - lastMessageAt = now()                                              │
│     - Se firstReplyAt == null: firstReplyAt = now()                      │
│     - Se status == OPEN: status = IN_PROGRESS                            │
│                                                                          │
│  6. AGENDA FOLLOW-UP (se ativo)                                          │
│     - Se ticket.followUpEnabled:                                         │
│       - Agenda ScheduledMessage para step 1                              │
│       - Cria job no BullMQ com delay configurado                         │
│                                                                          │
│  7. NOTIFICA REAL-TIME                                                   │
│     └─ Publica evento no Centrifugo                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Ciclo de Vida do Ticket

```
                                    ┌─────────────┐
                                    │    OPEN     │ ◀─── Novo lead manda msg
                                    └──────┬──────┘
                                           │
                               Agente responde
                                           │
                                           ▼
                                    ┌─────────────┐
               ┌───────────────────▶│ IN_PROGRESS │◀───────────────────┐
               │                    └──────┬──────┘                    │
               │                           │                           │
               │            Aguardando     │        Lead               │
               │            resposta       │        responde           │
               │                           ▼                           │
               │                    ┌─────────────┐                    │
               │                    │   WAITING   │────────────────────┘
               │                    └──────┬──────┘
               │                           │
               │            Follow-up      │
               │            ativado        │
               │                           ▼
               │                    ┌─────────────┐
               │                    │  FOLLOW_UP  │─── Lead responde ──┘
               │                    └──────┬──────┘
               │                           │
               │         Todos steps       │      Snooze
               │         enviados          │      manual
               │                           │         │
               │                           ▼         ▼
               │                    ┌─────────────┐
               │                    │  SNOOZED    │─── Unsnooze ───────┘
               │                    └─────────────┘
               │
    ┌──────────┼──────────┬──────────────────┬─────────────────┐
    │          │          │                  │                 │
    ▼          ▼          ▼                  ▼                 ▼
┌────────┐ ┌────────┐ ┌────────┐      ┌───────────┐     ┌───────────┐
│  WON   │ │  LOST  │ │RESOLVED│      │ ABANDONED │     │   OPEN    │
│(venda) │ │(perdeu)│ │(neutro)│      │(sem resp) │     │(novo tkt) │
└────────┘ └────────┘ └────────┘      └───────────┘     └───────────┘
    │          │          │                  │                 ▲
    └──────────┴──────────┴──────────────────┴─────────────────┘
                   Lead manda msg após fechamento
                   (cria NOVO ticket)
```

### Transições de Status

| De | Para | Trigger |
|----|------|---------|
| OPEN | IN_PROGRESS | Agente responde |
| IN_PROGRESS | WAITING | Agente responde, aguarda lead |
| WAITING | IN_PROGRESS | Lead responde |
| IN_PROGRESS | FOLLOW_UP | Follow-up ativado |
| FOLLOW_UP | IN_PROGRESS | Lead responde |
| FOLLOW_UP | ABANDONED | Todos steps sem resposta |
| * | SNOOZED | Agente pausa manualmente |
| SNOOZED | IN_PROGRESS | Agente retoma |
| * | WON | Venda registrada |
| * | LOST | Agente marca como perdido |
| * | RESOLVED | Agente resolve (sem venda) |

---

## Fluxo de Registro de Venda

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    POST /api/v1/tickets/:id/sales                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. VALIDA                                                               │
│     - Ticket existe e não está fechado                                   │
│     - User tem permissão                                                 │
│                                                                          │
│  2. CRIA SALE                                                            │
│     { ticketId, leadId, totalAmount, items[], closedById, closedAt }     │
│                                                                          │
│  3. ATUALIZA TICKET                                                      │
│     - status = WON                                                       │
│     - resolvedAt = now()                                                 │
│                                                                          │
│  4. ATUALIZA LEAD                                                        │
│     - status = CUSTOMER (se primeira venda)                              │
│                                                                          │
│  5. ATUALIZA ORGANIZAÇÃO                                                 │
│     - Recalcula avgTicket (ticket médio)                                 │
│     - Incrementa totalSales                                              │
│                                                                          │
│  6. DISPARA ANÁLISE IA (se tiver créditos)                               │
│     - Cria job no BullMQ para TicketAnalysis                             │
│     - Consome 2 créditos                                                 │
│                                                                          │
│  7. CANCELA FOLLOW-UPS                                                   │
│     - Cancela ScheduledMessages pendentes                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Quando Criar Novo Ticket

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REGRA DE CRIAÇÃO DE TICKET                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Nova mensagem chega:                                                    │
│                                                                          │
│     Tem ticket ABERTO?                                                   │
│            │                                                              │
│            ├─── SIM ──▶ Usa o ticket existente                           │
│            │            (associa mensagem ao ticket)                     │
│            │                                                              │
│            └─── NÃO ──▶ Cria novo Ticket                                 │
│                         (último ticket fechado ou não existe)            │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                          │
│  CENÁRIO 1: Lead manda msg, ticket aberto                                │
│  ─────────────────────────────────────────────────────────────────────── │
│  Dia 1: Lead manda msg ──▶ Cria Ticket #1 (OPEN)                         │
│  Dia 5: Lead manda msg ──▶ Usa Ticket #1 (ainda aberto)                  │
│  Dia 30: Lead manda msg ──▶ Usa Ticket #1 (ainda aberto)                 │
│                                                                          │
│  CENÁRIO 2: Ticket fechado, lead manda msg                               │
│  ─────────────────────────────────────────────────────────────────────── │
│  Dia 1: Lead manda msg ──▶ Cria Ticket #1                                │
│  Dia 5: Agente fecha como WON                                            │
│  Dia 7: Lead manda msg ──▶ Ticket #1 está FECHADO                        │
│                         ──▶ Cria Ticket #2 (novo ticket)                 │
│                                                                          │
│  CENÁRIO 3: Lead volta após meses                                        │
│  ─────────────────────────────────────────────────────────────────────── │
│  Jan: Ticket #1 fechado como LOST                                        │
│  Mar: Lead manda msg ──▶ Ticket #1 está FECHADO                          │
│                       ──▶ Cria Ticket #2                                 │
│  Abr: Lead manda msg ──▶ Usa Ticket #2 (ainda aberto)                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Regra simples**: Ticket fechado (WON/LOST/RESOLVED/ABANDONED) **nunca** recebe novas mensagens. Sempre cria novo ticket.

**Sem janela de tempo**: Não há mais limite de 30 dias. O que importa é se o ticket está aberto ou fechado.

---

## APIs Principais

```
# Leads
GET    /api/v1/leads                    # Lista leads da org
GET    /api/v1/leads/:id                # Detalhes do lead
PATCH  /api/v1/leads/:id                # Atualiza lead
GET    /api/v1/leads/:id/tickets        # Histórico de tickets do lead

# Tickets
GET    /api/v1/tickets                  # Lista tickets (com filtros)
GET    /api/v1/tickets/:id              # Detalhes do ticket
PATCH  /api/v1/tickets/:id              # Atualiza status/prioridade/assignee
POST   /api/v1/tickets/:id/assign       # Atribui a um agente

# Mensagens (via ticket)
GET    /api/v1/tickets/:id/messages     # Lista mensagens do ticket
POST   /api/v1/tickets/:id/messages     # Envia mensagem

# Vendas
GET    /api/v1/tickets/:id/sales        # Vendas do ticket
POST   /api/v1/tickets/:id/sales        # Registra venda
PATCH  /api/v1/sales/:id                # Atualiza venda

# Follow-up
GET    /api/v1/tickets/:id/followup     # Status do follow-up
PATCH  /api/v1/tickets/:id/followup     # Ativa/desativa follow-up

# Análise IA
GET    /api/v1/tickets/:id/analysis     # Análise do ticket
POST   /api/v1/tickets/:id/analyze      # Dispara análise manual
```

---

## Índices Recomendados

```sql
-- Leads
CREATE INDEX idx_leads_org_phone ON leads(organization_id, phone);
CREATE INDEX idx_leads_org_status ON leads(organization_id, status);

-- Tickets
CREATE INDEX idx_tickets_org_status ON tickets(organization_id, status);
CREATE INDEX idx_tickets_lead ON tickets(lead_id);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to_id);
CREATE INDEX idx_tickets_last_msg ON tickets(organization_id, last_message_at DESC);

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id, sent_at);
CREATE INDEX idx_messages_provider ON messages(organization_id, provider_message_id);

-- Sales
CREATE INDEX idx_sales_ticket ON sales(ticket_id);
CREATE INDEX idx_sales_lead ON sales(lead_id);
CREATE INDEX idx_sales_org_date ON sales(organization_id, closed_at);
```

---

## Migração: Inbound → Ticket

Para renomear a tabela existente:

```sql
-- 1. Renomear tabela
ALTER TABLE tickets RENAME TO tickets;

-- 2. Renomear coluna em tabelas relacionadas
ALTER TABLE scheduled_messages RENAME COLUMN inbound_id TO ticket_id;
ALTER TABLE inbound_analyses RENAME TO ticket_analyses;
ALTER TABLE ticket_analyses RENAME COLUMN inbound_id TO ticket_id;

-- 3. Atualizar índices
-- (Prisma fará isso automaticamente na migration)
```

---

### 6. Appointment (Agendamento)

Registro de agendamento (consulta, reunião, visita) vinculado a um ticket.

```prisma
model Appointment {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(...)

  // Relacionamento com Ticket
  ticketId       String?
  ticket         Ticket? @relation(...)

  // Relacionamento com Lead (direto, caso não tenha ticket)
  leadId         String?
  lead           Lead? @relation(...)

  // Dados do agendamento
  scheduledFor   DateTime      // Data/hora do agendamento
  duration       Int?          // Duração em minutos
  location       String?       // Local ou link da reunião
  description    String?       // Descrição/motivo

  // Tipo de agendamento
  type           AppointmentType @default(MEETING)

  // Status
  status         AppointmentStatus @default(SCHEDULED)

  // Lembretes
  reminderSentAt DateTime?     // Quando o lembrete foi enviado

  // Notas
  notes          String?

  // Comparecimento
  attendance     Attendance?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@index([ticketId])
  @@index([leadId])
  @@index([scheduledFor])
  @@map("appointments")
}

enum AppointmentType {
  MEETING       // Reunião
  CALL          // Ligação
  VISIT         // Visita presencial
  DEMO          // Demonstração
  CONSULTATION  // Consulta
  OTHER         // Outro
}

enum AppointmentStatus {
  SCHEDULED     // Agendado
  CONFIRMED     // Confirmado pelo lead
  CANCELLED     // Cancelado
  RESCHEDULED   // Reagendado
  COMPLETED     // Concluído
}
```

---

### 7. Attendance (Comparecimento)

Registro de comparecimento a um agendamento.

```prisma
model Attendance {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(...)

  // Relação 1:1 com Appointment
  appointmentId  String   @unique
  appointment    Appointment @relation(...)

  // Status do comparecimento
  status         AttendanceStatus

  // Detalhes
  arrivedAt      DateTime?     // Hora que chegou (se compareceu)
  notes          String?       // Observações

  // Resultado (se compareceu)
  outcome        AttendanceOutcome?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@map("attendance")
}

enum AttendanceStatus {
  SHOWED        // Compareceu
  NO_SHOW       // Não compareceu
  LATE          // Compareceu com atraso
  CANCELLED     // Cancelou antes
}

enum AttendanceOutcome {
  POSITIVE      // Resultado positivo (interesse, próximos passos)
  NEUTRAL       // Neutro
  NEGATIVE      // Negativo (não teve interesse)
  SALE          // Fechou venda na hora
}
```

**Regras**:
- Attendance só é criado após a data/hora do agendamento passar
- Se `status = SHOWED`, pode ter `outcome` preenchido
- `NO_SHOW` pode disparar follow-up automático

---

## Fluxo de Agendamento

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    POST /api/v1/tickets/:id/appointments                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. CRIA APPOINTMENT                                                     │
│     { ticketId, leadId, scheduledFor, type, location }                   │
│                                                                          │
│  2. AGENDA LEMBRETES (BullMQ)                                            │
│     - 24h antes: Lembrete via WhatsApp                                   │
│     - 1h antes: Lembrete via WhatsApp                                    │
│                                                                          │
│  3. ATUALIZA TICKET                                                      │
│     - Se status == WAITING: mantém                                       │
│     - Adiciona tag "agendamento_pendente"                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    APÓS DATA DO AGENDAMENTO                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Cenário 1: COMPARECEU                                                   │
│  ─────────────────────────────────────────────────────────────────────── │
│  - Cria Attendance { status: SHOWED, outcome: ? }                        │
│  - Atualiza Appointment.status = COMPLETED                               │
│  - Se outcome = SALE → Cria Sale, Ticket.status = WON                    │
│                                                                          │
│  Cenário 2: NÃO COMPARECEU                                               │
│  ─────────────────────────────────────────────────────────────────────── │
│  - Cria Attendance { status: NO_SHOW }                                   │
│  - Dispara mensagem automática: "Sentimos sua falta..."                  │
│  - Oferece reagendamento                                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## APIs de Agendamento

```
# Appointments
GET    /api/v1/appointments               # Lista agendamentos da org
GET    /api/v1/appointments/:id           # Detalhes do agendamento
POST   /api/v1/tickets/:id/appointments   # Cria agendamento para ticket
PATCH  /api/v1/appointments/:id           # Atualiza agendamento
DELETE /api/v1/appointments/:id           # Cancela agendamento

# Attendance
POST   /api/v1/appointments/:id/attendance  # Registra comparecimento
PATCH  /api/v1/attendance/:id               # Atualiza comparecimento
```

---

## Resumo das Entidades

| Entidade | Descrição | Relação |
|----------|-----------|---------|
| **Lead** | Pessoa/empresa que entrou em contato | 1 Lead ↔ 1 Conversation |
| **Conversation** | Histórico completo de mensagens (permanente) | 1 Conversation → N Tickets |
| **Ticket** | Sessão de atendimento (oportunidade) | 1 Ticket → N Messages |
| **Message** | Mensagem individual | Pertence a Conversation + Ticket (opcional) |
| **Sale** | Venda registrada | N Sales → 1 Ticket |
| **Appointment** | Agendamento (reunião, visita) | N Appointments → 1 Ticket |
| **Attendance** | Comparecimento ao agendamento | 1 Attendance → 1 Appointment |
| **TicketAnalysis** | Análise IA do ticket | 1 Analysis → 1 Ticket |
| **ScheduledMessage** | Follow-up agendado | N Scheduled → 1 Ticket |
| **PlatformEvent** | Evento de conversão para ads | N Events → 1 Ticket |

---

## 8. PlatformEvent (Conversões para Ads)

Registro de eventos de conversão enviados para plataformas de anúncios (Meta Ads, Google Ads).

```prisma
model PlatformEvent {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(...)

  // Relacionamento com Ticket (antes era inboundId)
  ticketId       String?
  ticket         Ticket? @relation(fields: [ticketId], references: [id], onDelete: SetNull)

  // Relacionamento com Sale (opcional - para eventos de compra)
  saleId         String?
  sale           Sale? @relation(fields: [saleId], references: [id], onDelete: SetNull)

  // Plataforma e tipo de evento
  platform       String             // "meta", "google"
  eventType      PlatformEventType  // LEAD, PURCHASE, etc.

  // Click IDs capturados na entrada do lead
  externalId     String?            // ID do evento na plataforma
  fbclid         String?            // Facebook Click ID
  gclid          String?            // Google Click ID
  ctwaId         String?            // Click to WhatsApp ID

  // Status do envio
  status         PlatformEventStatus?  // PENDING, SENT, FAILED
  payload        Json?                 // Payload enviado
  response       Json?                 // Resposta da plataforma
  sentAt         DateTime?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@index([ticketId])
  @@index([saleId])
  @@map("platform_events")
}

enum PlatformEventType {
  LEAD           // Lead capturado
  SCHEDULE       // Agendamento criado
  ATTENDANCE     // Compareceu ao agendamento
  PURCHASE       // Venda realizada
  CUSTOM         // Evento customizado
}

enum PlatformEventStatus {
  PENDING        // Aguardando envio
  SENT           // Enviado com sucesso
  FAILED         // Falha no envio
}
```

### Fluxo de Conversões

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE CONVERSÕES PARA ADS                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Lead clica no anúncio (Meta/Google)                                  │
│     └─▶ URL contém: fbclid, gclid, ctwa_id                               │
│                                                                          │
│  2. Lead chega via WhatsApp                                              │
│     └─▶ UTMs e click IDs salvos no Lead                                  │
│     └─▶ Ticket criado com referência aos click IDs                       │
│                                                                          │
│  3. Venda realizada (Ticket → WON, Sale criada)                          │
│     └─▶ PlatformEvent criado (eventType: PURCHASE)                       │
│     └─▶ Envia conversão para Meta via Conversions API                    │
│     └─▶ Envia conversão para Google via Google Ads API                   │
│                                                                          │
│  4. Plataforma recebe evento                                             │
│     └─▶ Atribui conversão ao anúncio original                            │
│     └─▶ Otimiza campanha com dados de conversão                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Campos de Tracking no Lead

```prisma
// Adicionar ao model Lead (campos de tracking)
model Lead {
  // ... campos existentes ...

  // UTMs do primeiro contato
  utmSource      String?
  utmMedium      String?
  utmCampaign    String?
  utmContent     String?
  utmTerm        String?

  // Click IDs para atribuição
  fbclid         String?    // Facebook/Meta
  gclid          String?    // Google Ads
  ctwaId         String?    // Click to WhatsApp (Meta)

  // Referrer
  referrer       String?    // URL de origem
}
```

### APIs de PlatformEvent

```
# Lista eventos de uma organização
GET /api/v1/platform-events

# Detalhes de um evento
GET /api/v1/platform-events/:id

# Reenviar evento falho
POST /api/v1/platform-events/:id/retry

# Eventos de um ticket específico
GET /api/v1/tickets/:id/platform-events
```

---

## Exemplo Prático

```
Lead: João Silva (+55 11 99999-9999)
      fbclid: "abc123", utmSource: "facebook", utmCampaign: "promo_verao"
    │
    └── Conversation (criada em 01/01/2024)
            │
            ├── Message #1: "Olá, quero saber sobre o produto" (01/01)
            ├── Message #2: "Claro! Nosso produto..." (01/01)
            ├── Message #3: "Qual o preço?" (02/01)
            │       │
            │       └── Ticket #1 (01/01 - 05/01) → Status: LOST
            │               ├── TicketAnalysis: "Perdido por preço"
            │               └── PlatformEvent: LEAD (enviado para Meta)
            │
            ├── Message #4: "Oi, voltei! Vi que tem desconto" (15/03)
            ├── Message #5: "Sim! 20% off este mês" (15/03)
            ├── Message #6: "Fechado!" (16/03)
            │       │
            │       └── Ticket #2 (15/03 - 16/03) → Status: WON
            │               ├── Sale: R$ 500,00
            │               ├── TicketAnalysis: "Venda fechada após desconto"
            │               └── PlatformEvent: PURCHASE (enviado para Meta com valor R$500)
            │
            └── Message #7: "Preciso de suporte" (01/06)
                    │
                    └── Ticket #3 (01/06 - atual) → Status: OPEN
```

**Observações**:
- Conversation é única e permanente - todas as 7 mensagens estão nela
- João teve 3 tickets ao longo do tempo
- Cada ticket tem seu próprio contexto, análise e resultados
- As mensagens são associadas ao ticket ativo no momento
- O fbclid capturado no primeiro contato permite atribuir a conversão ao anúncio correto
