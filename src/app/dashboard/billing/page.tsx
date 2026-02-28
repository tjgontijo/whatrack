import { Suspense } from 'react'
import { CreditCard } from 'lucide-react'
import { PageShell } from '@/components/dashboard/layout/page-shell'
import { PageHeader } from '@/components/dashboard/layout/page-header'
import { PageContent } from '@/components/dashboard/layout/page-content'
import { BillingStatus } from '@/components/dashboard/billing/billing-status'
import { UsageProgress } from '@/components/dashboard/billing/usage-progress'
import { PlanSelector } from '@/components/dashboard/billing/plan-selector'
import { BillingPageSkeleton } from '@/components/dashboard/billing/billing-page-skeleton'
import { BillingPageContent } from '@/components/dashboard/billing/billing-page-content'

export const metadata = {
  title: 'Billing | WhaTrack',
  description: 'Gerencie sua assinatura e acompanhe o uso de eventos.',
}

export default function BillingPage() {
  return (
    <PageShell maxWidth="3xl">
      <PageHeader
        title="Billing"
        description="Gerencie sua assinatura e acompanhe o uso de eventos."
        icon={CreditCard}
      />

      <PageContent>
        <Suspense fallback={<BillingPageSkeleton />}>
          <BillingPageContent />
        </Suspense>
      </PageContent>
    </PageShell>
  )
}
