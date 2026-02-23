'use client'

import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { SectionWrapper, ShowcaseBox } from './shared'

const shells = [
  {
    name: 'CrudPageShell',
    description:
      'Shell padrão de páginas CRUD. Header opcional (showTitle) + ViewSwitcher + Toolbar + Content com infinite scroll. Sem paginação.',
    structure: [
      { label: 'Page Header opcional (ícone + título + ações)', height: 'h-14' },
      { label: 'ViewSwitcher (list / cards / kanban)', height: 'h-8' },
      { label: 'Toolbar (search + filtros + contagem de itens)', height: 'h-10' },
      { label: 'Content Area (flex-1, scroll + virtuoso)', height: 'flex-1' },
      {
        label: 'FAB (+ Adicionar) — posição fixed mobile',
        height: 'h-6 text-[10px] text-muted-foreground/50',
      },
    ],
  },
  {
    name: 'CrudDataView',
    description: 'Roteador de view. Renderiza tableView, cardView ou kanbanView conforme o estado.',
    structure: [
      { label: 'view === "list"  →  CrudListView (TableVirtuoso)', height: 'h-10' },
      { label: 'view === "cards" →  CrudCardView (VirtuosoGrid)', height: 'h-10' },
      { label: 'view === "kanban"→  CrudKanbanView (dnd-kit)', height: 'h-10' },
      { label: 'data.length === 0 → Empty State (ícone + texto)', height: 'flex-1' },
    ],
  },
  {
    name: 'CrudListView',
    description:
      'Tabela virtualizada com TableVirtuoso. Header fixo, rows lazy-rendered, endReached → fetchNextPage.',
    structure: [
      { label: 'fixedHeaderContent — thead fixo com colunas e labels', height: 'h-9' },
      { label: 'itemContent — rows virtualizadas (renderiza só visíveis)', height: 'flex-1' },
      {
        label: 'rowActions — dropdown de ações por linha (hover)',
        height: 'h-6 text-[10px] text-muted-foreground/50',
      },
    ],
  },
  {
    name: 'CrudCardView',
    description:
      'Grid virtualizado com VirtuosoGrid. Responsivo (1→4 colunas), cards com icon/title/badge/footer.',
    structure: [
      { label: 'listClassName: grid gap-3 p-4 — layout do grid', height: 'h-8' },
      { label: 'CardConfig: icon / title / subtitle / badge / footer / onClick', height: 'flex-1' },
      {
        label: 'endReached → fetchNextPage (infinite scroll)',
        height: 'h-6 text-[10px] text-muted-foreground/50',
      },
    ],
  },
]

const patterns = [
  {
    label: 'useCrudInfiniteQuery',
    desc: 'Hook: useInfiniteQuery + offset paginação. Retorna data[] flat, total, fetchNextPage, hasNextPage, isLoading.',
  },
  {
    label: 'filters → useMemo',
    desc: 'Filtros computados com useMemo. Debounce de 400ms no search. Reset automático ao mudar filtro.',
  },
  {
    label: 'enabledViews',
    desc: "Prop que define quais views estão disponíveis: ['list', 'cards'] ou ['list', 'cards', 'kanban'].",
  },
  {
    label: 'isFetchingMore',
    desc: 'Spinner no rodapé do conteúdo enquanto carrega a próxima página.',
  },
]

export function ShellsSection() {
  return (
    <SectionWrapper
      id="shells"
      title="Page Shells & Layout"
      description="CrudPageShell é o único shell para páginas CRUD. Usa infinite scroll + virtualização — sem paginação offset."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {shells.map((shell) => (
          <ShowcaseBox key={shell.name}>
            <div className="mb-3">
              <h3 className="font-mono text-sm font-semibold">{shell.name}</h3>
              <p className="text-muted-foreground mt-0.5 text-xs">{shell.description}</p>
            </div>
            <div className="border-border overflow-hidden rounded-lg border border-dashed">
              <div className="bg-border/50 flex min-h-[180px] flex-col gap-px">
                {shell.structure.map((block, i) => (
                  <div
                    key={i}
                    className={cn(
                      'bg-card text-muted-foreground flex items-center px-3 text-xs',
                      block.height === 'flex-1' ? 'min-h-[60px] flex-1' : block.height
                    )}
                  >
                    <span className="truncate font-mono text-[11px]">{block.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </ShowcaseBox>
        ))}
      </div>

      <Separator className="my-6" />

      <ShowcaseBox>
        <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
          Padrões de implementação
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {patterns.map((p) => (
            <div key={p.label} className="border-border/50 bg-muted/20 rounded-lg border p-3">
              <p className="text-primary mb-1 font-mono text-[11px] font-semibold">{p.label}</p>
              <p className="text-muted-foreground text-xs">{p.desc}</p>
            </div>
          ))}
        </div>
      </ShowcaseBox>
    </SectionWrapper>
  )
}
