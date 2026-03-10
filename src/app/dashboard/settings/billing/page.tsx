import { CreditCard } from 'lucide-react'
import { redirect } from 'next/navigation'

import { BillingPlanList } from '@/components/dashboard/billing/billing-plan-list'
import { PageContent } from '@/components/dashboard/layout/page-content'
import { PageHeader } from '@/components/dashboard/layout/page-header'
import { PageShell } from '@/components/dashboard/layout/page-shell'
import { isAdmin } from '@/lib/auth/rbac/roles'
import { billingPlanListQuerySchema } from '@/schemas/billing/billing-plan-schemas'
import { listBillingPlans } from '@/services/billing/billing-plan-query.service'
import { getServerSession } from '@/server/auth/server-session'

type BillingSettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function normalizeSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  return Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  )
}

export const metadata = {
  title: 'Planos e Cobrança | WhaTrack',
  description: 'Gerencie o catálogo interno de planos e a sincronização com a Stripe.',
}

export default async function BillingSettingsPage({
  searchParams,
}: BillingSettingsPageProps) {
  const session = await getServerSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  if (!isAdmin(session.user.role)) {
    redirect('/dashboard')
  }

  const rawSearchParams = normalizeSearchParams((await searchParams) ?? {})
  const filters = billingPlanListQuerySchema.parse(rawSearchParams)
  const data = await listBillingPlans(filters)

  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        title="Planos e Cobrança"
        description="Catálogo interno dos planos, com visão de quotas, assinaturas e sincronização com a Stripe."
        icon={CreditCard}
      />

      <PageContent>
        <BillingPlanList data={data} filters={filters} />
      </PageContent>
    </PageShell>
  )
}
