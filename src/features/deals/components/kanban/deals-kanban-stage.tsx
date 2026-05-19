'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ArrowLeft, ArrowRight, MoreVertical, Plus, Settings, Trash2 } from 'lucide-react'
import { Virtuoso } from 'react-virtuoso'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DealItem, DealStageColumn } from '@/features/deals/types'
import { formatCurrencyBRL } from '@/lib/mask/formatters'
import { cn } from '@/lib/utils/utils'
import { DealsKanbanCard } from './deals-kanban-card'

interface DealsKanbanStageProps {
  stage: DealStageColumn
  deals: DealItem[]
  stats?: { count: number; dealValueSum: number }
  stageIndex?: number
  totalStages?: number
  activeId?: string | null
  onConfigStage?: () => void
  onMoveStageLeft?: () => void
  onMoveStageRight?: () => void
  onCreateStageBefore?: () => void
  onDeleteStage?: () => void
  onDealClick?: (deal: DealItem) => void
}

export function DealsKanbanStage({
  stage,
  deals,
  stats,
  stageIndex = 0,
  totalStages = 1,
  activeId,
  onConfigStage,
  onMoveStageLeft,
  onMoveStageRight,
  onCreateStageBefore,
  onDeleteStage,
  onDealClick,
}: DealsKanbanStageProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const dealIds = deals.map((d) => d.id)

  return (
    <div className='flex h-full w-[280px] shrink-0 flex-col overflow-hidden rounded-lg border border-border/30 bg-card shadow-sm'>
      {/* Colored top border */}
      <div
        className='h-[3px] w-full shrink-0 opacity-70'
        style={{ backgroundColor: stage.color }}
      />

      {/* Stage Header */}
      <div className='flex shrink-0 items-center justify-between border-border/40 border-b px-3 py-2.5'>
        <div className='flex min-w-0 flex-col gap-0.5'>
          <div className='flex items-center gap-2'>
            <h3 className='truncate font-semibold text-[13px]' style={{ color: stage.color }}>
              {stage.name}
            </h3>
            <Badge variant='secondary' className='h-4 min-w-[18px] px-1.5 font-medium text-[10px]'>
              {stats?.count ?? deals.length}
            </Badge>
          </div>
          {stats && stats.dealValueSum > 0 && (
            <span className='font-semibold text-[10px] text-emerald-600/90'>
              {formatCurrencyBRL(stats.dealValueSum)}
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 text-muted-foreground/50 hover:text-foreground'
            >
              <MoreVertical className='h-3.5 w-3.5' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-56'>
            {(stageIndex > 0 || stageIndex < totalStages - 1) && (
              <>
                {stageIndex > 0 && (
                  <DropdownMenuItem
                    className='gap-3 px-3 py-2.5 text-sm'
                    onClick={onMoveStageLeft}
                  >
                    <ArrowLeft className='h-4 w-4 text-muted-foreground' />
                    <span>Mover para esquerda</span>
                  </DropdownMenuItem>
                )}
                {stageIndex < totalStages - 1 && (
                  <DropdownMenuItem
                    className='gap-3 px-3 py-2.5 text-sm'
                    onClick={onMoveStageRight}
                  >
                    <ArrowRight className='h-4 w-4 text-muted-foreground' />
                    <span>Mover para direita</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className='my-1.5' />
              </>
            )}
            <DropdownMenuItem className='gap-3 px-3 py-2.5 text-sm' onClick={onCreateStageBefore}>
              <Plus className='h-4 w-4 text-muted-foreground' />
              <span>Criar nova fase</span>
            </DropdownMenuItem>
            <DropdownMenuItem className='gap-3 px-3 py-2.5 text-sm' onClick={onConfigStage}>
              <Settings className='h-4 w-4 text-muted-foreground' />
              <span>Configurar fase</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className='my-1.5' />
            <DropdownMenuItem
              className='gap-3 px-3 py-2.5 text-destructive text-sm'
              onClick={onDeleteStage}
            >
              <Trash2 className='h-4 w-4' />
              <span>Deletar fase</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards Area — droppable wrapper, Virtuoso handles scroll */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-0 flex-1 flex-col transition-colors',
          isOver && 'bg-primary/5'
        )}
      >
        {deals.length === 0 ? (
          <div className='mt-12 flex items-center justify-center'>
            <span className='font-bold text-[9px] text-muted-foreground/30 uppercase tracking-[0.2em]'>
              Vazio
            </span>
          </div>
        ) : (
          <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
            <Virtuoso
              className='scrollbar-on-hover'
              style={{ flex: 1 }}
              data={deals}
              overscan={500}
              itemContent={(_, deal) => (
                <div className='px-2.5 pt-2.5'>
                  <DealsKanbanCard
                    deal={deal}
                    isActivelyDragging={deal.id === activeId}
                    onClick={onDealClick}
                  />
                </div>
              )}
              components={{
                Footer: () => <div className='h-24' />,
              }}
            />
          </SortableContext>
        )}
      </div>
    </div>
  )
}
