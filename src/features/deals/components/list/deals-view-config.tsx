import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { ColumnDef } from '@/features/dashboard/components/crud/types'
import { DEAL_STATUS_BADGE } from '@/features/deals/constants'
import type { DealItem } from '@/features/deals/types'
import { getDaysSince, getDealInitials, getDealLeadName } from '@/features/deals/utils/deal-display'
import { formatCurrencyBRL } from '@/lib/mask/formatters'

export const dealColumns: ColumnDef<DealItem>[] = [
  {
    key: 'lead',
    label: 'Nome',
    render: (deal) => (
      <div className='flex items-center gap-2.5'>
        <Avatar className='h-7 w-7 shrink-0 border border-border/50'>
          <AvatarFallback className='bg-primary/5 font-semibold text-[9px] text-primary'>
            {getDealInitials(getDealLeadName(deal))}
          </AvatarFallback>
        </Avatar>
        <span className='truncate font-medium text-[13px]'>{getDealLeadName(deal)}</span>
      </div>
    ),
  },
  {
    key: 'stage',
    label: 'Fase',
    width: 160,
    render: (deal) => (
      <div className='flex items-center gap-1.5'>
        <span
          className='h-2 w-2 shrink-0 rounded-full'
          style={{ backgroundColor: deal.stage.color }}
        />
        <span className='text-sm'>{deal.stage.name}</span>
      </div>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    width: 110,
    render: (deal) => {
      const status = DEAL_STATUS_BADGE[deal.status]
      return status ? (
        <Badge variant={status.variant}>{status.label}</Badge>
      ) : (
        <span className='text-muted-foreground'>-</span>
      )
    },
  },
  {
    key: 'dealValue',
    label: 'Valor',
    width: 120,
    render: (deal) => (
      <span className='font-semibold text-emerald-600'>
        {deal.dealValue ? (
          formatCurrencyBRL(deal.dealValue)
        ) : (
          <span className='text-muted-foreground'>-</span>
        )}
      </span>
    ),
  },
  {
    key: 'assignee',
    label: 'Responsável',
    width: 140,
    render: (deal) =>
      deal.assignee ? (
        <span className='text-muted-foreground text-sm'>{deal.assignee.name}</span>
      ) : (
        <span className='text-muted-foreground'>-</span>
      ),
  },
  {
    key: 'createdAt',
    label: 'Criado há',
    width: 100,
    headerClassName: 'text-right',
    className: 'text-right',
    render: (deal) => (
      <span className='text-muted-foreground text-xs'>{getDaysSince(deal.createdAt)}d</span>
    ),
  },
]
