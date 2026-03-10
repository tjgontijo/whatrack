'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getBillingStatusLabel } from '@/lib/billing/subscription-status'
import type { SubscriptionResponse } from '@/schemas/billing/billing-schemas'

type AccountBillingCardProps = {
  subscription: SubscriptionResponse | null
}

function formatPlanLabel(planName: string | null | undefined, planType: string) {
  if (planName?.trim()) return planName

  return planType
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function AccountBillingCard({
  subscription,
}: AccountBillingCardProps) {
  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plano e cobrança</CardTitle>
          <CardDescription>
            Sua conta ainda não tem um plano ativo. Abra o billing para contratar ou alterar o plano.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Plano atual
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">Nenhum plano ativo</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/billing">Abrir billing</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/billing">Ver planos</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const planName = formatPlanLabel(subscription.planName, subscription.planType)
  const trialActive =
    subscription.trialEndsAt != null && new Date(subscription.trialEndsAt).getTime() > Date.now()

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
              {trialActive ? 'Teste grátis ativo' : getBillingStatusLabel(subscription.status)}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Clientes incluídos
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {subscription.entitlements.includedProjects.toLocaleString('pt-BR')}
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
