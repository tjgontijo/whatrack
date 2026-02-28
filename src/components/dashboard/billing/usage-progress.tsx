'use client'

import { motion } from 'motion/react'
import { AlertCircle } from 'lucide-react'
import { useBillingSubscription } from '@/hooks/billing/use-billing-subscription'
import { formatDate } from '@/lib/date/format-date'

export function UsageProgress() {
  const { subscription, usage, isLoading } = useBillingSubscription()

  if (isLoading || !usage || !subscription) {
    return null
  }

  const percentage = (usage.used / usage.limit) * 100
  const clampedPercentage = Math.min(percentage, 100)

  // Determinar cor baseada no threshold
  let barColor = 'bg-emerald-500'
  let labelColor = 'text-emerald-400'
  let warningText = ''

  if (percentage >= 100) {
    barColor = 'bg-red-500'
    labelColor = 'text-red-400'
    warningText = 'Limite atingido — overage ativo'
  } else if (percentage >= 80) {
    barColor = 'bg-amber-500'
    labelColor = 'text-amber-400'
    warningText = 'Aproximando do limite'
  }

  const nextResetDate = new Date(subscription.nextResetDate)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">Eventos este ciclo</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Próximo reset em {formatDate(nextResetDate, 'dd MMM, yyyy')}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">
              {usage.used}
              <span className="text-lg text-zinc-400">/{usage.limit}</span>
            </span>
          </div>
          <span className={`text-sm font-semibold ${labelColor}`}>
            {clampedPercentage.toFixed(0)}%
          </span>
        </div>

        {/* Bar background */}
        <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
          {/* Animated bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${clampedPercentage}%` }}
            transition={{ delay: 0.2, duration: 1, ease: 'easeOut' }}
            className={`h-full rounded-full transition-colors ${barColor}`}
          />
        </div>
      </div>

      {/* Warning message */}
      {warningText && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-400" />
          <span className="text-sm text-amber-400">{warningText}</span>
        </motion.div>
      )}

      {/* Overage info */}
      {usage.overage > 0 && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-sm text-red-400">
            <span className="font-semibold">{usage.overage} eventos</span> além do limite
            (cobrados a parte)
          </p>
        </div>
      )}

      {/* Event types breakdown */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Lead Qualified
          </div>
          <div className="mt-1 text-base font-semibold text-white">
            ~{Math.floor(usage.used * 0.6)}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Purchase Confirmed
          </div>
          <div className="mt-1 text-base font-semibold text-white">
            ~{Math.floor(usage.used * 0.4)}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
