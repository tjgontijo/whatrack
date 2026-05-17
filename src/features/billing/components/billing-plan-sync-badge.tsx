import { Badge } from '@/components/ui/badge'

interface BillingPlanSyncBadgeProps {
  syncStatus: string
}

const LABELS: Record<string, string> = {
  synced: 'Sincronizado',
  pending: 'Pendente',
  error: 'Erro de sync',
}

export function BillingPlanSyncBadge({
  syncStatus,
}: BillingPlanSyncBadgeProps) {
  const variant =
    syncStatus === 'synced'
      ? 'default'
      : syncStatus === 'error'
        ? 'destructive'
        : 'outline'

  return (
    <Badge variant={variant}>
      {LABELS[syncStatus] ?? syncStatus}
    </Badge>
  )
}
