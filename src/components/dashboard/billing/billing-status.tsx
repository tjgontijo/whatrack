'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { motion } from 'motion/react'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  ExternalLink,
  Loader2,
  MessageCircleMore,
  Megaphone,
  FolderKanban,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useBillingSubscription } from '@/hooks/billing/use-billing-subscription'
import { useRequiredProjectPath } from '@/hooks/project/project-route-context'
import { apiFetch } from '@/lib/api-client'
import { BillingCancelDialog } from './billing-cancel-dialog'
import { formatDate } from '@/lib/date/format-date'
import { getBillingStatusLabel } from '@/lib/billing/subscription-status'

type SubscriptionStatusValue = 'active' | 'paused' | 'canceled' | 'past_due'

const statusConfig: Record<
  SubscriptionStatusValue,
  {
    label: string
    pill: string
    dot: string
    banner?: string
    bannerTone?: 'danger' | 'warning' | 'info'
  }
> = {
  active: {
    label: 'Ativo',
    pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    dot: 'bg-emerald-500',
  },
  canceled: {
    label: 'Cancelado',
    pill: 'bg-destructive/10 text-destructive border-destructive/25',
    dot: 'bg-destructive',
    banner: 'Assinatura cancelada — o acesso será encerrado em breve.',
    bannerTone: 'danger',
  },
  past_due: {
    label: 'Pagamento pendente',
    pill: 'bg-destructive/10 text-destructive border-destructive/25',
    dot: 'bg-destructive',
    banner: 'Pagamento pendente — atualize o método de pagamento para continuar.',
    bannerTone: 'danger',
  },
  paused: {
    label: getBillingStatusLabel('paused'),
    pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
    dot: 'bg-amber-500',
    banner: 'Estamos confirmando a assinatura com a Stripe.',
    bannerTone: 'warning',
  },
}

const bannerToneClass = {
  danger: 'border-destructive/15 bg-destructive/5 text-destructive',
  warning: 'border-amber-500/15 bg-amber-500/5 text-amber-700 dark:text-amber-400',
  info: 'border-primary/15 bg-primary/5 text-primary',
} as const

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function BillingStatus() {
  const { subscription, isLoading, error } = useBillingSubscription()
  const billingPath = useRequiredProjectPath('/billing')
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
          body: JSON.stringify({ returnUrl: billingPath }),
          orgId: subscription.organizationId,
        })) as { url: string }
        window.location.href = data.url
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Não foi possível abrir o portal da Stripe.')
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
  const cancellationScheduled = status === 'active' && subscription.canceledAtPeriodEnd
  const bannerMessage = cancellationScheduled
    ? 'Renovação cancelada — seu acesso segue ativo até o fim do ciclo atual.'
    : localTrial && subscription.trialEndsAt
      ? `Trial ativo até ${formatDate(new Date(subscription.trialEndsAt), 'dd/MM/yyyy')}.`
      : config.banner
  const bannerTone = cancellationScheduled ? 'warning' : localTrial ? 'info' : (config.bannerTone ?? 'danger')
  const entitlements = subscription.entitlements
  const activeAddons = subscription.items.filter(
    (item) => item.kind === 'addon' && item.quantity > 0,
  )

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden rounded-xl border border-border bg-card"
      >
        {bannerMessage && (
          <div className={`flex items-center gap-2.5 border-b px-6 py-3 ${bannerToneClass[bannerTone]}`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{bannerMessage}</p>
          </div>
        )}

        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">{planName}</h3>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.pill}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                  {config.label}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Base {formatMoney(subscription.items.find((item) => item.kind === 'base')?.unitPrice ?? 497)}
                {' '}por mês
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <FolderKanban className="h-3.5 w-3.5" />
                Clientes ativos
              </div>
              <div className="text-2xl font-semibold text-foreground">
                {entitlements.activeProjects}
                <span className="text-base font-normal text-muted-foreground">
                  {' '}de {entitlements.includedProjects}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {entitlements.additionalProjects > 0
                  ? `${entitlements.additionalProjects} projeto(s) extra faturável(is)`
                  : 'Dentro da franquia base'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <MessageCircleMore className="h-3.5 w-3.5" />
                WhatsApp extra
              </div>
              <div className="text-2xl font-semibold text-foreground">
                {entitlements.additionalWhatsAppNumbers}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {entitlements.includedWhatsAppPerProject} incluído por cliente
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Megaphone className="h-3.5 w-3.5" />
                Meta Ads extra
              </div>
              <div className="text-2xl font-semibold text-foreground">
                {entitlements.additionalMetaAdAccounts}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {entitlements.includedMetaAdAccountsPerProject} incluída por cliente
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Franquia por cliente
              </p>
              <div className="mt-3 space-y-2 text-sm text-foreground">
                <p>{entitlements.includedConversionsPerProject} conversões rastreadas / mês</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Add-ons ativos
              </p>
              <div className="mt-3 space-y-2 text-sm text-foreground">
                {activeAddons.length > 0 ? (
                  activeAddons.map((item) => (
                    <p key={item.planSlug}>
                      {item.planName}: {item.quantity} × {formatMoney(item.unitPrice)}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground">Nenhum add-on faturável no momento.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Próximo ciclo
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatDate(new Date(subscription.nextResetDate), 'dd/MM/yyyy')}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Trial e expansão
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Durante o trial você libera 1 cliente com 1 WhatsApp e 1 conta Meta Ads. No plano pago, extras são faturados automaticamente.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!localTrial ? (
              <Button onClick={handleOpenPortal} disabled={isOpeningPortal} size="sm" variant="outline">
                {isOpeningPortal ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                )}
                Gerenciar assinatura
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href={billingPath}>Ativar plano</Link>
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
