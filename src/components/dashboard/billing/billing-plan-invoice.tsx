'use client'

import { CheckCircle2, AlertCircle, Clock3 } from 'lucide-react'
import { motion } from 'motion/react'

import { useBillingSubscription } from '@/hooks/billing/use-billing-subscription'
import { useOrganization } from '@/features/organizations/hooks/use-organization'
import { formatDate } from '@/lib/date/format-date'
import { getBillingStatusLabel } from '@/lib/billing/subscription-status'
import { Button } from '@/components/ui/button'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'ACTIVE':
      return <CheckCircle2 className="h-4 w-4" />
    case 'PENDING':
      return <Clock3 className="h-4 w-4" />
    default:
      return <AlertCircle className="h-4 w-4" />
  }
}

const statusStyles = {
  INACTIVE: 'border-border bg-muted/30 text-muted-foreground',
  PENDING: 'border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400',
  ACTIVE: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
  OVERDUE: 'border-destructive/20 bg-destructive/5 text-destructive',
  CANCELED: 'border-destructive/20 bg-destructive/5 text-destructive',
  EXPIRED: 'border-destructive/20 bg-destructive/5 text-destructive',
  FAILED: 'border-destructive/20 bg-destructive/5 text-destructive',
} as const

export function BillingPlanInvoice() {
  const { subscription, isLoading } = useBillingSubscription()
  const { data: org } = useOrganization()

  if (isLoading || !subscription) {
    return null
  }

  const planName = subscription.planName || subscription.planType || 'Sem Plano'
  const statusLabel = getBillingStatusLabel(subscription.status)
  const statusStyle = statusStyles[subscription.status as keyof typeof statusStyles] || statusStyles.INACTIVE
  const nextCycleDate = subscription.expiresAt ? formatDate(new Date(subscription.expiresAt), 'dd/MM/yyyy') : 'Aguardando'

  // TODO: Buscar features do plano via catálogo ou endpoint expandido
  const features: string[] = []

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 rounded-lg border border-border bg-card p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground uppercase tracking-wide">{planName}</h3>
        </div>
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${statusStyle}`}>
          {getStatusIcon(subscription.status)}
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* Features */}
      {features.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recursos inclusos:</p>
          <ul className="space-y-1">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
                <span className="text-xs">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pricing & Next Cycle */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Próximo ciclo: {nextCycleDate}</span>
          {subscription.lastInvoice && (
            <>
              <span>•</span>
              <span>Último valor: {formatCurrency(subscription.lastInvoice.value)}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" disabled className="text-xs">
          Ver histórico
        </Button>
      </div>
    </motion.div>
  )
}
