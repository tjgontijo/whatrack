# Padrão P1 — CrudPageShell

> Layout padrão para páginas de listagem com múltiplas visualizações, busca inline e filtros em drawer.

## Anatomia visual

```
[Título]  [Lista | Cards | Kanban]          [buscar...]  |  [+ Novo]  [⊞]  [↺]
──────────────────────────────────────────────────────────────────────────────
[conteúdo full-height com scroll próprio]
```

- **Título** — `text-sm font-semibold`, identifica a entidade
- **ViewSwitcher** — pill-style, exibe apenas views disponíveis para o device
- **Search** — ghost input `w-44`, sem borda, placeholder discreto
- **Separador** — linha `h-4 w-px bg-border` separa search dos botões
- **+ Novo** — `Button size="sm"`, abre drawer/dialog de criação
- **⊞ Filtros** — `SlidersHorizontal`, abre Sheet lateral com filtros estruturados
- **↺ Refresh** — `RefreshCw`, recarrega dados via `refetch()` do hook

---

## API do componente

```tsx
// src/components/dashboard/crud/crud-page-shell.tsx

interface CrudPageShellProps {
  title: string

  // Visualização
  view: ViewType                         // 'list' | 'cards' | 'kanban'
  setView: (view: ViewType) => void
  enabledViews?: ViewType[]              // default: ['list', 'cards']

  // Busca
  searchInput: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string

  // Ações primárias
  onAdd?: () => void                     // mostra botão "+ Novo" se definido
  addLabel?: string                      // default: "Novo"
  onRefresh?: () => void                 // mostra botão ↺ se definido
  isRefreshing?: boolean

  // Conteúdo extra à direita (ex: contadores)
  actions?: ReactNode

  // Filtros (renderizados dentro do Sheet)
  filters?: ReactNode                    // deve ter labels próprias

  // Estado
  isFetchingMore?: boolean
  isLoading?: boolean

  children: ReactNode
}
```

### Regras dos filtros

O `filters` é renderizado **dentro do Sheet** sem wrapper adicional. Cada filtro deve ter sua própria label:

```tsx
// ✅ Correto — com label
const filtersNode = (
  <div className="space-y-1.5">
    <p className="text-muted-foreground text-xs font-medium">Período</p>
    <Select value={dateRange} onValueChange={setDateRange}>
      <SelectTrigger className="border-border h-8 w-full text-xs">
        <SelectValue />
      </SelectTrigger>
      ...
    </Select>
  </div>
)

// ❌ Errado — sem label, parece largado
const filtersNode = (
  <Select value={dateRange} onValueChange={setDateRange}>
    <SelectTrigger className="h-7 w-36 text-xs">
```

---

## Mapeamento de páginas

| Página | Rota | Arquivo | Views | onAdd | onRefresh | filters |
|--------|------|---------|-------|-------|-----------|---------|
| **Leads** | `/leads` | `leads/client-leads-table.tsx` | Lista, Cards | ✅ | ✅ | Período |
| **Tickets** | `/tickets` | `tickets/page.tsx` | Lista, Cards, Kanban | — | ✅ | Status, Data |
| **Vendas** | `/sales` | `sales/client-sales-table.tsx` | Lista, Cards | — | ✅ | Status, Data |
| **Projetos** | `/projects` | `projects/project-list.tsx` | Lista, Cards | ✅ | ✅ | — |
| **Campanhas** | `/whatsapp/campaigns` | `whatsapp/campaigns/campaigns-page.tsx` | Lista, Cards | ✅ | ✅ | — |
| **Templates WA** | `/settings/whatsapp/[id]/templates` | `whatsapp/settings/templates-view.tsx` | Lista, Cards | ✅ | — | — |
| **Itens** | `/settings/catalog` (aba Itens) | `items/items-table.tsx` | Lista, Cards | ✅ | ✅ | Categoria, Status |
| **Categorias** | `/settings/catalog` (aba Categorias) | `item-categories/categories-table.tsx` | Lista, Cards | ✅ | ✅ | Status |

---

## Estrutura de dados

Todos os consumers usam `useCrudInfiniteQuery` que retorna:

```tsx
const {
  data,           // T[] — página achatada
  total,          // número total de registros
  fetchNextPage,  // carrega próxima página (infinite scroll)
  hasNextPage,    // boolean
  isFetchingNextPage,
  isLoading,
  refetch,        // → passar como onRefresh={() => void refetch()}
} = useCrudInfiniteQuery<T>({
  queryKey: ['chave-unica'],
  endpoint: '/api/v1/endpoint',
  pageSize: 30,
  filters,        // objeto com filtros ativos
})
```

---

## Quando usar este padrão

Use `CrudPageShell` quando a página:

- Exibe uma **lista de entidades** com paginação infinita
- Oferece **múltiplas visualizações** (lista, cards, kanban)
- Precisa de **busca inline** e/ou **filtros**
- Tem uma **ação primária de criação** (drawer/dialog)

### Quando NÃO usar

| Situação | Padrão correto |
|----------|----------------|
| Página de configuração/formulário | `PageShell + PageHeader` (P3) |
| Dashboard com métricas e gráficos | `PageShell` customizado (P2) |
| UI full-screen (inbox, kanban global) | Layout próprio (P5) |
| Lista pequena dentro de settings | `SectionShell` com tabela simples |

---

## Checklist ao criar novo consumer

- [ ] Usar `useCrudInfiniteQuery` para busca de dados
- [ ] Extrair `refetch` e passar como `onRefresh`
- [ ] Definir `enabledViews` adequado para a entidade
- [ ] Se tiver `filters`, envolver cada select com `<div className="space-y-1.5">` + label
- [ ] Selects dentro do sheet: `h-8 w-full` (não `h-7 w-36`)
- [ ] `addLabel` só necessário se diferente de "Novo"
- [ ] `actions` apenas para metadados extras (contadores), nunca botões

---

## Componentes relacionados

| Componente | Localização | Papel |
|-----------|-------------|-------|
| `ViewSwitcher` | `crud/view-switcher.tsx` | Pill-style, filtra views por device |
| `CrudDataView` | `crud/crud-data-view.tsx` | Roteador de visualização (list/cards/kanban) |
| `CrudListView` | `crud/crud-list-view.tsx` | Tabela com infinite scroll |
| `CrudCardView` | `crud/crud-card-view.tsx` | Grid de cards com infinite scroll |
| `CrudKanbanView` | `crud/crud-kanban-view.tsx` | Kanban drag-and-drop |
| `CrudEmptyState` | `crud/crud-data-view.tsx` | Estado vazio padrão |
| `useCrudInfiniteQuery` | `hooks/ui/use-crud-infinite-query.ts` | Hook de paginação infinita |
