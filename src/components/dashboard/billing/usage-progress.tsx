'use client'

import { motion } from 'motion/react'
import { AlertCircle, TrendingUp } from 'lucide-react'
import { useBillingSubscription } from '@/hooks/billing/use-billing-subscription'
import { formatDate } from '@/lib/date/format-date'

export function UsageProgress() {
  const { subscription, usage, isLoading } = useBillingSubscription()

  if (isLoading || !usage || !subscription) return null

  const percentage = (usage.used / usage.limit) * 100
  const clampedPercentage = Math.min(percentage, 100)
  const remaining = Math.max(usage.limit - usage.used, 0)
  const nextResetDate = new Date(subscription.nextResetDate)

  const isOver = percentage >= 100
  const isWarning = percentage >= 80 && !isOver

  const barColor = isOver
    ? 'bg-destructive'
    : isWarning
      ? 'bg-amber-500'
      : 'bg-primary'

  const accentColor = isOver
    ? 'text-destructive'
    : isWarning
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-primary'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Uso no ciclo atual
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Reset em {formatDate(nextResetDate, "dd 'de' MMM, yyyy")}
            </p>
          </div>
          <div className={`shrink-0 text-right ${accentColor}`}>
            <div className="text-2xl font-bold tabular-nums">
              {clampedPercentage.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">utilizado</div>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-6">
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">
                {usage.used.toLocaleString('pt-BR')}
              </span>{' '}
              /{' '}
              <span className="tabular-nums">
                {usage.limit.toLocaleString('pt-BR')}
              </span>{' '}
              eventos
            </span>
            {!isOver && remaining > 0 && (
              <span className="text-sm text-muted-foreground tabular-nums">
                {remaining.toLocaleString('pt-BR')} restantes
              </span>
            )}
          </div>

          {/* Track */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${clampedPercentage}%` }}
              transition={{ delay: 0.25, duration: 0.9, ease: 'easeOut' }}
              className={`h-full rounded-full ${barColor}`}
            />
            {/* Marcador de 80% */}
            <div className="pointer-events-none absolute inset-y-0 left-[80%] w-px bg-border" />
          </div>

          <div className="mt-1 flex justify-end pr-[20%]">
            <span className="text-[10px] text-muted-foreground/60">80%</span>
          </div>
        </div>

        {/* Overage */}
        {isOver && usage.overage > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <span className="text-sm text-destructive">
              <span className="font-semibold tabular-nums">{usage.overage}</span>{' '}
              eventos excedentes — adicionados na proxima fatura ao fechar o ciclo.
            </span>
          </motion.div>
        )}

        {/* Warning */}
        {isWarning && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3"
          >
            <TrendingUp className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="text-sm text-amber-700 dark:text-amber-300">
              Você está se aproximando do limite. Considere fazer upgrade de
              plano.
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
