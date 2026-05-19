# Context: Dashboard Executivo com Camada Analitica Local

**Ultima atualizacao:** 2026-05-19

---

## 📌 Definicao

O dashboard executivo e a home operacional do workspace. Ele deve responder rapido e com confianca:

- quanto entrou de receita;
- quanto foi investido em Meta Ads;
- qual ROAS, CAC e CPL reais;
- quantos leads vieram do WhatsApp;
- onde o funil esta travando;
- se a operacao esta respondendo rapido;
- se o tracking e a CAPI estao saudaveis.

Para isso, a arquitetura deve separar:

```txt
OLTP, tabelas operacionais
  Fonte da verdade transacional: Lead, Deal, Sale, Conversation, Message

External facts
  Dados externos sincronizados: MetaAdInsightDaily

Read models
  Tabelas materializadas para leitura rapida do dashboard

UI
  Server Components lendo dados locais e cacheados
```

**O que e:**

- Dashboard executivo de aquisicao, receita e operacao.
- Read model analitica por dia, origem e entidade Meta.
- Sistema de sync local para Meta Ads Insights.
- Tela raiz rapida, resiliente e multi-tenant segura.

**O que NAO e:**

- Chamada em tempo real para Meta Ads a cada renderizacao.
- BI pesado com queries livres.
- Fonte da verdade financeira substituindo `Sale`.
- Fonte da verdade do funil substituindo `Deal` e `DealStage`.
- Relatorio completo de todas as dimensoes de marketing.

---

## 🔄 Fluxo Completo Correto

```txt
Mensagem WhatsApp / movimento de deal / venda / campanha
  ↓
Tabelas operacionais sao atualizadas
  ↓
dashboard-projector.queue (job imediato para o dia afetado)
  ↓ BullMQ worker
DashboardDailyMetric / DashboardOriginDailyMetric atualizado
  ↓
revalidateTag('dashboard-{orgId}-{projectId}')
  ↓
UI refetch automatico

---

BullMQ repeat: meta-insight-sync-today (a cada 1h)
  ↓ meta-insight-sync.worker
MetaAdInsightDaily upsert (date = today, syncedAt = now)
  ↓ enfileira dashboard-projector.queue (date = today)
  ↓
DashboardDailyMetric / Origin / MetaEntity atualizado
  ↓ revalidateTag
UI refetch automatico

---

BullMQ repeat: meta-insight-sync-history (1x/dia, madrugada)
  ↓ meta-insight-sync.worker
MetaAdInsightDaily upsert (ultimos 7 dias, attribution window)
  ↓ enfileira dashboard-projector.queue (range)

---

Hard refresh manual:
POST /api/v1/meta-ads/sync/force
  ↓ BullMQ add com priority: 1, jobId: 'force-sync-{orgId}'
  ↓ retorna { jobId, status: 'queued' }
UI mostra spinner ate revalidateTag disparar
```

### Dois Jobs de Sync Separados

| Job BullMQ | Frequencia | Janela | Motivo |
|-----------|-----------|--------|--------|
| `meta-insight-sync-today` | a cada 1h | `date = today` | snapshot intraday para dashboard |
| `meta-insight-sync-history` | 1x/dia (03:00) | ultimos 7 dias | attribution window Meta muda retroativamente |

Hard refresh usa `priority: 1` e `jobId` deduplicado — cliques duplos ignorados pelo BullMQ.

### Infraestrutura Existente

BullMQ + Redis ja estao no projeto. Padrao ja estabelecido:

```
src/server/queues/campaign.queue.ts    ← referencia de padrao
src/server/workers/campaign-dispatch.worker.ts  ← referencia de padrao
src/worker.ts                          ← entry point do processo worker
```

Novos workers de sync e projector seguem o mesmo padrao.

### Regra de Ouro

O dashboard raiz nunca deve bloquear renderizacao esperando a API da Meta.

---

## 💾 Models Existentes Relevantes

### DealTracking

Guarda UTM, click ids, ids e nomes Meta.

Uso:

- atribuir lead, deal e venda;
- separar trafego pago, organico e desconhecido;
- medir cobertura de tracking;
- ligar receita a campanha, conjunto e anuncio.

### Lead

Guarda criacao do lead, origem, `firstMessageAt`, `totalDeals` e `lifetimeValue`.

Uso:

- total de leads;
- paid leads;
- organic leads;
- conversao lead para venda.

### Conversation

Guarda contadores e tempos de atendimento.

Uso:

- mensagens inbound/outbound;
- leads aguardando resposta;
- primeira resposta;
- tempo medio de resposta.

### Deal e DealStage

Guardam pipeline Kanban, status e valor potencial.

Uso:

- funil por etapa;
- pipeline aberto;
- forecast ponderado por `DealStage.probability`;
- ganhos e perdidos.

### Sale

Guarda receita e status.

Uso:

- `completed`: receita realizada;
- `pending`: receita pendente;
- `cancelled`: fora de receita;
- `dealId`: atribuicao a origem e campanha.

### WhatsAppCampaignRecipient

Guarda status de envio, entrega, leitura e resposta.

Uso:

- taxa de entrega;
- taxa de leitura;
- taxa de resposta;
- campanhas que geram retorno.

### MetaConversionEvent

Guarda envio de eventos CAPI.

Uso:

- saude da CAPI;
- eventos enviados e falhos;
- cobertura de vendas com eventos.

---

## 🧱 Models Novos Necessarios

Os nomes abaixo sao propostos. A implementacao deve ajustar nomes finais se houver conflito com padroes existentes.

### OrganizationAnalyticsSettings

Define regras analiticas por organizacao.

```prisma
model OrganizationAnalyticsSettings {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId     String   @unique @db.Uuid
  timezone           String   @default("America/Sao_Paulo")
  baseCurrency       String   @default("BRL")
  attributionModel   String   @default("last_touch")
  firstResponseSlaSec Int     @default(300)
  staleInsightAfterMin Int    @default(180)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@map("analytics_organization_settings")
}
```

Por que existe:

- nao depender do timezone do servidor;
- padronizar periodo `Hoje`, `7d`, `Este mes`;
- impedir soma silenciosa de moedas diferentes;
- registrar modelo de atribuicao.

### MetaInsightSyncRun

Registra cada execucao de sync com a Meta.

```prisma
model MetaInsightSyncRun {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String    @db.Uuid
  projectId      String?   @db.Uuid
  adAccountId    String?
  dateFrom       DateTime  @db.Date
  dateTo         DateTime  @db.Date
  status         String    @default("PENDING")
  trigger        String    @default("cron")
  rowsFetched    Int       @default(0)
  errorCode      String?
  errorMessage   String?
  startedAt      DateTime  @default(now())
  finishedAt     DateTime?
  createdAt      DateTime  @default(now())

  @@index([organizationId, projectId, startedAt])
  @@index([organizationId, status])
  @@map("meta_insight_sync_runs")
}
```

Por que existe:

- auditoria de sync;
- fallback de UI;
- retry controlado;
- observabilidade.

### MetaAdInsightDaily

Fato local diario vindo da Meta Ads API.

```prisma
model MetaAdInsightDaily {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId     String   @db.Uuid
  projectId          String   @db.Uuid
  syncRunId          String?  @db.Uuid
  date               DateTime @db.Date
  level              String
  entityKey          String
  adAccountId        String
  adAccountName      String?
  campaignId         String?
  campaignName       String?
  adSetId            String?
  adSetName          String?
  adId               String?
  adName             String?
  accountTimezone    String?
  currency           String
  baseCurrency       String   @default("BRL")
  spendOriginal      Decimal  @default(0) @db.Decimal(12, 2)
  spendBaseCurrency  Decimal  @default(0) @db.Decimal(12, 2)
  impressions        Int      @default(0)
  reach              Int      @default(0)
  clicks             Int      @default(0)
  linkClicks         Int      @default(0)
  landingPageViews   Int      @default(0)
  addsToCart         Int      @default(0)
  initiateCheckout   Int      @default(0)
  metaPurchases      Int      @default(0)
  metaPurchaseValue  Decimal  @default(0) @db.Decimal(12, 2)
  rawActions         Json?
  syncedAt           DateTime @default(now())
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([organizationId, projectId, date, level, entityKey])
  @@index([organizationId, projectId, date])
  @@index([organizationId, projectId, campaignId, date])
  @@index([organizationId, projectId, adSetId, date])
  @@index([organizationId, projectId, adId, date])
  @@map("meta_ad_insights_daily")
}
```

Observacao importante:

- `entityKey` evita problema de unique com campos nullable no Postgres.
- Exemplo de chave: `account:act_123`, `campaign:123`, `adset:456`, `ad:789`.

### CurrencyExchangeRateDaily

Necessario se contas Meta puderem estar em USD, EUR ou outra moeda.

```prisma
model CurrencyExchangeRateDaily {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  date          DateTime @db.Date
  fromCurrency  String
  toCurrency    String
  rate          Decimal  @db.Decimal(18, 8)
  provider      String
  fetchedAt     DateTime @default(now())

  @@unique([date, fromCurrency, toCurrency, provider])
  @@index([date, fromCurrency, toCurrency])
  @@map("analytics_currency_exchange_rates_daily")
}
```

Regra V1:

- se nao houver conversao confiavel, nao calcular ROAS/CAC cross-currency;
- mostrar alerta de moeda incompatvel.

### DashboardMetricRefreshRun

Registra rebuild ou refresh incremental das read models.

```prisma
model DashboardMetricRefreshRun {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String    @db.Uuid
  projectId      String?   @db.Uuid
  dateFrom       DateTime  @db.Date
  dateTo         DateTime  @db.Date
  status         String    @default("PENDING")
  trigger        String    @default("event")
  rowsUpserted   Int       @default(0)
  errorMessage   String?
  startedAt      DateTime  @default(now())
  finishedAt     DateTime?

  @@index([organizationId, projectId, startedAt])
  @@index([organizationId, status])
  @@map("dashboard_metric_refresh_runs")
}
```

### DashboardDailyMetric

Resumo diario geral por organizacao e projeto.

```prisma
model DashboardDailyMetric {
  id                       String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId           String   @db.Uuid
  projectId                String?  @db.Uuid
  date                     DateTime @db.Date
  timezone                 String
  currency                 String   @default("BRL")
  totalLeads               Int      @default(0)
  paidLeads                Int      @default(0)
  organicLeads             Int      @default(0)
  unknownLeads             Int      @default(0)
  completedSales           Int      @default(0)
  completedRevenue         Decimal  @default(0) @db.Decimal(12, 2)
  pendingSales             Int      @default(0)
  pendingRevenue           Decimal  @default(0) @db.Decimal(12, 2)
  openPipelineValue        Decimal  @default(0) @db.Decimal(12, 2)
  weightedPipelineValue    Decimal  @default(0) @db.Decimal(12, 2)
  metaSpend                Decimal  @default(0) @db.Decimal(12, 2)
  attributedMetaRevenue    Decimal  @default(0) @db.Decimal(12, 2)
  attributedMetaSales      Int      @default(0)
  inboundMessages          Int      @default(0)
  outboundMessages         Int      @default(0)
  waitingConversations     Int      @default(0)
  firstResponseAvgSec      Int?
  firstResponseP50Sec      Int?
  firstResponseP90Sec      Int?
  capiSentEvents           Int      @default(0)
  capiFailedEvents         Int      @default(0)
  trackingCtwaDeals        Int      @default(0)
  trackingPaidDeals        Int      @default(0)
  lastProjectedAt          DateTime @default(now())

  @@unique([organizationId, projectId, date])
  @@index([organizationId, projectId, date])
  @@map("dashboard_daily_metrics")
}
```

### DashboardOriginDailyMetric

Resumo diario por origem de trafego.

```prisma
model DashboardOriginDailyMetric {
  id                   String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId       String   @db.Uuid
  projectId            String?  @db.Uuid
  date                 DateTime @db.Date
  originKey            String
  sourceType           String
  trafficChannel       String
  utmSource            String?
  utmMedium            String?
  utmCampaign          String?
  leads                Int      @default(0)
  deals                Int      @default(0)
  completedSales       Int      @default(0)
  completedRevenue     Decimal  @default(0) @db.Decimal(12, 2)
  pendingRevenue       Decimal  @default(0) @db.Decimal(12, 2)
  openPipelineValue    Decimal  @default(0) @db.Decimal(12, 2)
  metaSpend            Decimal  @default(0) @db.Decimal(12, 2)
  lastProjectedAt      DateTime @default(now())

  @@unique([organizationId, projectId, date, originKey])
  @@index([organizationId, projectId, date])
  @@index([organizationId, projectId, sourceType, date])
  @@map("dashboard_origin_daily_metrics")
}
```

Observacao importante:

- `originKey` evita unique constraint com campos nullable no Postgres (mesmo problema que `entityKey` em `MetaAdInsightDaily`).
- Exemplo de chave: `meta_paid:utm_source:utm_medium:utm_campaign` ou `organic::` para campos ausentes.
- Gerado pelo projector antes do upsert.

### DashboardMetaEntityDailyMetric

Resumo diario por conta, campanha, conjunto ou anuncio da Meta.

```prisma
model DashboardMetaEntityDailyMetric {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId        String   @db.Uuid
  projectId             String   @db.Uuid
  date                  DateTime @db.Date
  level                 String
  entityKey             String
  adAccountId           String
  adAccountName         String?
  campaignId            String?
  campaignName          String?
  adSetId               String?
  adSetName             String?
  adId                  String?
  adName                String?
  currency              String   @default("BRL")
  spend                 Decimal  @default(0) @db.Decimal(12, 2)
  impressions           Int      @default(0)
  clicks                Int      @default(0)
  leads                 Int      @default(0)
  completedSales        Int      @default(0)
  completedRevenue      Decimal  @default(0) @db.Decimal(12, 2)
  pendingRevenue        Decimal  @default(0) @db.Decimal(12, 2)
  openPipelineValue     Decimal  @default(0) @db.Decimal(12, 2)
  trackingCtwaDeals     Int      @default(0)
  capiSentEvents        Int      @default(0)
  capiFailedEvents      Int      @default(0)
  insightSyncedAt       DateTime?
  lastProjectedAt       DateTime @default(now())

  @@unique([organizationId, projectId, date, level, entityKey])
  @@index([organizationId, projectId, date])
  @@index([organizationId, projectId, campaignId, date])
  @@index([organizationId, projectId, adSetId, date])
  @@index([organizationId, projectId, adId, date])
  @@map("dashboard_meta_entity_daily_metrics")
}
```

---

## 🎯 Regras de Atribuicao

### Classificacao de Trafego

```txt
Meta paid
  ctwaclid OR metaAdId OR metaCampaignId OR metaAccountId

Other paid
  gclid OR ttclid OR fbclid sem ids Meta claros

Organic
  sourceType = organic e sem click ids pagos

Unknown
  sem evidencias suficientes
```

Para ROAS Meta:

- incluir somente `Meta paid`;
- nao misturar `gclid` como Meta;
- `fbclid` sozinho pode ser pago social, mas nao deve gerar ROAS Meta sem conta/campanha Meta clara.

### Receita

```txt
Receita realizada = Sale.status = completed
Receita pendente = Sale.status = pending
Receita cancelada = Sale.status = cancelled, fora dos KPIs financeiros
Pipeline aberto = Deal aberto com dealValue
Forecast ponderado = Deal.dealValue * DealStage.probability
```

### SLA

Separar metricas:

- primeira resposta do lead: primeiro outbound apos primeiro inbound da conversa;
- resposta por interacao: tempo entre inbound novo e proximo outbound;
- aguardando resposta agora: `lastInboundAt > lastOutboundAt`.

V1 deve mostrar:

- `firstResponseP50Sec`;
- `firstResponseP90Sec`;
- `waitingConversations`.

### Timezone

- Periodos do dashboard usam `OrganizationAnalyticsSettings.timezone`.
- Datas gravadas em read model usam `date` no dia local da organizacao.
- Meta Ads pode ter timezone de conta, mas deve ser normalizado para a data de dashboard.
- A divergencia deve ser documentada quando houver diferenca relevante.

### Moeda

- Moeda base do dashboard vem de `OrganizationAnalyticsSettings.baseCurrency`.
- `MetaAdInsightDaily` guarda moeda original e moeda base.
- ROAS, CAC e CPL usam somente valores na moeda base.
- Sem cambio confiavel, mostrar dados de midia, mas bloquear ratios financeiros cross-currency.

---

## 📊 KPIs Prioritarios

| KPI | Formula | Fonte de leitura |
|-----|---------|------------------|
| Receita realizada | `SUM(completedRevenue)` | `DashboardDailyMetric` |
| Receita pendente | `SUM(pendingRevenue)` | `DashboardDailyMetric` |
| Pipeline aberto | `SUM(openPipelineValue)` | `DashboardDailyMetric` |
| Forecast ponderado | `SUM(weightedPipelineValue)` | `DashboardDailyMetric` |
| Investimento Meta | `SUM(metaSpend)` | `DashboardDailyMetric` |
| Receita atribuida Meta | `SUM(attributedMetaRevenue)` | `DashboardDailyMetric` |
| ROAS real | `attributedMetaRevenue / metaSpend` | calculado no service |
| CAC real | `metaSpend / attributedMetaSales` | calculado no service |
| CPL real | `metaSpend / paidLeads` | calculado no service |
| Leads | `SUM(totalLeads)` | `DashboardDailyMetric` |
| Vendas realizadas | `SUM(completedSales)` | `DashboardDailyMetric` |
| Conversao | `completedSales / totalLeads` | calculado no service |
| SLA P50/P90 | mediana/p90 projetado | `DashboardDailyMetric` |
| Leads esperando | `SUM(waitingConversations)` ou snapshot atual | read model ou query leve |

---

## ⚡ Performance Next.js 16

- Server Components por padrao.
- Client Components apenas para filtros e refresh.
- `searchParams` como URL state.
- `params` e `searchParams` sempre com `await`.
- Dashboard le read models locais.
- Cache serve para leitura local, nao para esconder chamada externa lenta.
- Meta sync roda fora da renderizacao.
- `cacheTag` sempre inclui organizacao e projeto.
- Testes devem validar isolamento multi-tenant.

---

## 📝 Resumo para Implementacao

- Adicionar models analiticos no Prisma (incluindo `originKey` em `DashboardOriginDailyMetric`).
- Criar queues BullMQ em `src/server/queues/`: `meta-insight-sync.queue.ts` e `dashboard-projector.queue.ts`.
- Criar workers BullMQ em `src/server/workers/`: `meta-insight-sync.worker.ts` e `dashboard-projector.worker.ts`.
- Registrar os dois novos workers em `src/server/workers/index.ts`.
- Sync Meta usa dois jobs recorrentes: `sync-today` (1h) e `sync-history` (1x/dia).
- Hard refresh via `POST /api/v1/meta-ads/sync/force` com priority e jobId deduplicado.
- Projector idempotente por dia: upsert + `revalidateTag` ao final.
- Dashboard le apenas read models locais.
- Ratios calculados no service, numeradores e denominadores materializados.
- UI mostra `syncedAt`, badge de freshness e fallback para ultimo dado local.
