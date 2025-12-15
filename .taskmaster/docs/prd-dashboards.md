# PRD: Dashboards e Analytics

## Problema

Empresário tem dados de tickets, vendas e análises de IA, mas precisa de **visão agregada** para tomar decisões.

---

## Dashboard Existente: Marketing & Vendas

O dashboard atual (`/dashboard`) já possui:

### Métricas Atuais
- Faturamento (netRevenue)
- Investimento em Anúncios
- Custo dos Serviços
- Lucro Bruto / Líquido
- ROAS, ROI, CAC
- Ticket Médio
- Número de Vendas
- Serviços Prestados

### Visualizações Atuais
- Pie Chart: Distribuição de vendas por serviço
- Funil: Leads → Agendamentos → Comparecimentos → Vendas
- Tabela: Campanhas do Meta Ads

### Filtros Atuais
- Período
- Tipo de tráfego (pago/orgânico)
- Fonte de tráfego
- Categoria de serviço
- Produto/Serviço

**Conclusão**: Este dashboard é **excelente para Marketing/Financeiro**. O que falta são dashboards para **Operação de Atendimento** e **Inteligência de Vendas (IA)**.

---

## Proposta: Sistema de Dashboards por Temática

```
/dashboard                    → Marketing & Vendas (existente)
/dashboard/atendimento        → Performance do Time de Atendimento (NOVO)
/dashboard/ai-insights        → Inteligência de IA sobre Vendas Perdidas (NOVO)
/dashboard/agendamentos       → Detalhamento de Agendamentos (NOVO - expandir funil)
```

### Navegação Sugerida

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Dashboard                                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Marketing & Vendas]  [Atendimento]  [AI Insights]  [Agendamentos]     │
│        ● ativo                                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Dashboard 1: Marketing & Vendas (Manter Existente)

**Rota**: `/dashboard` (não muda)

### Melhorias Sugeridas

1. **Comparativo com período anterior**
   - Adicionar ↑/↓ % em cada métrica
   - Ex: "Faturamento R$ 45.000 ↑12%"

2. **Gráfico de linha temporal**
   - Faturamento por dia/semana no período selecionado
   - Permite identificar tendências

3. **Top Produtos/Serviços**
   - Ranking dos produtos que mais vendem
   - Ranking dos que dão mais lucro

### Schema Atual (Referência)
```typescript
// src/lib/schema/dashboard-summary.ts
dashboardSummaryResponseSchema = {
  netRevenue, sales, investment,
  productsCost, grossProfit, netProfit,
  roas, roi, cards: { cac, ticket },
  funnel: { leads, schedules, attendances, sales },
  salesByService, paidCampaigns, origins
}
```

---

## Dashboard 2: Atendimento (NOVO)

**Rota**: `/dashboard/atendimento`

**Foco**: Performance do time de atendentes, tempo de resposta, tickets.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ATENDIMENTO                                                [Período ▼] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ 156          │  │ 89           │  │ 8 min        │  │ 32%          │ │
│  │ Tickets      │  │ Tickets      │  │ Tempo Médio  │  │ Taxa de      │ │
│  │ Recebidos    │  │ Fechados     │  │ 1ª Resposta  │  │ Conversão    │ │
│  │ ↑ 12%        │  │ ↑ 8%         │  │ ↓ 15%        │  │ ↑ 3%         │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                          │
│  ─── Ranking de Atendentes ───                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Atendente     │ Tickets │ Vendas │ Conv. │ Tempo Resp. │ Sentimento ││
│  │───────────────┼─────────┼────────┼───────┼─────────────┼────────────││
│  │ Maria         │ 45      │ 18     │ 40%   │ 5 min       │ 😊 0.7     ││
│  │ João          │ 38      │ 12     │ 32%   │ 12 min      │ 😐 0.3     ││
│  │ Pedro         │ 32      │ 8      │ 25%   │ 8 min       │ 😐 0.2     ││
│  │ Ana           │ 28      │ 6      │ 21%   │ 15 min      │ 😐 0.1     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ─── Tickets por Status ───          ─── Tempo de Resposta ───          │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐     │
│  │ OPEN         ████████ 32    │    │ < 5 min    ████████████ 45%│     │
│  │ IN_PROGRESS  ██████ 24      │    │ 5-15 min   ████████ 30%    │     │
│  │ WAITING      ████ 18        │    │ 15-30 min  ████ 15%        │     │
│  │ WON          ████████████ 48│    │ > 30 min   ███ 10%         │     │
│  │ LOST         ██████ 22      │    │                             │     │
│  │ ABANDONED    ███ 12         │    │ Meta: < 10 min (78% ✓)     │     │
│  └─────────────────────────────┘    └─────────────────────────────┘     │
│                                                                          │
│  ─── Horários de Pico ───                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │     █                                                                ││
│  │   █ █ █                    █                                         ││
│  │   █ █ █ █     █        █   █   █                                     ││
│  │ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █                     ││
│  │ 00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22││
│  │                                                                      ││
│  │ Pico: 09:00-11:00 (32% dos tickets)                                 ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Métricas do Dashboard de Atendimento

| Métrica | Fonte | Descrição |
|---------|-------|-----------|
| Tickets Recebidos | `Ticket.createdAt` | Novos tickets no período |
| Tickets Fechados | `Ticket.closedAt` | Tickets finalizados |
| Tempo Médio 1ª Resposta | `Ticket.firstReplyAt - createdAt` | Rapidez no atendimento |
| Taxa de Conversão | `WON / (WON + LOST + ABANDONED)` | % de tickets que viraram venda |
| Sentimento Médio | `TicketAnalysis.sentimentScore` | Média do sentimento (IA) |

### API Sugerida

```
GET /api/v1/dashboard/atendimento
Query: ?period=7d
Response: {
  ticketsReceived: 156,
  ticketsClosed: 89,
  avgFirstResponseTime: 480000, // 8 min em ms
  conversionRate: 0.32,
  byAgent: [
    { userId, name, tickets, sales, conversion, avgResponseTime, avgSentiment }
  ],
  byStatus: { OPEN: 32, IN_PROGRESS: 24, WON: 48, ... },
  byHour: [ { hour: 9, count: 45 }, { hour: 10, count: 38 }, ... ],
  responseTimeDistribution: {
    under5min: 0.45,
    under15min: 0.30,
    under30min: 0.15,
    over30min: 0.10
  }
}
```

---

## Dashboard 3: AI Insights (NOVO)

**Rota**: `/dashboard/ai-insights`

**Foco**: Por que estamos perdendo vendas? Usar análises de IA para insights acionáveis.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AI INSIGHTS: POR QUE ESTAMOS PERDENDO?                     [Período ▼] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ 47           │  │ 32%          │  │ Preço        │  │ R$ 28.500    │ │
│  │ Tickets      │  │ Taxa de      │  │ Principal    │  │ Receita      │ │
│  │ Perdidos     │  │ Perda        │  │ Motivo       │  │ Perdida*     │ │
│  │              │  │              │  │              │  │ (estimada)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                          │
│  ─── Motivos de Perda (análise IA) ───                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  Preço/Orçamento      ████████████████████ 42% (20)                 ││
│  │  Timing               ██████████ 21% (10)                           ││
│  │  Abandonado           ████████ 17% (8)                              ││
│  │  Concorrente          ██████ 13% (6)                                ││
│  │  Sem necessidade      ███ 6% (3)                                    ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ─── Objeções Detectadas pela IA ───                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 🏷️ "Muito caro"                   ████████████████ 18 ocorrências   ││
│  │ 🏷️ "Vou pensar"                   ██████████████ 15 ocorrências     ││
│  │ 🏷️ "Preciso ver com..."           █████████ 12 ocorrências          ││
│  │ 🏷️ "Não é o momento"              ████████ 8 ocorrências            ││
│  │ 🏷️ "Já uso outro produto"         █████ 6 ocorrências               ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ─── Sentimento dos Atendimentos ───    ─── Insight Automático ───      │
│  ┌─────────────────────────────┐        ┌─────────────────────────────┐ │
│  │ 😊 Positivo   ████████ 45%  │        │ 💡 42% dos leads perdidos   │ │
│  │ 😐 Neutro     ██████ 35%    │        │ citaram preço como objeção. │ │
│  │ 😔 Negativo   ████ 15%      │        │                             │ │
│  │ 😤 Frustrado  ██ 5%         │        │ Sugestão: considere criar   │ │
│  │                             │        │ pacotes mais acessíveis ou  │ │
│  │                             │        │ parcelamento estendido.     │ │
│  └─────────────────────────────┘        └─────────────────────────────┘ │
│                                                                          │
│  ─── Sinais de Compra Detectados ───                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ ✅ Pediu preço (askedPrice)          32 ocorrências                 ││
│  │ ✅ Mencionou prazo (mentionedTimeline) 18 ocorrências               ││
│  │ ✅ Pediu proposta (askedProposal)    15 ocorrências                 ││
│  │ ✅ Perguntas técnicas (askedTechnical) 12 ocorrências               ││
│  │ ✅ Pediu demo/trial (requestedDemo)  8 ocorrências                  ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  * Receita perdida = tickets perdidos × ticket médio                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dados vêm de TicketAnalysis

| Campo | Uso |
|-------|-----|
| `outcome` | Motivo de perda (lost_price, lost_competitor, etc.) |
| `outcomeReason` | Texto explicativo |
| `objectionSignals` | Array de objeções detectadas |
| `buyingSignals` | Array de sinais de compra |
| `sentiment` | Sentimento geral |
| `sentimentScore` | -1.0 a 1.0 |

### API Sugerida

```
GET /api/v1/dashboard/ai-insights
Query: ?period=30d
Response: {
  ticketsLost: 47,
  lossRate: 0.32,
  estimatedLostRevenue: 28500,

  byOutcome: [
    { outcome: "lost_price", count: 20, percentage: 0.42 },
    { outcome: "lost_timing", count: 10, percentage: 0.21 },
    { outcome: "abandoned", count: 8, percentage: 0.17 },
    { outcome: "lost_competitor", count: 6, percentage: 0.13 },
    { outcome: "lost_need", count: 3, percentage: 0.06 }
  ],

  objections: [
    { signal: "priceObjection", label: "Muito caro", count: 18 },
    { signal: "delayTactic", label: "Vou pensar", count: 15 },
    ...
  ],

  buyingSignals: [
    { signal: "askedPrice", count: 32 },
    { signal: "mentionedTimeline", count: 18 },
    ...
  ],

  sentimentDistribution: {
    positive: 0.45,
    neutral: 0.35,
    negative: 0.15,
    frustrated: 0.05
  },

  aiInsight: "42% dos leads perdidos citaram preço como objeção..."
}
```

---

## Dashboard 4: Agendamentos (NOVO)

**Rota**: `/dashboard/agendamentos`

**Foco**: Expandir o funil existente com detalhes sobre agendamentos e comparecimentos.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AGENDAMENTOS                                               [Período ▼] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ 78           │  │ 62           │  │ 80%          │  │ 45%          │ │
│  │ Agendamentos │  │ Compareceram │  │ Taxa Compar. │  │ Converteram  │ │
│  │ Criados      │  │              │  │ ↑ 3%         │  │ (venda)      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                          │
│  ─── Funil Detalhado ───                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  Agendados        ████████████████████████████████████████ 78       ││
│  │  Confirmados      ██████████████████████████████████ 68 (87%)       ││
│  │  Compareceram     ████████████████████████████ 62 (91%)             ││
│  │  Resultado Pos.   ██████████████████████ 44 (71%)                   ││
│  │  Fecharam Venda   ████████████████ 28 (64%)                         ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ─── Por Status ───                  ─── Resultado dos Comparecimentos ─│
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐     │
│  │ ✅ Compareceu    ████████ 62│    │ 🏆 Fechou venda    ████ 28  │     │
│  │ ❌ No-Show       ████ 16    │    │ ✅ Positivo        ███ 16   │     │
│  │ 🔄 Reagendou     ██ 8       │    │ 😐 Neutro          ██ 11    │     │
│  │ ⚠️ Cancelou      ██ 6       │    │ ❌ Negativo        █ 7      │     │
│  └─────────────────────────────┘    └─────────────────────────────┘     │
│                                                                          │
│  ─── Melhores Horários (Taxa de Comparecimento) ───                     │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Horário    │ Agend. │ Comp. │ Taxa │ Conversão                      ││
│  │────────────┼────────┼───────┼──────┼────────────────────────────────││
│  │ 09:00      │ 18     │ 17    │ 94%  │ 🥇 Melhor horário              ││
│  │ 10:00      │ 22     │ 20    │ 91%  │                                ││
│  │ 14:00      │ 15     │ 13    │ 87%  │                                ││
│  │ 15:00      │ 12     │ 9     │ 75%  │                                ││
│  │ 17:00      │ 11     │ 3     │ 27%  │ ⚠️ Evitar este horário         ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ─── Por Tipo de Agendamento ───                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ MEETING       ████████████████ 35 (45%)   Conv: 52%                 ││
│  │ DEMO          ██████████ 22 (28%)         Conv: 68%                 ││
│  │ CALL          ██████ 12 (15%)             Conv: 42%                 ││
│  │ VISIT         ████ 9 (12%)                Conv: 78%                 ││
│  │                                                                      ││
│  │ 💡 Visitas presenciais têm maior taxa de conversão (78%)            ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### API Sugerida

```
GET /api/v1/dashboard/agendamentos
Query: ?period=30d
Response: {
  total: 78,
  confirmed: 68,
  showed: 62,
  noShow: 16,
  cancelled: 6,
  rescheduled: 8,

  showRate: 0.80,
  conversionRate: 0.45,

  byOutcome: {
    sale: 28,
    positive: 16,
    neutral: 11,
    negative: 7
  },

  byHour: [
    { hour: "09:00", scheduled: 18, showed: 17, showRate: 0.94 },
    { hour: "10:00", scheduled: 22, showed: 20, showRate: 0.91 },
    ...
  ],

  byType: [
    { type: "MEETING", count: 35, showRate: 0.82, conversionRate: 0.52 },
    { type: "DEMO", count: 22, showRate: 0.86, conversionRate: 0.68 },
    ...
  ],

  insight: "Visitas presenciais têm maior taxa de conversão (78%)"
}
```

---

## Modelo de Dados para Agregação

Para performance, pré-calcular métricas diárias:

```prisma
model DailyMetrics {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(...)

  date           DateTime @db.Date  // Data de referência

  // Tickets
  ticketsOpened     Int @default(0)
  ticketsClosed     Int @default(0)
  ticketsWon        Int @default(0)
  ticketsLost       Int @default(0)
  ticketsAbandoned  Int @default(0)

  // Vendas (mantém compatibilidade com dashboard existente)
  salesCount        Int @default(0)
  salesRevenue      Decimal @default(0) @db.Decimal(12, 2)

  // Motivos de perda (da análise IA)
  lostByPrice       Int @default(0)
  lostByCompetitor  Int @default(0)
  lostByTiming      Int @default(0)
  lostByNeed        Int @default(0)

  // Leads
  newLeads          Int @default(0)
  returningLeads    Int @default(0)

  // Agendamentos
  appointmentsCreated   Int @default(0)
  appointmentsShowed    Int @default(0)
  appointmentsNoShow    Int @default(0)

  // Engagement
  messagesReceived  Int @default(0)
  messagesSent      Int @default(0)
  avgResponseTimeMs Int?  // Tempo médio de resposta

  // Score médio (da análise IA)
  avgLeadScore      Float?
  avgSentimentScore Float?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([organizationId, date])
  @@index([organizationId, date])
  @@map("daily_metrics")
}

// Métricas por atendente
model UserDailyMetrics {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  user           User @relation(...)

  date           DateTime @db.Date

  ticketsAssigned   Int @default(0)
  ticketsClosed     Int @default(0)
  ticketsWon        Int @default(0)

  salesCount        Int @default(0)
  salesRevenue      Decimal @default(0) @db.Decimal(12, 2)

  messagesSent      Int @default(0)
  avgResponseTimeMs Int?
  avgSentimentScore Float?

  createdAt      DateTime @default(now())

  @@unique([organizationId, userId, date])
  @@index([organizationId, date])
  @@map("user_daily_metrics")
}
```

---

## Job de Agregação (BullMQ)

Roda todo dia às 00:05 para agregar métricas do dia anterior:

```typescript
// src/lib/bullmq/workers/daily-metrics-aggregator.ts

const aggregatorQueue = new Queue('daily-metrics', { connection: redis })

// Agenda para rodar toda meia-noite
aggregatorQueue.add('aggregate', {}, {
  repeat: { cron: '5 0 * * *' }  // 00:05 todo dia
})

const worker = new Worker('daily-metrics', async (job) => {
  const yesterday = subDays(new Date(), 1)
  const startOfYesterday = startOfDay(yesterday)
  const endOfYesterday = endOfDay(yesterday)

  // Para cada organização ativa
  const orgs = await prisma.organization.findMany({
    where: { status: 'active' }
  })

  for (const org of orgs) {
    await aggregateDailyMetrics(org.id, startOfYesterday, endOfYesterday)
    await aggregateUserDailyMetrics(org.id, startOfYesterday, endOfYesterday)
  }
})
```

---

## Estrutura de Arquivos

```
src/app/dashboard/
  ├── page.tsx                      # Marketing & Vendas (existente)
  ├── atendimento/
  │   └── page.tsx                  # NOVO
  ├── ai-insights/
  │   └── page.tsx                  # NOVO
  └── agendamentos/
      └── page.tsx                  # NOVO

src/app/api/v1/dashboard/
  ├── summary/route.ts              # Existente
  ├── atendimento/route.ts          # NOVO
  ├── ai-insights/route.ts          # NOVO
  └── agendamentos/route.ts         # NOVO

src/lib/schema/
  ├── dashboard-summary.ts          # Existente
  ├── dashboard-atendimento.ts      # NOVO
  ├── dashboard-ai-insights.ts      # NOVO
  └── dashboard-agendamentos.ts     # NOVO
```

---

## Resumo

| Dashboard | Rota | Foco | Status |
|-----------|------|------|--------|
| Marketing & Vendas | `/dashboard` | Financeiro, ROI, Campanhas | ✅ Existente |
| Atendimento | `/dashboard/atendimento` | Performance do time, tempo resposta | 🆕 Novo |
| AI Insights | `/dashboard/ai-insights` | Motivos de perda, objeções, sentimento | 🆕 Novo |
| Agendamentos | `/dashboard/agendamentos` | Comparecimento, horários, conversão | 🆕 Novo |

**Diferencial**: Os dashboards novos usam dados de **IA** (TicketAnalysis) para dar **insights acionáveis**, não apenas números.
