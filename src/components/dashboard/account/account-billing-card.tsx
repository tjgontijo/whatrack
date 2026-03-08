'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getBillingPlanLabel } from '@/lib/billing/plans'
import type { SubscriptionResponse } from '@/schemas/billing/billing-schemas'
import { PlanSelector } from '@/components/dashboard/billing/plan-selector'

type AccountBillingCardProps = {
  subscription: SubscriptionResponse | null
  isLoading: boolean
}

const STATUS_LABELS: Record<SubscriptionResponse['status'], string> = {
  active: 'Ativo',
  paused: 'Pausado',
  canceled: 'Cancelado',
  past_due: 'Pagamento pendente',
}

export function AccountBillingCard({
  subscription,
  isLoading,
}: AccountBillingCardProps) {
  if (isLoading) {
    return null
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plano e cobrança</CardTitle>
          <CardDescription>
            Sua conta ainda não tem um plano ativo. Escolha um plano para seguir com a configuração.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlanSelector redirectPath="/dashboard/account" showHeader={false} />
        </CardContent>
      </Card>
    )
  }

  const planName = getBillingPlanLabel(subscription.planType)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plano e cobrança</CardTitle>
        <CardDescription>
          Acompanhe o plano ativo da organização e abra o billing para gerenciar sua assinatura.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Plano atual
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">{planName}</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Status
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {STATUS_LABELS[subscription.status]}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Limite mensal
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {subscription.eventLimitPerMonth.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/billing">Abrir billing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/billing">Ver planos e limites</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
