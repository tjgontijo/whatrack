'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { CreditCard, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBillingSubscription } from '@/hooks/billing/use-billing-subscription'
import { BillingCancelDialog } from './billing-cancel-dialog'
import { formatDate } from '@/lib/date/format-date'

type SubscriptionStatusValue = 'active' | 'paused' | 'canceled' | 'past_due'

interface StatusConfig {
  badge: string
  icon: React.ReactNode
  color: 'emerald' | 'amber' | 'red'
}

const statusConfig: Record<SubscriptionStatusValue, StatusConfig> = {
  active: {
    badge: 'Ativo',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'emerald',
  },
  canceled: {
    badge: 'Cancelado',
    icon: <AlertCircle className="h-5 w-5" />,
    color: 'red',
  },
  past_due: {
    badge: 'Pagamento pendente',
    icon: <AlertCircle className="h-5 w-5" />,
    color: 'red',
  },
  paused: {
    badge: 'Pausado',
    icon: <Clock className="h-5 w-5" />,
    color: 'amber',
  },
}

const planNames: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
}

export function BillingStatus() {
  const { subscription, usage, isLoading, error } = useBillingSubscription()
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  if (isLoading) {
    return null // Skeleton exibido pelo Suspense
  }

  if (error || !subscription) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8"
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Nenhuma assinatura ativa</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Escolha um plano para começar a rastrear suas vendas.
            </p>
          </div>

          <Button
            asChild
            className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40"
          >
            <a href="/#planos">Ver planos</a>
          </Button>
        </div>
      </motion.div>
    )
  }

  const status = subscription.status as SubscriptionStatusValue
  const config = statusConfig[status]
  const planName = planNames[subscription.planType] || subscription.planType
  const nextResetDate = new Date(subscription.nextResetDate)

  // Determinar cor do badge
  const badgeColorMap = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8"
      >
        <div className="flex flex-col gap-6">
          {/* Header with plan info */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <CreditCard className="h-6 w-6 text-emerald-400" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">
                  Plano {planName}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Assinatura recorrente mensal
                </p>
              </div>
            </div>

            {/* Status badge */}
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${badgeColorMap[config.color]}`}
            >
              {config.icon}
              {config.badge}
            </div>
          </div>

          {/* Status details grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Limite de eventos
              </div>
              <div className="mt-2 text-2xl font-bold text-white">
                {subscription.eventLimitPerMonth}{' '}
                <span className="text-lg text-zinc-400">/mês</span>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Próximo reset
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatDate(nextResetDate, 'dd/MM/yyyy')}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {Math.ceil((nextResetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => setShowCancelDialog(true)}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              Cancelar assinatura
            </Button>

            <Button
              asChild
              className="bg-zinc-800 text-white hover:bg-zinc-700"
            >
              <a href="https://dashboard.abacatepay.com" target="_blank" rel="noopener noreferrer">
                Gerenciar pagamento
              </a>
            </Button>
          </div>

          {/* Warning message for canceled or past_due */}
          {(status === 'canceled' || status === 'past_due') && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm text-red-400">
                {status === 'canceled'
                  ? 'Sua assinatura foi cancelada. Você perderá acesso aos recursos em breve.'
                  : 'Seu pagamento está pendente. Atualize o método de pagamento para continuar.'}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Cancel dialog */}
      <BillingCancelDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        planName={planName}
      />
    </>
  )
}
