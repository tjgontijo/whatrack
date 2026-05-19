# Frontend Spec: Dashboard Executivo KPIs

**Data:** 2026-05-19 | **Status:** Detalhado | **Cobre:** T6, T7, T9, T10, T12

---

## 1. Arquitetura de Componentes

### Regra geral

- Server Component por padrão.
- Client Component apenas quando necessário: filtros, refresh, tabelas ordenáveis, gráficos nivo.
- Cada bloco tem `Suspense` próprio com skeleton.
- Filtros vivem em URL state (`searchParams`), não em `useState`.

### Árvore de componentes

```
src/app/(dashboard)/[org]/[project]/page.tsx         ← Server Component real
  └─ ExecutiveDashboardScreen                        ← server, orquestra blocos
       ├─ PageShell / PageHeader
       │    └─ DashboardFilterBar                    ← CLIENT (filtros + hard refresh)
       │
       ├─ Suspense fallback=<ScorecardSkeleton>
       │    └─ ScorecardSection                      ← server, lê DashboardDailyMetric
       │         ├─ RevenueGroup                     ← server
       │         ├─ MetaGroup                        ← server (inclui freshness badge)
       │         ├─ AcquisitionGroup                 ← server
       │         └─ OperationsGroup                  ← server
       │
       ├─ Suspense fallback=<FunnelSkeleton>
       │    └─ FunnelSection                         ← server, lê read model
       │         └─ FunnelChart                      ← CLIENT (nivo)
       │
       ├─ Suspense fallback=<OriginsSkeleton>
       │    └─ OriginsSection                        ← server, lê DashboardOriginDailyMetric
       │         └─ OriginsTable                     ← CLIENT (ordenável)
       │
       └─ Suspense fallback=<CampaignsSkeleton>
            └─ CampaignsSection                      ← server, lê DashboardMetaEntityDailyMetric
                 └─ CampaignsTable                   ← CLIENT (hierárquico, expandível)
```

### Localização dos arquivos

```
src/features/dashboard/
├── screens/
│   └── executive-dashboard-screen.tsx       ← server, orquestra blocos
│
├── components/
│   ├── scorecard/
│   │   ├── scorecard-section.tsx            ← server
│   │   ├── revenue-group.tsx                ← server
│   │   ├── meta-group.tsx                   ← server
│   │   ├── acquisition-group.tsx            ← server
│   │   └── operations-group.tsx             ← server
│   ├── freshness/
│   │   └── meta-freshness-badge.tsx         ← server
│   ├── filter-bar/
│   │   └── dashboard-filter-bar.tsx         ← client
│   ├── hard-refresh/
│   │   └── hard-refresh-button.tsx          ← client (usa use-force-sync-mutation)
│   ├── origins/
│   │   └── origins-table.tsx                ← client
│   └── campaigns/
│       └── campaigns-table.tsx              ← client
│
├── components/skeletons/                    ← skeletons específicos da feature
│   ├── scorecard-skeleton.tsx
│   ├── funnel-skeleton.tsx
│   ├── origins-skeleton.tsx
│   └── campaigns-skeleton.tsx
│
├── mutations/
│   └── use-force-sync-mutation.ts           ← POST /api/v1/meta-ads/sync/force
│
├── schemas/
│   └── dashboard-search-params.schema.ts   ← valida period e type da URL
│
└── mappers/
    └── dashboard-metric.mapper.ts          ← service output → DTO de componente
```

Arquivo de rota:
```
src/app/(dashboard)/[org]/[proj]/
├── page.tsx        ← Server Component, chama ExecutiveDashboardScreen, passa searchParams
├── loading.tsx     ← importa DashboardPageSkeleton (bloco mais pesado)
└── error.tsx       ← captura erros inesperados da rota ("use client")
```

---

## 2. Filtros e URL State

### Schema de searchParams

```ts
// features/dashboard/schemas/dashboard-search-params.schema.ts
import { z } from 'zod'

export const dashboardSearchParamsSchema = z.object({
  period: z.enum([
    'today', 'yesterday', '3d', '7d', '15d', '30d', '60d', '90d', 'thisMonth', 'lastMonth'
  ]).default('7d'),
  type: z.enum(['any', 'paid', 'organic']).default('any'),
})

export type DashboardSearchParams = z.infer<typeof dashboardSearchParamsSchema>
```

Usado tanto no Server Component (`page.tsx`) quanto no `DashboardFilterBar` (client) para derivar valores corretos.

### Filtros que permanecem

| Filtro | Param URL | Default | Tipo |
|--------|-----------|---------|------|
| Período | `period` | `7d` | select |
| Tipo de tráfego | `type` | `any` | select |

### Filtros que somem

- `trafficSource` — substituído pela tabela de origens (T7).
- `itemCategory` / `item` — eram filtros de vendas, não de KPI executivo.

### `DashboardFilterBar` (client component)

```tsx
'use client'
// lê searchParams da URL via useSearchParams()
// atualiza via router.replace — URL é a fonte de verdade
// nunca usa useState para filtros compartilháveis
// props: nenhuma (lê diretamente da URL)
// renderiza: FilterSelect (período) + FilterSelect (tipo) + HardRefreshButton
```

### `HardRefreshButton` (client component)

Usa `useForceSync` mutation de `mutations/use-force-sync-mutation.ts`.

- Botão no header: ícone `RefreshCw`.
- Estado: idle → loading (spinner) → success ("Atualizado") → idle após 3s.
- Se job já enfileirado, API retorna `{ status: 'already_queued' }` — UI mostra "Aguardando...".
- Desabilitado enquanto loading.

### Mutation de hard refresh

```ts
// features/dashboard/mutations/use-force-sync-mutation.ts
'use client'
import { useMutation } from '@tanstack/react-query'
import { apiFetch } from '@/lib/http/api-client'

export function useForceSync(organizationId: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch('/api/v1/meta-ads/sync/force', {
        method: 'POST',
        orgId: organizationId,
      }),
  })
}
```

---

## 3. Scorecard Executivo

### Layout geral

Grid de 4 colunas (xl), 2 colunas (md), 1 coluna (mobile).
Dividido em 4 grupos com cabeçalho de seção.

### Grupo 1 — Receita

| Card | Valor | Tendência | Fonte |
|------|-------|-----------|-------|
| Receita Realizada | `completedRevenue` | vs período anterior | `DashboardDailyMetric` |
| Receita Pendente | `pendingRevenue` | — | `DashboardDailyMetric` |
| Pipeline Aberto | `openPipelineValue` | — | `DashboardDailyMetric` |
| Forecast Ponderado | `weightedPipelineValue` | — | `DashboardDailyMetric` |

### Grupo 2 — Mídia Paga (Meta)

Cabeçalho do grupo inclui `MetaFreshnessBadge`.

| Card | Fórmula | Null-safe | Fonte |
|------|---------|-----------|-------|
| Investimento | `SUM(metaSpend)` | mostra `R$ 0` | `DashboardDailyMetric` |
| ROAS | `attributedMetaRevenue / metaSpend` | `—` se spend = 0 | calculado no service |
| CAC | `metaSpend / attributedMetaSales` | `—` se vendas = 0 | calculado no service |
| CPL | `metaSpend / paidLeads` | `—` se leads = 0 | calculado no service |

Se Meta não conectada: grupo inteiro mostra `EmptyMetaState` com CTA para configurar integração.

### Grupo 3 — Aquisição

| Card | Valor | Tendência | Fonte |
|------|-------|-----------|-------|
| Leads | `totalLeads` | vs período anterior | `DashboardDailyMetric` |
| Vendas Realizadas | `completedSales` | vs período anterior | `DashboardDailyMetric` |
| Conversão | `completedSales / totalLeads` | — | calculado no service |

### Grupo 4 — Operação

| Card | Valor | Alerta | Fonte |
|------|-------|--------|-------|
| SLA P50 | `firstResponseP50Sec` formatado como `Xm Ys` | warning se > SLA configurado | `DashboardDailyMetric` |
| SLA P90 | `firstResponseP90Sec` | warning se > 2× SLA | `DashboardDailyMetric` |
| Aguardando Resposta | `waitingConversations` | destructive se > 0 | snapshot atual ou read model |

### Cards com valor nulo (`null`)

- Mostrar `—` (em dash), nunca `0` quando dado ausente por motivo semântico (ex: ROAS sem spend).
- Tooltip explicativo no `—`: "Sem investimento no período" ou "Dados Meta não disponíveis".

### DashboardMetricCard — propriedades novas necessárias

Componente atual já suporta `colSpan`, `rowSpan`, `isLoading`, `trend`. Adicionar:

```tsx
nullLabel?: string    // texto do tooltip quando value é null
alert?: 'warning' | 'destructive'  // borda colorida no card
```

---

## 4. MetaFreshnessBadge (server component)

Lê `syncedAt` mais recente de `MetaAdInsightDaily` para a org/projeto.

### Estados

| Estado | Condição | Badge variant | Texto |
|--------|----------|---------------|-------|
| Atualizado | `syncedAt < staleInsightAfterMin` | `success` | "Atualizado X min atrás" |
| Desatualizado | `syncedAt >= staleInsightAfterMin` | `warning` | "Dados com Xh de atraso" |
| Nunca sincronizou | `syncedAt = null`, Meta conectada | `destructive` | "Nunca sincronizado" |
| Sem Meta | Meta não configurada | `default` | "Meta não conectada" |

`staleInsightAfterMin` vem de `OrganizationAnalyticsSettings` (default: 180 min).

Badge fica no cabeçalho do Grupo 2 (Mídia Paga), à direita do título do grupo.

---

## 5. Funil

### Etapas (sem Agendamentos e Comparecimentos)

Funil lê etapas do Kanban dinamicamente a partir de `DealStage` ordenado por `position`.

Etapas fixas no início e fim:
```
Leads → [etapas do Kanban na ordem] → Vendas Realizadas
```

Tooltip mantém: "Passaram por aqui", "Estão aqui agora", conversão vs anterior, conversão total.

### Dados do funil

Fonte: read model ou query leve em `DealStage` + `Lead` + `Sale`.
Para V1, pode ser query direta (funil muda pouco e não é o bloco mais pesado).

---

## 6. Tabela de Origens (OriginsTable)

Fonte: `DashboardOriginDailyMetric` agrupado por `originKey`.

### Colunas

| Coluna | Tipo | Ordenável |
|--------|------|-----------|
| Origem | `utmSource` + ícone por `trafficChannel` | sim |
| Tipo | badge `META_PAID` / `OTHER_PAID` / `ORGANIC` / `UNKNOWN` | sim |
| Leads | número | sim |
| Vendas | número | sim |
| Receita Realizada | moeda | sim (default desc) |
| Pipeline | moeda | sim |
| Investimento | moeda, `—` se não Meta paid | sim |
| ROAS | número com 2 casas, `—` se sem spend | sim |
| CPL | moeda, `—` se sem spend | sim |

### Estados

- Sem dados no período: `EmptyState` — "Nenhuma origem registrada neste período."
- Só origens orgânicas (sem Meta): colunas Investimento/ROAS/CPL ocultas automaticamente.

---

## 7. Tabela de Campanhas (CampaignsTable)

Fonte: `DashboardMetaEntityDailyMetric` com `level` = `campaign` | `adset` | `ad`.

### Hierarquia expansível

```
▶ Campanha A                    ← level=campaign, clique expande
    ▶ Conjunto 1                ← level=adset
        · Anúncio 1             ← level=ad
        · Anúncio 2
    ▶ Conjunto 2
▶ Campanha B
```

### Colunas

| Coluna | Tipo | Ordenável |
|--------|------|-----------|
| Nome | hierárquico com indent | sim |
| Spend | moeda | sim (default desc) |
| Impressões | número abreviado (1,2k) | sim |
| Cliques | número | sim |
| Leads | número (ctwa atribuídos) | sim |
| Vendas | número (Meta attributed) | sim |
| Receita Atribuída | moeda | sim |
| ROAS | `—` se spend = 0 | sim |
| CAC | `—` se vendas = 0 | sim |

Coluna extra por linha: `insightSyncedAt` formatado como "há X horas" — texto pequeno muted abaixo do nome.

### Estados

- Sem Meta conectada: `EmptyMetaState` com CTA de configuração.
- Meta conectada mas sem dados ainda: "Aguardando primeira sincronização..." com spinner sutil.
- Dados disponíveis mas período sem spend: tabela vazia com mensagem.

---

## 8. Skeletons e Loading States

### Regra fundamental: zero spinner em troca de tela

`loading.tsx` **nunca** usa `LoadingSpinner` nem `LoadingPage`. Sempre skeleton.

Fluxo de navegação no Next.js App Router:
```
usuário clica no link
  ↓
Next.js exibe loading.tsx do segmento de destino automaticamente
  ↓
page.tsx termina de renderizar no servidor
  ↓
loading.tsx some, página aparece
```

Skeleton no `loading.tsx` = comportamento automático, sem código extra, sem spinner.

### Quando `LoadingSpinner` / `LoadingPage` são válidos

Apenas para loading **dentro de um Client Component** que não pode usar Suspense — ex: status de upload, polling de job, ação assíncrona pós-clique. Nunca em `loading.tsx` de rota.

### Estado atual do `loading.tsx` da rota raiz

O arquivo atual (`/[org]/[proj]/loading.tsx`) usa `MetricsSkeleton` genérico que não espelha o novo layout. Precisa ser substituído:

```tsx
// ANTES — genérico, não espelha novo layout
import { MetricsSkeleton } from '@/components/skeletons'
export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <MetricsSkeleton />
      {/* ... retângulos genéricos ... */}
    </div>
  )
}

// DEPOIS — específico, espelha exatamente o scorecard executivo
import { ExecutiveDashboardSkeleton } from '@/features/dashboard/components/skeletons/executive-dashboard-skeleton'
export default function Loading() {
  return <ExecutiveDashboardSkeleton />
}
```

### Estrutura de skeletons

Primitivas já existem em `src/components/skeletons/`:
- `TableSkeleton` ✅
- `MetricsSkeleton` ✅
- `FormSkeleton` ✅

Skeletons específicos da feature em `features/dashboard/components/skeletons/`:

| Arquivo | Descrição | Usa |
|---------|-----------|-----|
| `executive-dashboard-skeleton.tsx` | layout completo da página (usado pelo `loading.tsx`) | `ScorecardSkeleton` + placeholders dos outros blocos |
| `scorecard-skeleton.tsx` | 4 grupos × 4 cards | `MetricsSkeleton` |
| `funnel-skeleton.tsx` | retângulo horizontal | `Skeleton` |
| `origins-skeleton.tsx` | tabela de origens | `TableSkeleton rows={5} columns={9}` |
| `campaigns-skeleton.tsx` | tabela de campanhas com indent | `TableSkeleton rows={4} columns={9}` |

`ExecutiveDashboardSkeleton` (para `loading.tsx`) mostra o scorecard + placeholders dos outros blocos — replica fielmente o layout real.

### `loading.tsx` atualizado

```tsx
// src/app/(dashboard)/[org]/[proj]/loading.tsx
import { ExecutiveDashboardSkeleton } from '@/features/dashboard/components/skeletons/executive-dashboard-skeleton'

export default function Loading() {
  return <ExecutiveDashboardSkeleton />
}
```

### `Suspense` interno da página

Cada bloco tem `Suspense` próprio com skeleton específico. O usuário vê o header renderizado e os blocos aparecendo progressivamente (streaming):

```tsx
// executive-dashboard-screen.tsx
<Suspense fallback={<ScorecardSkeleton />}>
  <ScorecardSection ... />
</Suspense>

<Suspense fallback={<FunnelSkeleton />}>
  <FunnelSection ... />
</Suspense>

<Suspense fallback={<OriginsSkeleton />}>
  <OriginsSection ... />
</Suspense>

<Suspense fallback={<CampaignsSkeleton />}>
  <CampaignsSection ... />
</Suspense>
```

### `error.tsx` da rota

```tsx
// src/app/(dashboard)/[org]/[proj]/error.tsx
'use client'
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div>
      <p>Erro ao carregar o dashboard.</p>
      <button type="button" onClick={reset}>Tentar novamente</button>
    </div>
  )
}
```

### Regras

- `loading.tsx` → sempre skeleton, nunca spinner.
- Skeleton espelha exatamente o layout real do bloco.
- Primitivas (`TableSkeleton`, `MetricsSkeleton`) em `src/components/skeletons/`.
- Skeletons de feature em `features/dashboard/components/skeletons/`.
- `animate-pulse` inline proibido — encapsular no skeleton da feature.
- `LoadingSpinner` / `LoadingPage` — apenas em Client Component para ação assíncrona pós-interação.

---

## 9. DTOs e Mappers

Service retorna agregação direta do banco. Mapper transforma para DTO que o componente entende.

```ts
// features/dashboard/mappers/dashboard-metric.mapper.ts
import type { DashboardDailyMetricRow } from '../types'

export type ScorecardDTO = {
  revenue: { completed: number; pending: number; pipeline: number; forecast: number }
  meta: { spend: number; roas: number | null; cac: number | null; cpl: number | null }
  acquisition: { leads: number; sales: number; conversion: number | null }
  operations: { slaP50Sec: number | null; slaP90Sec: number | null; waiting: number }
}

export function toScorecardDTO(rows: DashboardDailyMetricRow[], spend: number): ScorecardDTO {
  // agrega período, calcula ratios null-safe
}
```

Componentes recebem DTOs tipados, nunca rows cruas do banco.

## 10. Estados de Erro por Bloco

Cada bloco tem `ErrorState` próprio dentro do `Suspense`. Erros de bloco não derrubam outros blocos.

- Bloco falha → mostra `ErrorState` com botão "Tentar novamente" que chama `router.refresh()`.
- Rota falha completamente → `error.tsx` da rota captura (ver seção 8).

```tsx
// features/dashboard/components/states/
// Já existem: error-state.tsx, empty-state.tsx — reutilizar.
```

---

## 11. Migração do page-client.tsx

### O que some

- `useQuery` para buscar `/api/v1/dashboard/summary`.
- `useState` para filtros.
- Cards `Agendamentos` e `Comparecimentos`.
- `DashboardPieChart` de salesByService (sem substituto imediato — V1 remove).
- Filtros `itemCategory` e `item`.

### O que migra para URL state

```tsx
// antes
const [filters, setFilters] = React.useState<DashboardFilters>(defaultFilters)

// depois — no DashboardFilterBar (client)
const router = useRouter()
const searchParams = useSearchParams()
const period = searchParams.get('period') ?? '7d'
// router.replace(`?period=${value}`) ao mudar
```

### O que vira Server Component

```tsx
// page.tsx — fino, só composição
import { ExecutiveDashboardScreen } from '@/features/dashboard/screens/executive-dashboard-screen'
import { dashboardSearchParamsSchema } from '@/features/dashboard/schemas/dashboard-search-params.schema'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const params = dashboardSearchParamsSchema.parse({
    period: raw.period,
    type: raw.type,
  })
  return <ExecutiveDashboardScreen period={params.period} trafficType={params.type} />
}
```

---

## 12. API Route de Hard Refresh

```
POST /api/v1/meta-ads/sync/force
Authorization: session cookie (organização verificada)
Body: vazio
```

Resposta:

```json
{ "jobId": "force-sync-{orgId}", "status": "queued" }
{ "jobId": "force-sync-{orgId}", "status": "already_queued" }
```

HTTP 202 em ambos os casos. HTTP 401 se não autenticado.

---

## 13. Checklist de Aceitação Frontend

**Arquitetura (skills next-feature-architecture + next-frontend-architecture):**
- [ ] `page.tsx` está fino — chama `ExecutiveDashboardScreen`, passa `searchParams` com `await`.
- [ ] `loading.tsx` da rota importa `ExecutiveDashboardSkeleton` — sem spinner, sem skeleton genérico.
- [ ] `error.tsx` existe na rota, com `"use client"` e botão de retry.
- [ ] Nenhum Client Component importa service, repository ou `db`.
- [ ] `useForceSync` mutation em `mutations/` — componente não faz `fetch` direto.
- [ ] `dashboardSearchParamsSchema` valida `searchParams` antes de passar aos serviços.
- [ ] Skeletons de feature em `features/dashboard/components/skeletons/`, não inline.
- [ ] Componentes respeitam ~150 linhas — subcomponentes extraídos quando necessário.
- [ ] Mapper `toScorecardDTO` converte dados do service para DTO antes de passar ao componente.

**Funcionalidade:**
- [ ] Filtros em URL state, sem `useState` para period/type.
- [ ] Cada bloco tem `Suspense` com skeleton próprio.
- [ ] Scorecard não mostra Agendamentos nem Comparecimentos.
- [ ] Cards nulos mostram `—` com tooltip, não `0`.
- [ ] `MetaFreshnessBadge` exibe estado correto nos 4 cenários.
- [ ] `HardRefreshButton` desabilita durante loading, deduplicada via `jobId` no BullMQ.
- [ ] Tabela de origens oculta colunas Meta quando não há Meta paid.
- [ ] Tabela de campanhas expande hierarquia campaign → adset → ad.
- [ ] `LoadingSpinner` / `LoadingPage` ausentes de qualquer `loading.tsx` de rota.
- [ ] Nenhum bloco depende de `useEffect` para buscar dados iniciais.
- [ ] Filtros mudam URL sem full page reload (`router.replace`).
- [ ] Erro em um bloco não derruba outros blocos.
- [ ] `DashboardPieChart` de salesByService removido (V1).

---

**Status:** spec detalhada para execução
