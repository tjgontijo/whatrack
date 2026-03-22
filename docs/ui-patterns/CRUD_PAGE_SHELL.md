# Padrão P1 — HeaderPageShell

> Layout canônico para páginas do dashboard, com ordem fixa de header e um único seletor visual por tela.

## Anatomia visual

```
[Título]  [Selector]                [buscar...]  |  [Actions]  [+ Novo]  [⊞]  [↺]
─────────────────────────────────────────────────────────────────────────────────
[Body wrapper: px-6 py-6]
[conteúdo full-height com scroll próprio]
```

- **Título** — `text-sm font-semibold`, identifica a tela
- **Selector** — slot único; recebe `HeaderTabs` ou `ViewSwitcher`
- **Search** — ghost input `w-44`, sem borda, placeholder discreto
- **Separador** — aparece apenas quando existe busca e também existem controles à direita
- **Actions** — ações secundárias específicas da página
- **Primary action** — CTA principal da tela
- **⊞ Filtros** — `SlidersHorizontal`, abre `Sheet` lateral com filtros estruturados
- **↺ Refresh** — botão padrão do shell ou `refreshAction` customizado
- **Body wrapper** — `HeaderPageShell` é dono do frame do conteúdo com `px-6 py-6`

---

## API do componente

```tsx
// src/components/dashboard/layout/header-page-shell.tsx

interface HeaderPageShellProps {
  title: string
  selector?: ReactNode

  // Busca
  searchValue?: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string

  // Ações
  actions?: ReactNode
  primaryAction?: ReactNode
  filters?: ReactNode
  onRefresh?: () => void
  isRefreshing?: boolean
  refreshAction?: ReactNode

  // Estado
  isFetchingMore?: boolean
  isLoading?: boolean

  children: ReactNode
}
```

### Regra do selector

- Toda página tem no máximo **um selector visual** no header.
- Se a página usa `tabs`, ela **não** usa `ViewSwitcher`.
- Se uma página tabada também tinha múltiplas visualizações, ela deve priorizar `list`.

### Regra do body spacing

- Toda página com `HeaderPageShell` recebe frame padrão `px-6 py-6`.
- O primeiro nível do conteúdo não deve usar `p-6`, `pt-6` ou `mt-6` para compensar o header.
- `Card`, `Dialog`, `Drawer`, tabelas e superfícies internas continuam com padding próprio.

### Regras dos filtros

O `filters` continua sendo renderizado **dentro do Sheet** sem wrapper adicional. Cada filtro deve ter sua própria label:

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
| **Leads** | `/leads` | `leads/client-leads-table.tsx` | `ViewSwitcher` | ✅ | ✅ | Período |
| **Tickets** | `/tickets` | `tickets/page.tsx` | `ViewSwitcher` | — | ✅ | Status, Data |
| **Vendas** | `/sales` | `sales/client-sales-table.tsx` | `ViewSwitcher` | — | ✅ | Status, Data |
| **Projetos** | `/projects` | `projects/project-list.tsx` | `ViewSwitcher` | ✅ | ✅ | — |
| **Campanhas WA** | `/whatsapp/campaigns` | `whatsapp/campaigns/campaigns-page.tsx` | `HeaderTabs` | ✅ | ✅ | — |
| **WhatsApp settings** | `/settings/whatsapp` | `whatsapp/settings/whatsapp-settings-hub.tsx` | `HeaderTabs` | ✅ | ✅ | — |
| **Equipe** | `/settings/team` | `account/team-settings-shell.tsx` | `HeaderTabs` | — | ✅ | — |
| **Settings simples** | `/settings/*` | páginas server-side | — | — | opcional | — |

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

Use `HeaderPageShell` quando a página:

- Precisa seguir o header padrão do dashboard
- Pode ter `tabs` ou `ViewSwitcher`, mas nunca ambos
- Pode ter busca inline, ações, CTA primário, filtros e refresh
- Precisa de conteúdo full-height com scroll próprio e loading padronizado

### Quando NÃO usar

| Situação | Padrão correto |
|----------|----------------|
| UI full-screen (inbox, kanban global) | Layout próprio |
| Bloco interno dentro de uma página maior | `SectionShell` / `SectionHeader` |
| Tabset interno de conteúdo, não de página | `Tabs` locais do domínio |

---

## Checklist ao criar novo consumer

- [ ] Usar `useCrudInfiniteQuery` para busca de dados
- [ ] Se houver selector, escolher entre `HeaderTabs` e `ViewSwitcher`
- [ ] Extrair `refetch` e passar como `onRefresh` ou `refreshAction`
- [ ] Definir `enabledViews` só para páginas sem tabs
- [ ] Não adicionar `p-6`, `pt-6` ou `mt-6` no primeiro nível do child do shell
- [ ] Se tiver `filters`, envolver cada select com `<div className="space-y-1.5">` + label
- [ ] Selects dentro do sheet: `h-8 w-full` (não `h-7 w-36`)
- [ ] `primaryAction` é o slot certo para o CTA principal
- [ ] `actions` ficam restritas a controles secundários

---

## Componentes relacionados

| Componente | Localização | Papel |
|-----------|-------------|-------|
| `HeaderPageShell` | `layout/header-page-shell.tsx` | Shell único do dashboard |
| `HeaderTabs` | `layout/header-tabs.tsx` | Tabs pill-style para o slot de selector |
| `ViewSwitcher` | `crud/view-switcher.tsx` | Pill-style, filtra views por device |
| `CrudDataView` | `crud/crud-data-view.tsx` | Roteador de visualização (list/cards/kanban) |
| `CrudListView` | `crud/crud-list-view.tsx` | Tabela com infinite scroll |
| `CrudCardView` | `crud/crud-card-view.tsx` | Grid de cards com infinite scroll |
| `CrudKanbanView` | `crud/crud-kanban-view.tsx` | Kanban drag-and-drop |
| `CrudEmptyState` | `crud/crud-data-view.tsx` | Estado vazio padrão |
| `useCrudInfiniteQuery` | `hooks/ui/use-crud-infinite-query.ts` | Hook de paginação infinita |
