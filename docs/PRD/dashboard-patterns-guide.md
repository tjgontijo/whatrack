# Dashboard Patterns Guide - Padronização de Páginas

**Complemento ao:** dashboard-redesign-prd.md
**Data:** 26 de Fevereiro de 2025

---

## 🔍 Análise das Páginas Existentes

### Problemas Identificados

#### 1. **Containers Inconsistentes**

```tsx
// ❌ Dashboard Home
<div className="space-y-8">  // sem container

// ❌ Minha Conta
<div className="mx-auto w-full max-w-5xl">  // max-w-5xl

// ❌ WhatsApp Settings
<TemplateMainShell className="flex h-[calc(100vh-2rem)]">  // altura customizada

// ❌ Leads
<div className="bg-muted/5 flex h-full w-full flex-col">  // bg diferente

// ❌ Tickets (usa CrudPageShell - melhor!)
<CrudPageShell>  // ✅ O mais consistente
```

**Problema:** Cada página usa container diferente!

---

#### 2. **Headers Inconsistentes**

```tsx
// Dashboard Home - SEM header visível
HeaderActions  // só actions no header global

// Minha Conta - Header inline
<div>
  <h1>Minha Conta</h1>
  <p>Gerencie seus dados...</p>
</div>

// WhatsApp Settings - TemplateMainHeader
<TemplateMainHeader
  title="Instâncias WhatsApp"
  subtitle="Gerencie..."
  actions={...}
/>

// Tickets - Dentro do CrudPageShell
<CrudPageShell title="Tickets" icon={Ticket}>
```

**Problema:** 4 patterns diferentes de header!

---

#### 3. **Loading States Inconsistentes**

```tsx
// Dashboard Home
{isFetching && (
  <div className="border-muted-foreground/40 h-12 w-12 animate-spin rounded-full border-2" />
)}

// Leads
<RefreshCw className="h-4 w-4 animate-spin opacity-50" />

// WhatsApp
<RefreshCw className="text-primary/40 h-8 w-8 animate-spin" />

// Tickets (usa CrudPageShell)
isLoading={isLoading}  // ✅ Melhor!
```

**Problema:** 3 spinners diferentes, tamanhos variados, cores diferentes!

---

#### 4. **Empty/Error States Inconsistentes**

```tsx
// Dashboard - NÃO TEM empty state

// WhatsApp - Error state customizado inline
<div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
  <Phone className="text-destructive h-6 w-6" />
</div>
<h3>Erro ao carregar...</h3>

// Tickets - Usa CrudEmptyState ✅
<CrudEmptyState />
```

**Problema:** Alguns têm, outros não. Quando têm, são diferentes!

---

#### 5. **Filters Inconsistentes**

```tsx
// Dashboard Home - FilterSelect inline (391-411)
function FilterSelect({ label, value, options... }) {
  // 20 linhas de código inline!
}

// Desktop: Card com grid
<section className="border-border/60 bg-card rounded-2xl border p-6">
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

// Mobile: Sheet
<Sheet>
  <SheetContent side="bottom">
```

**Problema:** FilterSelect deveria ser componente reutilizável!

---

#### 6. **Modals: Dialog vs Drawer**

```tsx
// Leads - Usa Drawer ✅
<NewLeadDrawer />

// Dashboard - Usa Sheet (mobile)
<Sheet><SheetContent side="bottom">

// Tickets - Edit via CrudEditDrawer
```

**Problema:** Quando usar Dialog vs Drawer vs Sheet?

---

## ✅ O Que Está BOM (Manter!)

### CrudPageShell (Tickets)

```tsx
<CrudPageShell
  title="Tickets"
  icon={Ticket}
  view={view}
  setView={setView}
  enabledViews={['list', 'cards', 'kanban']}
  searchInput={searchInput}
  onSearchChange={setSearchInput}
  totalItems={total}
  filters={filtersNode}
  isLoading={isLoading}
>
  <CrudDataView ... />
</CrudPageShell>
```

**Por que é bom:**
- ✅ Tudo padronizado (header, toolbar, loading, mobile/desktop)
- ✅ ViewSwitcher integrado
- ✅ Search + filters consistentes
- ✅ FAB automático
- ✅ Skeleton loading

**Usar como base para novo PageShell!**

---

## 🎯 Componentes a Extrair (Code Inline → Components)

### 1. FilterSelect (Dashboard)

**Atual:** 20 linhas inline em `dashboard/page.tsx:391-411`

```tsx
// ❌ ANTES (inline)
function FilterSelect({ label, value, options, onValueChange, disabled }: FilterSelectProps) {
  return (
    <div className="w-full space-y-2">
      <label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        ...
      </Select>
    </div>
  )
}
```

**Mover para:** `src/components/dashboard/filters/filter-select.tsx`

---

### 2. TableSkeleton/LoadingSpinner

**Atual:** 3 patterns diferentes

```tsx
// Leads
<RefreshCw className="h-4 w-4 animate-spin opacity-50" />

// Sales
<RefreshCw className="text-primary/40 h-8 w-8 animate-spin" />

// WhatsApp
<RefreshCw className="text-primary/40 h-8 w-8 animate-spin" />
```

**Padronizar:**

```tsx
// ✅ DEPOIS
import { LoadingSpinner, LoadingCard, LoadingPage } from '@/components/dashboard/loading'

<LoadingSpinner size="lg" />
<LoadingCard />
<LoadingPage message="Carregando..." />
```

---

### 3. ErrorState

**Atual:** Inline em várias páginas

```tsx
// WhatsApp (linhas 160-184)
<div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-4 py-12">
  <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
    <Phone className="text-destructive h-6 w-6" />
  </div>
  <div className="text-center">
    <h3 className="text-lg font-semibold">Erro ao carregar instâncias</h3>
    <p className="text-muted-foreground text-sm">{errorMessage}</p>
  </div>
  <Button onClick={() => refetch()} variant="outline" size="sm">
    Tentar novamente
  </Button>
</div>
```

**Padronizar:**

```tsx
// ✅ DEPOIS
import { ErrorState } from '@/components/dashboard/error-state'

<ErrorState
  icon={Phone}
  title="Erro ao carregar instâncias"
  message={errorMessage}
  action={<Button onClick={refetch}>Tentar novamente</Button>}
/>
```

---

### 4. PageHeader

**Atual:** 3 patterns

```tsx
// Minha Conta - inline
<div>
  <h1 className="text-2xl font-semibold">Minha Conta</h1>
  <p className="text-muted-foreground text-sm">Gerencie...</p>
</div>

// WhatsApp - TemplateMainHeader
<TemplateMainHeader
  title="Instâncias WhatsApp"
  subtitle="..."
  actions={...}
/>

// Tickets - no CrudPageShell
title="Tickets" icon={Ticket}
```

**Padronizar:**

```tsx
// ✅ DEPOIS
import { PageHeader } from '@/components/dashboard/layout/page-header'

<PageHeader
  title="Instâncias WhatsApp"
  description="Gerencie seus números conectados"
  icon={Phone}
  actions={<Button>Nova Instância</Button>}
/>
```

---

## 📐 Guia de Decisão: Patterns Padronizados

### Container Width

**Regra simples:**

```tsx
// ✅ PADRÃO 1: Full Width (Listas, Tables, Dashboards)
<PageShell>  // sem max-width
  <DataTable ... />
</PageShell>

// ✅ PADRÃO 2: Centered Content (Forms, Settings)
<PageShell maxWidth="3xl">  // max-w-3xl
  <SettingsForm />
</PageShell>
```

**Quando usar qual:**

| Tipo de Página | Container | Exemplo |
|---|---|---|
| Dashboard/Analytics | Full width | Dashboard home, ROI |
| Listas (CRUD) | Full width | Leads, Sales, Tickets |
| Forms/Settings | max-w-3xl | Minha Conta, Pipeline Settings |
| Detail Views | max-w-5xl | Lead detail, Sale detail |
| Empty States | max-w-2xl | "Nenhum lead encontrado" |

---

### Dialog vs Drawer vs Sheet

**Regra simples:**

```tsx
// ✅ Drawer (Lado) - Edição/Visualização
<Drawer side="right">  // 600px width
  <LeadEditForm />
</Drawer>

// ✅ Dialog (Centro) - Confirmações/Alertas
<Dialog>
  <AlertDialog>Tem certeza?</AlertDialog>
</Dialog>

// ✅ Sheet (Bottom) - Mobile Filters/Actions
<Sheet side="bottom">
  <MobileFilters />
</Sheet>
```

**Quando usar qual:**

| Ação | Component | Razão |
|---|---|---|
| Criar/Editar item | Drawer (right) | Contexto, não modal |
| Ver detalhes | Drawer (right) | Pode navegar enquanto vê |
| Confirmar exclusão | Dialog (center) | Atenção total, decisão importante |
| Filtros (mobile) | Sheet (bottom) | Acesso rápido, não bloqueia |
| Criar quick (mobile) | Sheet (bottom) | Thumb-friendly |

---

### Loading States

**Regra simples:**

```tsx
// ✅ PADRÃO 1: Inline Spinner
<LoadingSpinner size="sm" />  // dentro de button

// ✅ PADRÃO 2: Card Loading
<LoadingCard />  // placeholder de card

// ✅ PADRÃO 3: Page Loading
<LoadingPage message="Carregando leads..." />

// ✅ PADRÃO 4: Table Loading (Skeleton)
<TableSkeleton rows={5} />
```

**Quando usar qual:**

| Contexto | Component | Aparência |
|---|---|---|
| Button loading | `<LoadingSpinner size="sm" />` | Spinner pequeno |
| Card sendo carregado | `<LoadingCard />` | Skeleton do card |
| Página inteira | `<LoadingPage />` | Centralizado + mensagem |
| Tabela | `<TableSkeleton rows={5} />` | 5 linhas de skeleton |
| Metric loading | `isLoading` prop no MetricCard | Shimmer effect |

---

## 🎨 Padrões de Layout Definidos

### Layout 1: Dashboard (Full Width)

```tsx
<PageShell>
  <PageHeader title="Visão Geral" actions={<DatePicker />} />

  <PageContent>
    {/* Filters (opcional) */}
    <FilterBar>
      <FilterSelect ... />
    </FilterBar>

    {/* Metrics Grid */}
    <MetricGrid cols={4}>
      <MetricCard ... />
    </MetricGrid>

    {/* Charts */}
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <Card>...</Card>
    </div>
  </PageContent>
</PageShell>
```

**Uso:** Dashboard Home, Analytics, ROI Meta Ads

---

### Layout 2: CRUD List (Full Width)

```tsx
<PageShell>
  <PageHeader
    title="Leads"
    actions={
      <>
        <Button variant="outline">Exportar</Button>
        <Button>Novo Lead</Button>
      </>
    }
  />

  <PageToolbar>
    <SearchInput />
    <FilterGroup>...</FilterGroup>
    <ViewSwitcher />
  </PageToolbar>

  <PageContent>
    {isLoading && <LoadingPage />}
    {!isLoading && data.length === 0 && <EmptyState />}
    {!isLoading && data.length > 0 && <DataTable ... />}
  </PageContent>
</PageShell>
```

**Uso:** Leads, Sales, Tickets, Items

---

### Layout 3: Settings/Forms (Centered)

```tsx
<PageShell maxWidth="3xl">
  <PageHeader
    title="Minha Conta"
    description="Gerencie seus dados pessoais e segurança"
  />

  <PageContent>
    <Tabs>
      <TabsList>
        <TabsTrigger>Geral</TabsTrigger>
        <TabsTrigger>Segurança</TabsTrigger>
      </TabsList>

      <TabsContent>
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <Form>...</Form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </PageContent>
</PageShell>
```

**Uso:** Minha Conta, Pipeline Settings, AI Settings

---

### Layout 4: Grid View (Full Width)

```tsx
<PageShell>
  <PageHeader
    title="Instâncias WhatsApp"
    description="Gerencie seus números conectados"
    actions={<Button>Nova Instância</Button>}
  />

  <PageToolbar>
    <SearchInput />
    <Button variant="outline">Atualizar</Button>
  </PageToolbar>

  <PageContent>
    {isLoading && <LoadingPage />}
    {!isLoading && items.length === 0 && <EmptyState />}
    {!isLoading && items.length > 0 && (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map(item => <ItemCard key={item.id} {...item} />)}
      </div>
    )}
  </PageContent>
</PageShell>
```

**Uso:** WhatsApp Instances, Meta Ads Accounts

---

## 🔨 Action Plan: Padronização

### Fase 1: Criar Componentes Base

```bash
# Criar estrutura
src/components/dashboard/
  ├── layout/
  │   ├── page-shell.tsx         # ✅ Container wrapper
  │   ├── page-header.tsx        # ✅ Header padronizado
  │   ├── page-toolbar.tsx       # ✅ Toolbar de filtros
  │   └── page-content.tsx       # ✅ Content area
  ├── filters/
  │   ├── filter-select.tsx      # ✅ Extrair do dashboard
  │   ├── filter-bar.tsx         # ✅ Container de filtros
  │   └── search-input.tsx       # ✅ Input de busca padronizado
  ├── states/
  │   ├── loading-spinner.tsx    # ✅ Spinner consistente
  │   ├── loading-card.tsx       # ✅ Card skeleton
  │   ├── loading-page.tsx       # ✅ Page loading
  │   ├── table-skeleton.tsx     # ✅ Table skeleton
  │   ├── empty-state.tsx        # ✅ Empty state
  │   └── error-state.tsx        # ✅ Error state
  └── data/
      └── metric-grid.tsx        # ✅ Grid de métricas
```

---

### Fase 2: Migrar Páginas

**Ordem (do mais simples ao mais complexo):**

1. ✅ **Minha Conta** (1h)
   - Header inline → PageHeader
   - Container → PageShell maxWidth="3xl"

2. ✅ **WhatsApp Settings** (2h)
   - TemplateMainHeader → PageHeader
   - Extrair ErrorState
   - Extrair LoadingPage

3. ✅ **Dashboard Home** (3h)
   - Sem header → PageHeader
   - FilterSelect inline → componente
   - Loading states → padronizados

4. ✅ **Leads/Sales** (1h cada)
   - Já usa Suspense
   - Loading inline → LoadingPage

5. ✅ **Tickets** (2h)
   - Refinar CrudPageShell
   - Tornar referência

---

### Fase 3: Documentar

```markdown
# docs/dashboard-patterns.md

## Como criar nova página

### Lista/CRUD
[Template code...]

### Settings/Forms
[Template code...]

### Dashboard/Analytics
[Template code...]
```

---

## 🎯 Checklist de Padronização

Antes de considerar página "padronizada":

- [ ] Usa `PageShell` (ou `CrudPageShell` para CRUD)
- [ ] Usa `PageHeader` (ou dentro do CrudPageShell)
- [ ] Loading state usa componentes padronizados
- [ ] Empty state usa `<EmptyState />`
- [ ] Error state usa `<ErrorState />`
- [ ] Container width segue guia (full ou max-w-*)
- [ ] Modals seguem guia (Dialog vs Drawer vs Sheet)
- [ ] Filters mobile usam Sheet bottom
- [ ] Filters desktop usam FilterBar
- [ ] Zero código inline que deveria ser componente

---

## 📊 Métricas de Sucesso

**Antes:**
- 6 patterns de containers diferentes
- 4 patterns de headers diferentes
- 3 patterns de loading states
- Nenhum empty state consistente
- FilterSelect inline (duplicado)

**Depois (Meta):**
- ✅ 1 pattern de container (PageShell)
- ✅ 1 pattern de header (PageHeader)
- ✅ 1 pattern de loading (LoadingSpinner/Card/Page)
- ✅ 1 pattern de empty (EmptyState)
- ✅ 0 componentes inline duplicados

---

**FIM DO GUIDE**

**Próximo Passo:** Aprovação + começar Fase 1 (criar componentes base)
