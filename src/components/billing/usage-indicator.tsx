'use client'

import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { LimitableResource } from '@/services/billing'

interface UsageIndicatorProps {
  label: string
  used: number
  limit: number
  showLabel?: boolean
  compact?: boolean
  resource?: LimitableResource
}

const resourceLabels: Record<LimitableResource, string> = {
  metaProfiles: 'perfis Meta Ads',
  metaAdAccounts: 'contas de anúncio',
  whatsappInstances: 'instâncias WhatsApp',
  members: 'membros',
}

export function UsageIndicator({
  label,
  used,
  limit,
  showLabel = true,
  compact = false,
  resource,
}: UsageIndicatorProps) {
  const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0
  const isFull = percentage >= 100
  const isWarning = percentage >= 80

  const progressColor = isFull
    ? 'bg-destructive'
    : isWarning
      ? 'bg-yellow-500'
      : 'bg-primary'

  const resourceLabel = resource ? resourceLabels[resource] : label.toLowerCase()

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <div className="h-2 w-16 rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', progressColor)}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {used}/{limit}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {used} de {limit} {resourceLabel} usados
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              {showLabel && (
                <span className="text-muted-foreground">{label}</span>
              )}
              <span
                className={cn(
                  'font-medium tabular-nums',
                  isFull && 'text-destructive',
                  isWarning && !isFull && 'text-yellow-600'
                )}
              >
                {used}/{limit}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', progressColor)}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {used} de {limit} {resourceLabel} usados ({percentage}%)
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
