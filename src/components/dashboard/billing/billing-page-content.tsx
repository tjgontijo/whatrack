'use client'

import { useOrganization } from '@/hooks/organization/use-organization'
import { useBillingSubscription } from '@/hooks/billing/use-billing-subscription'
import type { PublicBillingPlan } from '@/schemas/billing/billing-plan-schemas'
import { BillingStatus } from './billing-status'
import { PlanSelector } from './plan-selector'

interface BillingPageContentProps {
  availablePlans: PublicBillingPlan[]
}

export function BillingPageContent({ availablePlans }: BillingPageContentProps) {
  const { data: org, isLoading: orgLoading } = useOrganization()
  const { subscription, isLoading } = useBillingSubscription()
  const trialActive =
    subscription?.trialEndsAt != null && new Date(subscription.trialEndsAt).getTime() > Date.now()
  const localTrial = Boolean(subscription && trialActive && !subscription.providerSubscriptionId)

  if (orgLoading || isLoading) {
    return null // Skeleton exibido pelo Suspense
  }

  // Se não tem organização, mostrar aviso
  if (!org?.id) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-900 font-medium">
          Nenhuma organização selecionada. Por favor, complete o cadastro da sua organização.
        </p>
      </div>
    )
  }

  // Se não tem subscription, mostrar seletor de planos
  if (!subscription) {
    return <PlanSelector plans={availablePlans} />
  }

  return (
    <div className="space-y-6" data-testid="billing-page-content">
      <BillingStatus />
      {localTrial ? <PlanSelector plans={availablePlans} /> : null}
    </div>
  )
}
