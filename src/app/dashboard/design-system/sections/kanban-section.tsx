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
  { prop: 'renderCard', type: '(item: T) => ReactNode', desc: 'Renderizador do card (drag overlay incluso)' },
  { prop: 'onMoveItem', type: '(id, toCol) => void', desc: 'Callback após drop → PATCH /api/v1/tickets/:id' },
  { prop: 'onAddItem', type: '(colId) => void', desc: 'Opcional — botão + no header da coluna' },
]

const apis = [
  { endpoint: 'GET /api/v1/ticket-stages', desc: 'Lista fases da org ordenadas por order ASC. Retorna ticketsCount.' },
  { endpoint: 'POST /api/v1/ticket-stages', desc: 'Cria fase. Body: { name, color, order? }.' },
  { endpoint: 'PUT /api/v1/ticket-stages/:id', desc: 'Atualiza name, color, isDefault, isClosed. Se isDefault=true, unset outros.' },
  { endpoint: 'DELETE /api/v1/ticket-stages/:id', desc: 'Remove fase. Tickets são movidos para a fase padrão antes.' },
  { endpoint: 'PUT /api/v1/ticket-stages/reorder', desc: 'Reordena fases. Body: { orderedIds: string[] }.' },
  { endpoint: 'PATCH /api/v1/tickets/:id', desc: 'Move ticket entre fases. Body: { stageId }. Usado pelo Kanban drag-and-drop.' },
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
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Anatomia — CrudKanbanView
        </h3>
        <div className="flex gap-4 min-w-max">
          {columns.map((col) => {
            const colCards = cards.filter((c) => c.col === col.id)
            return (
              <div key={col.id} className="w-[220px] flex flex-col">
                {/* Column Header */}
                <div className="flex items-center justify-between px-2 py-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-semibold">{col.label}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{col.count}</Badge>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border/60 p-2 min-h-[80px]">
                  {colCards.map((card) => (
                    <div
                      key={card.id}
                      className="rounded-lg border border-border bg-card p-2.5 group/card relative"
                    >
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30" />
                        <div>
                          <p className="text-xs font-semibold">{card.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{card.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{card.days}d
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />12
                        </span>
                      </div>
                    </div>
                  ))}
                  {colCards.length === 0 && (
                    <div className="flex-1 flex items-center justify-center py-3">
                      <p className="text-[11px] text-muted-foreground/40">Vazio</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-4 font-mono">
          CrudKanbanView — colunas 300px fixas, scroll horizontal, cards arrastáveis com PointerSensor (distance: 8)
        </p>
      </ShowcaseBox>

      <Separator className="my-6" />

      {/* Props */}
      <ShowcaseBox>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Props do CrudKanbanView
        </h3>
        <div className="space-y-2">
          {stageAttrs.map((attr) => (
            <div key={attr.prop} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2 border-b border-border/30 last:border-0">
              <code className="text-[11px] font-mono font-semibold text-primary bg-primary/5 px-1.5 py-0.5 rounded-md shrink-0 w-fit">{attr.prop}</code>
              <code className="text-[11px] font-mono text-muted-foreground shrink-0">{attr.type}</code>
              <span className="text-xs text-muted-foreground">{attr.desc}</span>
            </div>
          ))}
        </div>
      </ShowcaseBox>

      <Separator className="my-6" />

      {/* Pipeline settings */}
      <ShowcaseBox>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Gestão de Fases — /dashboard/settings/pipeline
        </h3>
        <div className="space-y-2">
          {apis.map((api) => (
            <div key={api.endpoint} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2 border-b border-border/30 last:border-0">
              <code className="text-[11px] font-mono font-semibold text-primary bg-primary/5 px-1.5 py-0.5 rounded-md shrink-0 w-fit whitespace-nowrap">{api.endpoint}</code>
              <span className="text-xs text-muted-foreground">{api.desc}</span>
            </div>
          ))}
        </div>
      </ShowcaseBox>
    </SectionWrapper>
  )
}
