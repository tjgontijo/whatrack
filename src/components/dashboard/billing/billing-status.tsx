'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import {
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  CalendarDays,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBillingSubscription } from '@/hooks/billing/use-billing-subscription'
import { BillingCancelDialog } from './billing-cancel-dialog'
import { formatDate } from '@/lib/date/format-date'

type SubscriptionStatusValue = 'active' | 'paused' | 'canceled' | 'past_due'

interface StatusConfig {
  label: string
  icon: React.ElementType
  pill: string
  dot: string
  banner?: string
}

const statusConfig: Record<SubscriptionStatusValue, StatusConfig> = {
  active: {
    label: 'Ativo',
    icon: CheckCircle,
    pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    dot: 'bg-emerald-500',
  },
  canceled: {
    label: 'Cancelado',
    icon: AlertCircle,
    pill: 'bg-destructive/10 text-destructive border-destructive/25',
    dot: 'bg-destructive',
    banner:
      'Assinatura cancelada — o acesso será encerrado em breve.',
  },
  past_due: {
    label: 'Pagamento pendente',
    icon: AlertCircle,
    pill: 'bg-destructive/10 text-destructive border-destructive/25',
    dot: 'bg-destructive',
    banner:
      'Pagamento pendente — atualize o método de pagamento para continuar.',
  },
  paused: {
    label: 'Pausado',
    icon: Clock,
    pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
    dot: 'bg-amber-500',
  },
}

const planNames: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
}

export function BillingStatus() {
  const { subscription, isLoading, error } = useBillingSubscription()
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  if (isLoading || error || !subscription) return null

  const status = subscription.status as SubscriptionStatusValue
  const config = statusConfig[status]
  const planName = planNames[subscription.planType] || subscription.planType
  const nextResetDate = new Date(subscription.nextResetDate)
  const daysUntilReset = Math.ceil(
    (nextResetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )
  const cancellationScheduled = status === 'active' && subscription.canceledAtPeriodEnd
  const bannerMessage = cancellationScheduled
    ? 'Renovação cancelada — seu acesso segue ativo até o fim do ciclo atual.'
    : config.banner

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden rounded-xl border border-border bg-card"
      >
        {/* Banner de alerta para estados críticos */}
        {bannerMessage && (
          <div className="flex items-center gap-2.5 border-b border-destructive/15 bg-destructive/5 px-6 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{bannerMessage}</p>
          </div>
        )}

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Plano {planName}
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.pill}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                  {config.label}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Assinatura recorrente mensal
              </p>
            </div>
          </div>

          {/* Métricas */}
          <div className="mt-6 grid grid-cols-2 divide-x divide-border overflow-hidden rounded-lg border border-border bg-muted/40 sm:grid-cols-3">
            <div className="flex flex-col gap-0.5 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Zap className="h-3 w-3" />
                Limite mensal
              </div>
              <div className="text-xl font-bold text-foreground">
                {subscription.eventLimitPerMonth.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs text-muted-foreground">eventos / mês</div>
            </div>

            <div className="flex flex-col gap-0.5 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                Próximo reset
              </div>
              <div className="text-xl font-bold text-foreground">
                {formatDate(nextResetDate, 'dd/MM')}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(nextResetDate, 'yyyy')}
              </div>
            </div>

            <div className="col-span-2 flex flex-col gap-0.5 border-t border-border p-4 sm:col-span-1 sm:border-t-0">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Dias restantes
              </div>
              <div
                className={`text-xl font-bold ${daysUntilReset <= 5 ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}`}
              >
                {daysUntilReset}
              </div>
              <div className="text-xs text-muted-foreground">
                até o próximo ciclo
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a
                href="https://dashboard.abacatepay.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Gerenciar pagamento
              </a>
            </Button>

            {status !== 'canceled' && !subscription.canceledAtPeriodEnd && (
              <Button
                onClick={() => setShowCancelDialog(true)}
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                Cancelar assinatura
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <BillingCancelDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        planName={planName}
      />
    </>
  )
}
