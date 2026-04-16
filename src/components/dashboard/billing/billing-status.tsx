'use client'

import { AlertCircle, CheckCircle2, Clock3, CreditCard, QrCode } from 'lucide-react'
import { motion } from 'motion/react'

import { useBillingSubscription } from '@/hooks/billing/use-billing-subscription'
import { formatDate } from '@/lib/date/format-date'
import { getBillingStatusLabel } from '@/lib/billing/subscription-status'
import { SubscriptionFailureAlert } from './subscription-failure-alert'
import { CheckoutPixQrcode } from './checkout-pix-qrcode'
import { CheckoutStatusTokenService } from '@/services/billing/checkout-status-token.service'

const statusTone = {
  active: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
  pending: 'border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400',
  paused: 'border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400',
  canceled: 'border-destructive/20 bg-destructive/5 text-destructive',
  past_due: 'border-destructive/20 bg-destructive/5 text-destructive',
  inactive: 'border-border bg-muted/30 text-muted-foreground',
} as const

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function getPaymentMethodLabel(value: string | null | undefined) {
  switch (value) {
    case 'CREDIT_CARD':
      return 'Cartão de crédito'
    case 'PIX_AUTOMATIC':
      return 'PIX Automático'
    case 'PIX':
      return 'PIX'
    default:
      return 'Não definido'
  }
}

export function BillingStatus() {
  const { subscription, isLoading, error } = useBillingSubscription()

  if (isLoading || error || !subscription) {
    return null
  }

  const tone = statusTone[subscription.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 rounded-lg border border-border bg-card p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{subscription.planName || subscription.planType}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Método atual: {getPaymentMethodLabel(subscription.paymentMethod)}
          </p>
        </div>

        <div className={`rounded-full border px-3 py-1 text-sm font-medium ${tone}`}>
          {getBillingStatusLabel(subscription.status)}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" />
            Próxima renovação
          </div>
          <p className="mt-2 text-base font-semibold text-foreground">
            {formatDate(new Date(subscription.nextResetDate), 'dd/MM/yyyy')}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Vigência
          </div>
          <p className="mt-2 text-base font-semibold text-foreground">
            {subscription.expiresAt ? formatDate(new Date(subscription.expiresAt), 'dd/MM/yyyy') : 'Aguardando'}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Falhas
          </div>
          <p className="mt-2 text-base font-semibold text-foreground">{subscription.failureCount}</p>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <QrCode className="h-3.5 w-3.5" />
            Última cobrança
          </div>
          <p className="mt-2 text-base font-semibold text-foreground">
            {subscription.lastInvoice ? formatCurrency(subscription.lastInvoice.value) : 'Sem fatura'}
          </p>
        </div>
      </div>

      {subscription.failureReason && subscription.status === 'FAILED' ? (
        <SubscriptionFailureAlert
          failureReason={subscription.failureReason}
          failureCount={subscription.failureCount}
          lastFailureAt={subscription.lastFailureAt}
          nextRetryAt={subscription.nextRetryAt}
          subscriptionId={subscription.id}
        />
      ) : null}

      {subscription.lastInvoice ? (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Última fatura</p>
          <div className="mt-3 grid gap-2 text-sm text-foreground md:grid-cols-2">
            <p>Status: {subscription.lastInvoice.status}</p>
            <p>Vencimento: {formatDate(new Date(subscription.lastInvoice.dueDate), 'dd/MM/yyyy')}</p>
            <p>Pagamento: {getPaymentMethodLabel(subscription.lastInvoice.paymentMethod)}</p>
            <p>
              Pago em:{' '}
              {subscription.lastInvoice.paidAt
                ? formatDate(new Date(subscription.lastInvoice.paidAt), 'dd/MM/yyyy')
                : 'Aguardando'}
            </p>
          </div>

          {subscription.lastInvoice.pixQrCodePayload ? (
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="mb-2 text-sm font-medium text-foreground">PIX pendente</p>
              {subscription.lastInvoice.pixQrCodeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="QR Code PIX pendente"
                  src={`data:image/png;base64,${subscription.lastInvoice.pixQrCodeImage}`}
                  className="mb-3 h-36 w-36 rounded-md border border-border bg-white p-2"
                />
              ) : null}
              <p className="break-all text-xs text-muted-foreground">
                {subscription.lastInvoice.pixQrCodePayload}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  )
}
