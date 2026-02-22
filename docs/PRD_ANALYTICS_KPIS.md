# WhaTrack - CRM KPIs & Analytics (No-LLM): PRD v2

## Sumário Executivo

Este documento descreve a arquitetura e estratégia de KPIs (Key Performance Indicators) nativos do CRM WhaTrack. O sistema é projetado para entregar alto valor analítico (velocidade, conversão, esforço) baseando-se em:

- **Matemática relacional** (agregações SQL)
- **Eventos de webhook** (atualização em tempo real)
- **Métricas desnormalizadas** (campos pré-calculados para performance)

**Filosofia Core**: Reservar LLMs apenas para tarefas dialógicas complexas e classificação semântica, enquanto a inteligência operacional roda gratuitamente via SQL e event-driven updates.

---

## Arquitetura de Dados

### Diagrama de Relacionamentos (KPI-centric)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ORGANIZATION                                        │
│  (contexto multi-tenant)                                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
    ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
    │     LEAD      │◄────────│ CONVERSATION  │────────►│    TICKET     │
    │               │         │               │         │               │
    │ KPIs:         │         │ KPIs:         │         │ KPIs:         │
    │ • firstMsgAt  │         │ • unreadCount │         │ • inbound#    │
    │ • totalTkts   │         │ • inbound#    │         │ • outbound#   │
    │ • LTV         │         │ • outbound#   │         │ • 1st resp    │
    │               │         │ • lastInbound │         │ • resolution  │
    │               │         │ • lastOutbound│         │ • lastInbound │
    │               │         │ • avgRespTime │         │ • lastOutbound│
    └───────────────┘         └───────────────┘         └───────────────┘
            │                         │                         │
            │                         │                         │
            └─────────────────────────┴─────────────────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │   MESSAGE     │
                              │               │
                              │ direction:    │
                              │ • INBOUND     │
                              │ • OUTBOUND    │
                              │               │
                              │ timestamp     │
                              └───────────────┘
```

---

## 🟢 Fase 1: Fundação (IMPLEMENTADO)

### 1.1 Modelo de Dados (Prisma Schema)

#### Tabela `Lead` — Histórico e Valor do Cliente

| Campo | Tipo | Descrição | Atualizado por |
|-------|------|-----------|----------------|
| `firstMessageAt` | `DateTime?` | Timestamp da primeira interação do lead | Webhook inbound (1x) |
| `totalTickets` | `Int` | Contagem de tickets fechados (won + lost) | Fechamento de ticket |
| `lifetimeValue` | `Decimal(12,2)` | Soma de `dealValue` de todos tickets `closed_won` | Fechamento won |

**Índices existentes:** `organizationId`, `source`, `isActive`

#### Tabela `Conversation` — Termômetro da Sessão

| Campo | Tipo | Descrição | Atualizado por |
|-------|------|-----------|----------------|
| `unreadCount` | `Int` | Mensagens não lidas pelo atendente | Webhook + UI |
| `inboundMessagesCount` | `Int` | Total de mensagens recebidas do cliente | Webhook inbound |
| `outboundMessagesCount` | `Int` | Total de mensagens enviadas pela equipe | Webhook echo |
| `lastInboundAt` | `DateTime?` | Última mensagem do cliente | Webhook inbound |
| `lastOutboundAt` | `DateTime?` | Última mensagem da equipe | Webhook echo |
| `avgResponseTimeSec` | `Int?` | Média móvel de tempo de resposta | Calculado |
| `firstResponseTimeSec` | `Int?` | Tempo até primeira resposta (SLA) | Webhook echo (1x) |

#### Tabela `Ticket` — SLA e Esforço por Negócio

| Campo | Tipo | Descrição | Atualizado por |
|-------|------|-----------|----------------|
| `inboundMessagesCount` | `Int` | Mensagens do cliente neste ticket | Webhook inbound |
| `outboundMessagesCount` | `Int` | Mensagens da equipe neste ticket | Webhook echo |
| `lastInboundAt` | `DateTime?` | Última msg do cliente no ticket | Webhook inbound |
| `lastOutboundAt` | `DateTime?` | Última msg da equipe no ticket | Webhook echo |
| `firstResponseTimeSec` | `Int?` | SLA crítico: segundos até 1ª resposta | Webhook echo (1x) |
| `resolutionTimeSec` | `Int?` | Segundos desde criação até fechamento | Fechamento |
| `status` | `String` | `open`, `closed_won`, `closed_lost` | API close |
| `dealValue` | `Decimal(12,2)?` | Valor monetário do negócio | UI / API |

### 1.2 APIs Implementadas

#### `GET /api/v1/conversations/:conversationId/ticket`

Retorna o ticket aberto da conversa com nós de KPIs:

```typescript
{
  id: string,
  status: 'open',
  stage: { id, name, color, order, isClosed },
  assignee: { id, name, email, image } | null,
  tracking: { utmSource, utmMedium, utmCampaign, sourceType, ctwaclid, ... },
  dealValue: string | null,

  // 🎯 KPIs do Ticket
  kpis: {
    messagesCount: number,
    inboundMessagesCount: number,
    outboundMessagesCount: number,
    firstResponseTimeSec: number | null,
    resolutionTimeSec: number | null,
    createdAt: string // ISO
  },

  // 🎯 Insights do Lead (histórico)
  leadInsights: {
    totalTickets: number,
    lifetimeValue: string, // Decimal como string
    firstMessageAt: string | null
  }
}
```

#### `POST /api/v1/tickets/:ticketId/close`

Fecha o ticket com `reason: 'won' | 'lost'`. Define `closedAt` e `status`.

**Schema de validação:** `closeTicketSchema`

### 1.3 Front-end (Inbox UI)

Componente `TicketPanel` na sidebar direita do Inbox com cards:

1. **Dossiê do Atendimento**
   - Gráfico de barras: Cliente vs Clínica (inbound/outbound)
   - Relógio de 1ª Resposta (firstResponseTimeSec formatado)
   - Relógio de Resolução (resolutionTimeSec ou tempo corrente)

2. **Histórico do Cliente**
   - Badge com `totalTickets` oportunidades
   - Bloco destacado verde com LTV em R$

---

## 🟡 Fase 2: Motor de Eventos (A IMPLEMENTAR)

### 2.1 Motor de Eventos — message.handler.ts

**Arquivo:** `src/services/whatsapp/handlers/message.handler.ts`

O handler atual processa mensagens mas **não atualiza os campos de KPI**.

#### 2.1.1 Implementação Inbound (Cliente → Clínica)

Dentro da transação existente, após criar a mensagem:

```typescript
// Dentro de prisma.$transaction
// Após: await tx.message.create(...)

if (!isEcho) {
  // KPI: Atualizar contadores do Ticket
  await tx.ticket.update({
    where: { id: ticket.id },
    data: {
      inboundMessagesCount: { increment: 1 },
      lastInboundAt: messageTimestamp,
    },
  });

  // KPI: Atualizar contadores da Conversation
  await tx.conversation.update({
    where: { id: conversation.id },
    data: {
      inboundMessagesCount: { increment: 1 },
      lastInboundAt: messageTimestamp,
      unreadCount: { increment: 1 },
    },
  });

  // KPI: firstMessageAt do Lead (apenas na primeira vez)
  if (!lead.firstMessageAt) {
    await tx.lead.update({
      where: { id: lead.id },
      data: { firstMessageAt: messageTimestamp },
    });
  }
}
```

#### 2.1.2 Implementação Outbound (Clínica → Cliente via Echo)

```typescript
if (isEcho) {
  // KPI: Atualizar contadores do Ticket
  const ticketUpdateData: any = {
    outboundMessagesCount: { increment: 1 },
    lastOutboundAt: messageTimestamp,
  };

  // KPI: firstResponseTimeSec (apenas na primeira resposta)
  if (ticket.firstResponseTimeSec === null) {
    const responseTime = Math.floor(
      (messageTimestamp.getTime() - ticket.createdAt.getTime()) / 1000
    );
    ticketUpdateData.firstResponseTimeSec = responseTime;
  }

  await tx.ticket.update({
    where: { id: ticket.id },
    data: ticketUpdateData,
  });

  // KPI: Atualizar contadores da Conversation
  const convUpdateData: any = {
    outboundMessagesCount: { increment: 1 },
    lastOutboundAt: messageTimestamp,
  };

  // Calcular avgResponseTimeSec (média móvel)
  if (conversation.lastInboundAt) {
    const thisResponseTime = Math.floor(
      (messageTimestamp.getTime() - conversation.lastInboundAt.getTime()) / 1000
    );

    if (conversation.avgResponseTimeSec === null) {
      convUpdateData.avgResponseTimeSec = thisResponseTime;
    } else {
      // Média móvel simples: (old * 0.7) + (new * 0.3)
      convUpdateData.avgResponseTimeSec = Math.floor(
        conversation.avgResponseTimeSec * 0.7 + thisResponseTime * 0.3
      );
    }
  }

  // firstResponseTimeSec da Conversation
  if (conversation.firstResponseTimeSec === null) {
    const firstResp = Math.floor(
      (messageTimestamp.getTime() - conversation.createdAt.getTime()) / 1000
    );
    convUpdateData.firstResponseTimeSec = firstResp;
  }

  await tx.conversation.update({
    where: { id: conversation.id },
    data: convUpdateData,
  });
}
```

### 2.2 Motor de Fechamento — close/route.ts

**Arquivo:** `src/app/api/v1/tickets/[ticketId]/close/route.ts`

Adicionar cálculo de KPIs no fechamento:

```typescript
const closed = await prisma.$transaction(async (tx) => {
  const now = new Date();

  // Calcular resolutionTimeSec
  const resolutionTimeSec = Math.floor(
    (now.getTime() - existing.createdAt.getTime()) / 1000
  );

  // Atualizar Ticket
  const updatedTicket = await tx.ticket.update({
    where: { id: ticketId },
    data: {
      status: newStatus,
      closedAt: now,
      closedReason,
      resolutionTimeSec,
      ...(dealValue !== undefined && { dealValue }),
    },
    include: { /* ... existing includes ... */ },
  });

  // Se WON: atualizar LTV e totalTickets do Lead
  if (newStatus === 'closed_won' && dealValue) {
    await tx.lead.update({
      where: { id: existing.leadId },
      data: {
        lifetimeValue: { increment: dealValue },
        totalTickets: { increment: 1 },
      },
    });
  } else if (newStatus === 'closed_lost') {
    // Apenas incrementa totalTickets
    await tx.lead.update({
      where: { id: existing.leadId },
      data: {
        totalTickets: { increment: 1 },
      },
    });
  }

  return updatedTicket;
});
```

---

## 🔴 Fase 3: Dashboard Analítico (A IMPLEMENTAR)

### 3.1 Estrutura de Arquivos

```
src/
├── app/dashboard/analytics/
│   ├── page.tsx                    # Página principal
│   ├── loading.tsx                 # Skeleton
│   └── components/
│       ├── AnalyticsDashboard.tsx  # Wrapper client
│       ├── ConversionFunnel.tsx    # Funil de conversão
│       ├── SlaOverview.tsx         # Painel de SLA
│       ├── HeatmapHours.tsx        # Mapa de calor horário
│       ├── EfficiencyChart.tsx     # R$/Mensagem
│       ├── LeadActivity.tsx        # Termômetro de leads
│       └── DateRangePicker.tsx     # Filtro de período
│
├── services/analytics/
│   ├── index.ts                    # Barrel exports
│   ├── conversion-funnel.ts        # Query: funil
│   ├── sla-metrics.ts              # Query: SLA
│   ├── hourly-heatmap.ts           # Query: heatmap
│   ├── efficiency-metrics.ts       # Query: R$/msg
│   └── lead-activity.ts            # Query: atividade
│
└── app/api/v1/analytics/
    ├── conversion/route.ts
    ├── sla/route.ts
    ├── heatmap/route.ts
    ├── efficiency/route.ts
    └── lead-activity/route.ts
```

### 3.2 Métricas e Queries

#### 3.2.1 Taxa de Conversão (Funil)

**Objetivo:** Tickets por estágio + taxa de conversão won/lost

```sql
-- Tickets por status no período
SELECT
  status,
  COUNT(*) as count,
  COALESCE(SUM(deal_value), 0) as total_value
FROM tickets
WHERE organization_id = $1
  AND created_at BETWEEN $2 AND $3
GROUP BY status;

-- Por estágio (para funil visual)
SELECT
  ts.name as stage_name,
  ts.color,
  ts.order,
  COUNT(t.id) as ticket_count,
  COALESCE(SUM(t.deal_value), 0) as total_value
FROM ticket_stages ts
LEFT JOIN tickets t ON t.stage_id = ts.id
  AND t.created_at BETWEEN $2 AND $3
WHERE ts.organization_id = $1
GROUP BY ts.id
ORDER BY ts.order;
```

**Cálculos derivados:**
- `Taxa de Conversão = closed_won / (closed_won + closed_lost) * 100`
- `Win Rate por Estágio = tickets_won_from_stage / tickets_entered_stage`

#### 3.2.2 Métricas de SLA

**Objetivo:** Análise de tempos de resposta

```sql
-- Distribuição de firstResponseTimeSec
SELECT
  CASE
    WHEN first_response_time_sec <= 60 THEN '< 1 min'
    WHEN first_response_time_sec <= 300 THEN '1-5 min'
    WHEN first_response_time_sec <= 900 THEN '5-15 min'
    WHEN first_response_time_sec <= 3600 THEN '15-60 min'
    ELSE '> 1 hora'
  END as bucket,
  COUNT(*) as count,
  AVG(first_response_time_sec) as avg_time
FROM tickets
WHERE organization_id = $1
  AND first_response_time_sec IS NOT NULL
  AND created_at BETWEEN $2 AND $3
GROUP BY bucket
ORDER BY MIN(first_response_time_sec);

-- Piores SLAs (para alertas)
SELECT
  t.id,
  l.name as lead_name,
  l.phone,
  t.first_response_time_sec,
  t.created_at,
  u.name as assignee_name
FROM tickets t
JOIN conversations c ON c.id = t.conversation_id
JOIN leads l ON l.id = c.lead_id
LEFT JOIN "user" u ON u.id = t.assignee_id
WHERE t.organization_id = $1
  AND t.first_response_time_sec > 900  -- > 15 min
  AND t.created_at BETWEEN $2 AND $3
ORDER BY t.first_response_time_sec DESC
LIMIT 10;
```

**KPIs derivados:**
- `SLA Médio = AVG(firstResponseTimeSec)`
- `SLA P95 = PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY first_response_time_sec)`
- `Taxa de SLA < 5min = COUNT(WHERE < 300) / TOTAL`

#### 3.2.3 Heatmap de Horários

**Objetivo:** Identificar picos de demanda por hora/dia

```sql
-- Mensagens inbound por hora e dia da semana
SELECT
  EXTRACT(DOW FROM timestamp) as day_of_week,  -- 0=Dom, 6=Sáb
  EXTRACT(HOUR FROM timestamp) as hour,
  COUNT(*) as message_count
FROM whatsapp_messages m
JOIN leads l ON l.id = m.lead_id
WHERE l.organization_id = $1
  AND m.direction = 'INBOUND'
  AND m.timestamp BETWEEN $2 AND $3
GROUP BY
  EXTRACT(DOW FROM timestamp),
  EXTRACT(HOUR FROM timestamp)
ORDER BY day_of_week, hour;
```

**Visualização:** Grid 7x24 (dias x horas) com intensidade de cor baseada em `message_count`

#### 3.2.4 Eficiência (R$/Mensagem)

**Objetivo:** Correlacionar esforço de comunicação com resultado financeiro

```sql
-- Por ticket fechado won
SELECT
  t.id,
  t.deal_value,
  t.inbound_messages_count + t.outbound_messages_count as total_messages,
  CASE
    WHEN (t.inbound_messages_count + t.outbound_messages_count) > 0
    THEN t.deal_value / (t.inbound_messages_count + t.outbound_messages_count)
    ELSE NULL
  END as value_per_message,
  t.resolution_time_sec
FROM tickets t
WHERE t.organization_id = $1
  AND t.status = 'closed_won'
  AND t.deal_value > 0
  AND t.created_at BETWEEN $2 AND $3
ORDER BY value_per_message DESC;

-- Agregado
SELECT
  AVG(deal_value) as avg_deal_value,
  AVG(inbound_messages_count + outbound_messages_count) as avg_messages,
  AVG(deal_value / NULLIF(inbound_messages_count + outbound_messages_count, 0)) as avg_value_per_message,
  AVG(resolution_time_sec) as avg_resolution_sec
FROM tickets
WHERE organization_id = $1
  AND status = 'closed_won'
  AND deal_value > 0
  AND created_at BETWEEN $2 AND $3;
```

**Insights:**
- `Eficiência Alta = deal_value alto com poucas mensagens`
- `Esforço Excessivo = muitas mensagens para deal_value baixo`

#### 3.2.5 Atividade de Leads (Termômetro)

**Objetivo:** Identificar leads "quentes" (respondendo) vs "frios" (esquecidos)

```sql
-- Leads aguardando resposta da equipe
SELECT
  l.id,
  l.name,
  l.phone,
  l.push_name,
  c.last_inbound_at,
  c.last_outbound_at,
  EXTRACT(EPOCH FROM (NOW() - c.last_inbound_at)) as seconds_waiting,
  t.id as ticket_id,
  t.stage_id,
  ts.name as stage_name
FROM conversations c
JOIN leads l ON l.id = c.lead_id
JOIN tickets t ON t.conversation_id = c.id AND t.status = 'open'
JOIN ticket_stages ts ON ts.id = t.stage_id
WHERE c.organization_id = $1
  AND c.last_inbound_at > COALESCE(c.last_outbound_at, '1970-01-01')
ORDER BY c.last_inbound_at ASC  -- Mais antigo primeiro
LIMIT 20;

-- Leads "esquecidos" (última resposta da equipe há muito tempo)
SELECT
  l.id,
  l.name,
  l.phone,
  c.last_outbound_at,
  EXTRACT(EPOCH FROM (NOW() - c.last_outbound_at)) / 3600 as hours_since_outbound,
  t.id as ticket_id
FROM conversations c
JOIN leads l ON l.id = c.lead_id
JOIN tickets t ON t.conversation_id = c.id AND t.status = 'open'
WHERE c.organization_id = $1
  AND c.last_outbound_at IS NOT NULL
  AND c.last_outbound_at < NOW() - INTERVAL '24 hours'
  AND (c.last_inbound_at IS NULL OR c.last_inbound_at < c.last_outbound_at)
ORDER BY c.last_outbound_at ASC;
```

### 3.3 Componentes Visuais (Nivo)

#### 3.3.1 Biblioteca Recomendada

```bash
npm install @nivo/bar @nivo/line @nivo/heatmap @nivo/funnel @nivo/pie
```

#### 3.3.2 Especificações de Componentes

| Componente | Tipo Nivo | Dados | Interação |
|------------|-----------|-------|-----------|
| ConversionFunnel | `@nivo/funnel` | stages[] | Hover → detalhes |
| SlaOverview | `@nivo/bar` (horizontal) | buckets[] | Click → lista tickets |
| HeatmapHours | `@nivo/heatmap` | grid 7x24 | Hover → count |
| EfficiencyChart | `@nivo/scatter` | tickets[] | Click → drawer |
| LeadActivity | Custom + `@nivo/bar` | leads[] | Click → inbox |

#### 3.3.3 Paleta de Cores

```typescript
const KPI_COLORS = {
  won: '#22c55e',      // green-500
  lost: '#ef4444',     // red-500
  open: '#3b82f6',     // blue-500
  slaGood: '#22c55e',  // < 5 min
  slaMedium: '#f59e0b', // 5-15 min
  slaBad: '#ef4444',   // > 15 min
  heatmapScale: ['#f0f9ff', '#0369a1'], // blue gradient
};
```

---

## 🟣 Fase 4: Background Jobs (OPCIONAL)

### 4.1 Job: Detecção de Leads Esquecidos

**Arquivo:** `src/app/api/v1/jobs/forgotten-leads/route.ts`

**Trigger:** Cron a cada 1 hora via Vercel Cron / Railway / etc.

```typescript
// Pseudo-código
export async function GET(req: NextRequest) {
  // Validar CRON_SECRET

  // Buscar tickets open onde:
  // - lastOutboundAt foi há mais de 24h
  // - lastInboundAt é null OU < lastOutboundAt (cliente não respondeu)
  // - Não tem tag "forgotten" ainda

  // Para cada ticket encontrado:
  // - Adicionar tag/flag "forgotten_lead"
  // - Opcionalmente: notificar via Centrifugo
  // - Opcionalmente: enviar alerta para gestor
}
```

### 4.2 Job: Snapshot Diário de KPIs

**Objetivo:** Histórico para comparações week-over-week

```typescript
// Criar tabela analytics_snapshots
model AnalyticsSnapshot {
  id             String   @id @default(uuid())
  organizationId String   @db.Uuid
  date           DateTime @db.Date

  // Métricas do dia
  newLeads          Int
  newTickets        Int
  closedWon         Int
  closedLost        Int
  totalRevenue      Decimal  @db.Decimal(12,2)
  avgFirstResponse  Int?     // segundos
  avgResolution     Int?     // segundos

  createdAt      DateTime @default(now())

  @@unique([organizationId, date])
  @@map("analytics_snapshots")
}
```

---

## 📊 Métricas de Sucesso do PRD

### KPIs do Próprio Sistema

| Métrica | Baseline | Target | Prazo |
|---------|----------|--------|-------|
| Campos de KPI preenchidos | 0% | 100% | Fase 2 |
| Latência de atualização | N/A | < 100ms | Fase 2 |
| Dashboard load time | N/A | < 2s | Fase 3 |
| Queries sem N+1 | N/A | 100% | Fase 3 |

### KPIs de Negócio (Clientes WhaTrack)

| Métrica | Descrição |
|---------|-----------|
| Taxa de 1ª Resposta < 5min | % de tickets com SLA bom |
| Tempo Médio de Resolução | Ciclo de venda |
| LTV Médio por Lead | Valor histórico |
| Eficiência de Conversão | won / (won + lost) |

---

## Cronograma de Implementação

### Sprint 1: Motor de Eventos
- [ ] Atualizar `message.handler.ts` com lógica de KPIs inbound/outbound
- [ ] Atualizar `close/route.ts` com cálculo de resolutionTimeSec e LTV
- [ ] Adicionar índices necessários no Prisma
- [ ] Testes de integração para fluxo de mensagens

### Sprint 2: API Analytics
- [ ] Criar service layer em `src/services/analytics/`
- [ ] Implementar endpoints de aggregation
- [ ] Adicionar caching com Redis (TTL 5 min)
- [ ] Documentar queries e otimizar com EXPLAIN ANALYZE

### Sprint 3: Dashboard UI
- [ ] Criar página `/dashboard/analytics`
- [ ] Implementar componentes Nivo
- [ ] Integrar com APIs
- [ ] Adicionar filtros de data e comparações

### Sprint 4: Polish & Jobs
- [ ] Background job para leads esquecidos
- [ ] Snapshot diário
- [ ] Testes E2E
- [ ] Documentação de usuário

---

## Considerações Técnicas

### Performance

1. **Índices recomendados:**
```prisma
@@index([organizationId, createdAt])           // tickets
@@index([organizationId, status, createdAt])   // tickets
@@index([leadId, direction, timestamp])        // messages
@@index([conversationId, direction])           // messages
```

2. **Caching:**
- Redis com TTL de 5 minutos para queries de dashboard
- Invalidação por organização ao fechar ticket

3. **Queries:**
- Usar `prisma.$queryRaw` para aggregations complexas
- Evitar N+1 com includes estratégicos
- Considerar materialized views para métricas históricas

### Segurança

- Todas as APIs validam `organizationId` via `validateFullAccess()`
- Permissões granulares: `view:analytics` separado de `view:tickets`
- Rate limiting específico para endpoints de analytics (mais pesados)

### Observabilidade

- Logs estruturados para atualizações de KPI
- Métricas Prometheus/OpenTelemetry para latência de queries
- Alertas para jobs que falham

---

## Referências

- **Prisma Schema:** `prisma/schema.prisma`
- **Message Handler:** `src/services/whatsapp/handlers/message.handler.ts`
- **Close Ticket:** `src/app/api/v1/tickets/[ticketId]/close/route.ts`
- **Ticket API:** `src/app/api/v1/conversations/[conversationId]/ticket/route.ts`
- **Centrifugo:** `src/lib/centrifugo/server.ts`
- **Nivo Charts:** https://nivo.rocks/
