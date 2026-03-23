# Padrão P1 — HeaderPageShell

> Layout canônico para páginas do dashboard, com ordem fixa de header e um único seletor visual por tela.

## Status do padrão

Este documento e **normativo** para novas telas do dashboard.

- O default do projeto e usar `HeaderPageShell` para pages e hubs do app.
- Desvios do padrão precisam de justificativa explicita no PRD e na implementacao.
- `HeaderPageShell` nao e apenas um exemplo visual. Ele e a casca canonica do dashboard.

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
- Hubs de `/settings/*` com múltiplas áreas usam `HeaderTabs` como selector principal.
- Não criar navegação lateral nova, sub-header paralelo ou segundo selector quando `HeaderTabs` resolve a navegação da página.

### Regra do body spacing

- Toda página com `HeaderPageShell` recebe frame padrão `px-6 py-6`.
- O primeiro nível do conteúdo não deve usar `p-6`, `pt-6` ou `mt-6` para compensar o header.
- `Card`, `Dialog`, `Drawer`, tabelas e superfícies internas continuam com padding próprio.

### Regra dos slots do header

- `title` identifica a tela, sempre curto e estável.
- `selector` e o slot para navegação da página, nao para filtros.
- `searchValue` e `onSearchChange` servem apenas para busca global da view ativa.
- `actions` sao controles secundarios da tela.
- `primaryAction` e o CTA principal da view ativa.
- `filters` sao sempre renderizados no `Sheet` do shell.
- `onRefresh` ou `refreshAction` sao o caminho padrao para revalidacao manual.

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
| **Settings hub operacional** | `/settings/*` com múltiplas áreas | hubs client-side | `HeaderTabs` | opcional | ✅ | opcional |
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

### Regra para settings e hubs

Use `HeaderPageShell` como regra obrigatoria quando a tela:

- fica em `/settings/*` e funciona como hub operacional
- tem tabs de alto nivel como `Agente`, `Skills`, `Policies`, `Logs`
- precisa alternar views dentro da mesma pagina
- precisa de busca, filtros, CTA ou refresh no topo

Nesses casos:

- o selector padrao e `HeaderTabs`
- a navegacao principal fica no header
- o body da pagina nao cria outro shell concorrente

### Regra para settings simples

Use `HeaderPageShell` sem selector quando a tela:

- e uma pagina de settings unica e direta
- nao tem views paralelas
- precisa apenas do frame padrao do dashboard

### Regra para composicao interna

Dentro do `HeaderPageShell`, o layout interno deve reutilizar os blocos existentes do projeto:

- formularios/configuracoes: `SettingsGroup` + `SettingsRow`
- listas e dashboards operacionais: `Card`, tabelas, componentes de dominio ou `Crud*`
- fluxos secundarios: `Dialog`, `Sheet`, `Drawer` ou conteudo condicional dentro do mesmo hub

Evite:

- inventar um novo shell interno
- adicionar `p-6`, `pt-6` ou `mt-6` no primeiro nivel
- trocar `HeaderTabs` por navegacao lateral em telas de hub
- abrir rota dedicada de detalhe sem necessidade real de deep link ou contexto isolado

### Quando NÃO usar

| Situação | Padrão correto |
|----------|----------------|
| UI full-screen (inbox, kanban global) | Layout próprio |
| Bloco interno dentro de uma página maior | `SectionShell` / `SectionHeader` |
| Tabset interno de conteúdo, não de página | `Tabs` locais do domínio |

### Regra para telas dentro de telas

Quando o componente e apenas uma secao interna de outra pagina:

- nao usar `HeaderPageShell`
- nao repetir header, busca, filtros ou refresh do shell pai
- usar composicao local com `SectionShell`, `Card`, `SettingsGroup` ou componente de dominio

Isso vale para blocos como timeline no inbox, painéis laterais e secões internas de hubs.

---

## Regra de fluxo e navegação

Antes de criar uma rota secundaria, preferir:

- `Dialog`
- `Sheet`
- `Drawer`
- conteudo condicional no mesmo hub

Criar sub-rota so quando houver pelo menos um destes motivos:

- deep link e importante
- o editor e suficientemente complexo e independente
- existe contexto/permissao diferente da listagem
- a tela deixa de ser um hub e vira um fluxo proprio

Se a rota secundaria for criada, o PRD deve justificar explicitamente essa escolha.

---

## Regra para PRDs de frontend

Todo PRD que mexe em frontend de dashboard deve declarar explicitamente:

1. qual shell a tela usa
2. qual selector ocupa o header, se houver
3. quais slots do header serao usados
4. como o body sera composto
5. se edicao acontece inline, em `Dialog`/`Sheet`/`Drawer` ou em rota propria

Checklist minimo do PRD:

- [ ] Declarar `HeaderPageShell` ou justificar por que nao usa
- [ ] Declarar `HeaderTabs` ou `ViewSwitcher` quando houver selector
- [ ] Declarar se a tela e hub de settings ou pagina simples
- [ ] Declarar busca, filtros, CTA e refresh usando os slots do shell
- [ ] Declarar composicao com `SettingsGroup`/`SettingsRow`, `Card`, tabela ou `Crud*`
- [ ] Declarar estados de loading, empty e erro sem criar outro frame paralelo

---

## Checklist ao criar novo consumer

- [ ] Usar `useCrudInfiniteQuery` para busca de dados
- [ ] Se houver selector, escolher entre `HeaderTabs` e `ViewSwitcher`
- [ ] Se for hub em `/settings/*`, usar `HeaderTabs` como selector principal
- [ ] Extrair `refetch` e passar como `onRefresh` ou `refreshAction`
- [ ] Definir `enabledViews` só para páginas sem tabs
- [ ] Não adicionar `p-6`, `pt-6` ou `mt-6` no primeiro nível do child do shell
- [ ] Se tiver `filters`, envolver cada select com `<div className="space-y-1.5">` + label
- [ ] Selects dentro do sheet: `h-8 w-full` (não `h-7 w-36`)
- [ ] `primaryAction` é o slot certo para o CTA principal
- [ ] `actions` ficam restritas a controles secundários
- [ ] Reutilizar `SettingsGroup` + `SettingsRow` para formularios/config
- [ ] Evitar rota de detalhe quando `Dialog`/`Sheet`/`Drawer` ou o proprio hub resolvem

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
