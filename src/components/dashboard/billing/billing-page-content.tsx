'use client'

import { useOrganization } from '@/hooks/organization/use-organization'
import { useBillingSubscription } from '@/hooks/billing/use-billing-subscription'
import { BillingStatus } from './billing-status'
import { UsageProgress } from './usage-progress'
import { PlanSelector } from './plan-selector'

export function BillingPageContent() {
  const { data: org, isLoading: orgLoading } = useOrganization()
  const { subscription, isLoading } = useBillingSubscription()

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
    return <PlanSelector />
  }

  // Se tem subscription, mostrar status + uso
  return (
    <div className="space-y-6" data-testid="billing-page-content">
      <BillingStatus />
      <UsageProgress />
    </div>
  )
}
