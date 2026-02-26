import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils/utils'

interface MetricCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    value: number
    label?: string
  }
  className?: string
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  className,
}: MetricCardProps) {
  const isPositive = trend && trend.value > 0
  const isNegative = trend && trend.value < 0
  const isNeutral = trend && trend.value === 0

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {trend && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {isPositive && (
              <>
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="font-medium text-success">+{trend.value}%</span>
              </>
            )}
            {isNegative && (
              <>
                <TrendingDown className="h-3 w-3 text-destructive" />
                <span className="font-medium text-destructive">{trend.value}%</span>
              </>
            )}
            {isNeutral && (
              <span className="font-medium text-muted-foreground">0%</span>
            )}
            {trend.label && (
              <span className="text-muted-foreground">{trend.label}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
