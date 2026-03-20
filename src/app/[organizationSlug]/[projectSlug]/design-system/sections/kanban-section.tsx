'use client'

import { Plus, Calendar, GripVertical, MessageSquare } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import { SectionWrapper, ShowcaseBox } from './shared'

const columns = [
  { id: 'novo', label: 'Novo', color: '#6366f1', count: 4 },
  { id: 'contato', label: 'Em contato', color: '#f59e0b', count: 7 },
  { id: 'qualificado', label: 'Qualificado', color: '#22c55e', count: 3 },
]

const cards = [
  { id: '1', col: 'novo', name: 'Maria Silva', phone: '+55 11 99999-0000', days: 1 },
  { id: '2', col: 'novo', name: 'João Santos', phone: '+55 21 88888-1111', days: 2 },
  { id: '3', col: 'contato', name: 'Ana Costa', phone: '+55 31 77777-2222', days: 4 },
  { id: '4', col: 'contato', name: 'Pedro Lima', phone: '+55 51 66666-3333', days: 5 },
]

const stageAttrs = [
  { prop: 'columns', type: 'KanbanColumn[]', desc: 'Fases ordenadas pelo campo order' },
  { prop: 'items', type: 'T[]', desc: 'Todos os itens — o componente agrupa internamente' },
  { prop: 'getItemId', type: '(item: T) => string', desc: 'Extrair ID único do item' },
  { prop: 'getColumnId', type: '(item: T) => string', desc: 'Extrair o stageId do item' },
  {
    prop: 'renderCard',
    type: '(item: T) => ReactNode',
    desc: 'Renderizador do card (drag overlay incluso)',
  },
  {
    prop: 'onMoveItem',
    type: '(id, toCol) => void',
    desc: 'Callback após drop → PATCH /api/v1/tickets/:id',
  },
  { prop: 'onAddItem', type: '(colId) => void', desc: 'Opcional — botão + no header da coluna' },
]

const apis = [
  {
    endpoint: 'GET /api/v1/ticket-stages',
    desc: 'Lista fases da org ordenadas por order ASC. Retorna ticketsCount.',
  },
  { endpoint: 'POST /api/v1/ticket-stages', desc: 'Cria fase. Body: { name, color, order? }.' },
  {
    endpoint: 'PUT /api/v1/ticket-stages/:id',
    desc: 'Atualiza name, color, isDefault, isClosed. Se isDefault=true, unset outros.',
  },
  {
    endpoint: 'DELETE /api/v1/ticket-stages/:id',
    desc: 'Remove fase. Tickets são movidos para a fase padrão antes.',
  },
  {
    endpoint: 'PUT /api/v1/ticket-stages/reorder',
    desc: 'Reordena fases. Body: { orderedIds: string[] }.',
  },
  {
    endpoint: 'PATCH /api/v1/tickets/:id',
    desc: 'Move ticket entre fases. Body: { stageId }. Usado pelo Kanban drag-and-drop.',
  },
]

export function KanbanSection() {
  return (
    <SectionWrapper
      id="kanban"
      title="Kanban View"
      description="CrudKanbanView — view de Kanban genérica com drag-and-drop entre colunas (@dnd-kit). Colunas dinâmicas vindas do TicketStage."
    >
      {/* Mockup visual */}
      <ShowcaseBox className="overflow-x-auto">
        <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
          Anatomia — CrudKanbanView
        </h3>
        <div className="flex min-w-max gap-4">
          {columns.map((col) => {
            const colCards = cards.filter((c) => c.col === col.id)
            return (
              <div key={col.id} className="flex w-[220px] flex-col">
                {/* Column Header */}
                <div className="mb-2 flex items-center justify-between px-2 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    <span className="text-xs font-semibold">{col.label}</span>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      {col.count}
                    </Badge>
                  </div>
                  <Plus className="text-muted-foreground h-3.5 w-3.5" />
                </div>

                {/* Cards */}
                <div className="border-border/60 flex min-h-[80px] flex-col gap-2 rounded-xl border border-dashed p-2">
                  {colCards.map((card) => (
                    <div
                      key={card.id}
                      className="border-border bg-card group/card relative rounded-lg border p-2.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="text-muted-foreground/30 h-3.5 w-3.5" />
                        <div>
                          <p className="text-xs font-semibold">{card.name}</p>
                          <p className="text-muted-foreground font-mono text-[11px]">
                            {card.phone}
                          </p>
                        </div>
                      </div>
                      <div className="text-muted-foreground mt-2 flex items-center justify-between text-[10px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {card.days}d
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          12
                        </span>
                      </div>
                    </div>
                  ))}
                  {colCards.length === 0 && (
                    <div className="flex flex-1 items-center justify-center py-3">
                      <p className="text-muted-foreground/40 text-[11px]">Vazio</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-muted-foreground mt-4 font-mono text-[11px]">
          CrudKanbanView — colunas 300px fixas, scroll horizontal, cards arrastáveis com
          PointerSensor (distance: 8)
        </p>
      </ShowcaseBox>

      <Separator className="my-6" />

      {/* Props */}
      <ShowcaseBox>
        <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
          Props do CrudKanbanView
        </h3>
        <div className="space-y-2">
          {stageAttrs.map((attr) => (
            <div
              key={attr.prop}
              className="border-border/30 flex flex-col gap-1 border-b py-2 last:border-0 sm:flex-row sm:items-start sm:gap-3"
            >
              <code className="text-primary bg-primary/5 w-fit shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold">
                {attr.prop}
              </code>
              <code className="text-muted-foreground shrink-0 font-mono text-[11px]">
                {attr.type}
              </code>
              <span className="text-muted-foreground text-xs">{attr.desc}</span>
            </div>
          ))}
        </div>
      </ShowcaseBox>

      <Separator className="my-6" />

      {/* Pipeline settings */}
      <ShowcaseBox>
        <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
          Gestão de Fases — /dashboard/settings/pipeline
        </h3>
        <div className="space-y-2">
          {apis.map((api) => (
            <div
              key={api.endpoint}
              className="border-border/30 flex flex-col gap-1 border-b py-2 last:border-0 sm:flex-row sm:items-start sm:gap-3"
            >
              <code className="text-primary bg-primary/5 w-fit shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold">
                {api.endpoint}
              </code>
              <span className="text-muted-foreground text-xs">{api.desc}</span>
            </div>
          ))}
        </div>
      </ShowcaseBox>
    </SectionWrapper>
  )
}
