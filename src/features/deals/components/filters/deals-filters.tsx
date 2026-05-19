import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DEAL_DATE_RANGE_OPTIONS, DEAL_STATUS_OPTIONS } from '@/features/deals/constants'
import type { DealDateRangeFilter, DealStatusFilter } from '@/features/deals/types'

type DealsFiltersProps = {
  statusFilter: DealStatusFilter
  dateRange: DealDateRangeFilter
  onStatusFilterChange: (value: DealStatusFilter) => void
  onDateRangeChange: (value: DealDateRangeFilter) => void
}

export function DealsFilters({
  statusFilter,
  dateRange,
  onStatusFilterChange,
  onDateRangeChange,
}: DealsFiltersProps) {
  return (
    <>
      <Select
        value={statusFilter}
        onValueChange={(value) => onStatusFilterChange(value as DealStatusFilter)}
      >
        <SelectTrigger className='h-7 w-36 border-border text-xs'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DEAL_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className='text-xs'>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={dateRange}
        onValueChange={(value) => onDateRangeChange(value as DealDateRangeFilter)}
      >
        <SelectTrigger className='h-7 w-36 border-border text-xs'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DEAL_DATE_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className='text-xs'>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}
