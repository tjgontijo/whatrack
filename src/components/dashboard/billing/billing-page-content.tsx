'use client'

import { CrudEmptyState } from '@/components/dashboard/crud/crud-data-view'
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
  const pendingSubscription = Boolean(subscription && !subscription.isActive)

  if (orgLoading || isLoading || !org?.id) {
    return null // Skeleton exibido pelo Suspense
  }

  // Se não tem subscription, mostrar seletor de planos
  if (!subscription) {
    return (
      <div className="space-y-6" data-testid="billing-page-empty-state">
        <CrudEmptyState
          title="Nenhuma assinatura encontrada."
          description="Tente buscar por termos diferentes ou verifique os filtros."
        />
        <PlanSelector plans={availablePlans} showHeader={false} />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="billing-page-content">
      <BillingStatus />
      {pendingSubscription ? <PlanSelector plans={availablePlans} /> : null}
    </div>
  )
}
