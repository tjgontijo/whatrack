'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, MessageSquare } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DEAL_STATUS_BADGE } from '@/features/deals/constants'
import type { DealItem } from '@/features/deals/types'
import {
  getDealInitials,
  getDealLeadName,
  getDealOrigin,
  getDealTimeInStage,
  isDealStale,
} from '@/features/deals/utils/deal-display'
import { formatCurrencyBRL } from '@/lib/mask/formatters'
import { cn } from '@/lib/utils/utils'

export function DealsKanbanCard({
  deal,
  isDragging,
  isActivelyDragging,
}: {
  deal: DealItem
  isDragging?: boolean
  isActivelyDragging?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: deal.id })

  const name = getDealLeadName(deal)
  const origin = getDealOrigin(deal)
  const isStale = isDealStale(deal)
  const timeInPhase = getDealTimeInStage(deal)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-md border border-border bg-white shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:bg-zinc-900 cursor-grab active:cursor-grabbing',
        isActivelyDragging && 'opacity-0 pointer-events-none',
        isDragging && 'rotate-2 shadow-2xl cursor-grabbing opacity-100'
      )}
    >
      {/* Accent bar */}
      <div
        className='absolute top-0 bottom-0 left-0 w-1'
        style={{ backgroundColor: deal.stage.color }}
      />

      <div className='flex flex-1 flex-col p-3 pl-4'>
        <div className='mb-2 flex items-start justify-between gap-2'>
          <div className='min-w-0 flex-1'>
            <h4 className='truncate font-semibold text-[13px] text-slate-900 leading-snug transition-colors group-hover:text-primary dark:text-slate-100'>
              {name}
            </h4>
            {deal.lead.phone && (
              <p className='truncate font-mono text-[10px] text-slate-500 dark:text-slate-400'>
                {deal.lead.phone}
              </p>
            )}
          </div>
          {deal.status !== 'open' && (
            <Badge
              variant={DEAL_STATUS_BADGE[deal.status]?.variant || 'outline'}
              className='h-4 px-1 text-[9px] uppercase'
            >
              {DEAL_STATUS_BADGE[deal.status]?.label}
            </Badge>
          )}
        </div>

        <div className='mb-3 grid grid-cols-2 gap-2'>
          <div className='flex flex-col gap-0.5'>
            <span className='font-bold text-[9px] text-slate-400 uppercase tracking-tight'>
              Origem
            </span>
            <span className='truncate text-[11px] text-slate-600 dark:text-slate-300'>
              {origin}
            </span>
          </div>
          {deal.dealValue && (
            <div className='flex flex-col gap-0.5'>
              <span className='font-bold text-[9px] text-slate-400 uppercase tracking-tight'>
                Valor
              </span>
              <span className='font-bold text-[11px] text-emerald-600'>
                {formatCurrencyBRL(deal.dealValue)}
              </span>
            </div>
          )}
        </div>

        <div className='mt-auto flex items-center justify-between gap-2 border-slate-100 border-t pt-2 dark:border-zinc-800'>
          <div className='flex items-center gap-3'>
            <div
              className={cn(
                'flex items-center gap-1 text-[10px]',
                isStale ? 'font-medium text-orange-500' : 'text-slate-400'
              )}
            >
              <MessageSquare className='h-3.5 w-3.5' />
              <span>{deal.messagesCount}</span>
            </div>
            <div className='flex items-center gap-1 text-[10px] text-slate-400'>
              <Calendar className='h-3.5 w-3.5' />
              <span>{timeInPhase}d</span>
            </div>
          </div>
          {deal.assignee && (
            <Avatar className='h-5 w-5 border border-white shadow-sm dark:border-zinc-800'>
              <AvatarFallback className='bg-primary/10 font-bold text-[8px] text-primary uppercase'>
                {getDealInitials(deal.assignee.name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  )
}
