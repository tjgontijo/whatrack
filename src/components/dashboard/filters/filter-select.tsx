import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils/utils'

export interface FilterOption {
  label: string
  value: string
}

interface FilterSelectProps {
  label: string
  value: string
  options: FilterOption[]
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function FilterSelect({
  label,
  value,
  options,
  onValueChange,
  disabled,
  placeholder = 'Selecionar',
  className,
}: FilterSelectProps) {
  return (
    <div className={cn('w-full space-y-2', className)}>
      <label className="text-label uppercase text-gray-500 dark:text-gray-400">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="h-10 w-full rounded-lg border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
