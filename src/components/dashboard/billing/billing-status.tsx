'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { motion } from 'motion/react'
import {
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  CalendarDays,
  Zap,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useBillingSubscription } from '@/hooks/billing/use-billing-subscription'
import { apiFetch } from '@/lib/api-client'
import { BillingCancelDialog } from './billing-cancel-dialog'
import { formatDate } from '@/lib/date/format-date'
import { getBillingStatusLabel } from '@/lib/billing/subscription-status'

type SubscriptionStatusValue = 'active' | 'paused' | 'canceled' | 'past_due'

interface StatusConfig {
  label: string
  icon: React.ElementType
  pill: string
  dot: string
  banner?: string
  bannerTone?: 'danger' | 'warning' | 'info'
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
    bannerTone: 'danger',
  },
  past_due: {
    label: 'Pagamento pendente',
    icon: AlertCircle,
    pill: 'bg-destructive/10 text-destructive border-destructive/25',
    dot: 'bg-destructive',
    banner:
      'Pagamento pendente — atualize o método de pagamento para continuar.',
    bannerTone: 'danger',
  },
  paused: {
    label: getBillingStatusLabel('paused'),
    icon: Clock,
    pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
    dot: 'bg-amber-500',
    banner:
      'Estamos confirmando o pagamento com o provedor. Sua assinatura será ativada automaticamente.',
    bannerTone: 'warning',
  },
}

const bannerToneClass = {
  danger: 'border-destructive/15 bg-destructive/5 text-destructive',
  warning: 'border-amber-500/15 bg-amber-500/5 text-amber-700 dark:text-amber-400',
  info: 'border-primary/15 bg-primary/5 text-primary',
} as const

export function BillingStatus() {
  const { subscription, isLoading, error } = useBillingSubscription()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isOpeningPortal, startTransition] = useTransition()

  const handleOpenPortal = () => {
    startTransition(async () => {
      try {
        if (!subscription?.organizationId) {
          throw new Error('Organização não identificada')
        }

        const data = (await apiFetch('/api/v1/billing/portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ returnUrl: '/dashboard/billing' }),
          orgId: subscription.organizationId,
        })) as { url: string }
        window.location.href = data.url
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : 'Não foi possível abrir o portal da Stripe.',
        )
      }
    })
  }

  if (isLoading || error || !subscription) return null

  const status = subscription.status as SubscriptionStatusValue
  const config = statusConfig[status]
  const planName = subscription.planName || subscription.planType
  const trialActive =
    subscription.trialEndsAt != null && new Date(subscription.trialEndsAt).getTime() > Date.now()
  const localTrial = trialActive && !subscription.providerSubscriptionId
  const nextResetDate = new Date(subscription.nextResetDate)
  const daysUntilReset = Math.ceil(
    (nextResetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )
  const cancellationScheduled = status === 'active' && subscription.canceledAtPeriodEnd
  const bannerMessage = cancellationScheduled
    ? 'Renovação cancelada — seu acesso segue ativo até o fim do ciclo atual.'
    : localTrial && subscription.trialEndsAt
      ? `Teste grátis ativo até ${formatDate(new Date(subscription.trialEndsAt), 'dd/MM/yyyy')}.`
    : config.banner
  const bannerTone = cancellationScheduled
    ? 'warning'
    : localTrial
      ? 'info'
      : (config.bannerTone ?? 'danger')

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
          <div
            className={`flex items-center gap-2.5 border-b px-6 py-3 ${bannerToneClass[bannerTone]}`}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{bannerMessage}</p>
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
          <div className="mt-6 flex flex-wrap gap-2">
            {!localTrial ? (
              <Button
                onClick={handleOpenPortal}
                disabled={isOpeningPortal}
                size="sm"
                variant="outline"
              >
                {isOpeningPortal && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {!isOpeningPortal && <ExternalLink className="mr-1.5 h-3.5 w-3.5" />}
                Gerenciar assinatura
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/billing">Escolher plano</Link>
              </Button>
            )}

            {!localTrial && status !== 'canceled' && !subscription.canceledAtPeriodEnd && (
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
