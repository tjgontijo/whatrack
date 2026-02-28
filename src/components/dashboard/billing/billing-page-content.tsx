'use client'

import { useBillingSubscription } from '@/hooks/billing/use-billing-subscription'
import { BillingStatus } from './billing-status'
import { UsageProgress } from './usage-progress'
import { PlanSelector } from './plan-selector'

export function BillingPageContent() {
  const { subscription, isLoading } = useBillingSubscription()

  if (isLoading) {
    return null // Skeleton exibido pelo Suspense
  }

  // Se não tem subscription, mostrar seletor de planos
  if (!subscription) {
    return <PlanSelector />
  }

  // Se tem subscription, mostrar status + uso
  return (
    <>
      <BillingStatus />
      <UsageProgress />
    </>
  )
}
