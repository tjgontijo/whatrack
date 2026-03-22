import { notFound, redirect } from 'next/navigation'

import { HeaderPageShell, RefreshButton } from '@/components/dashboard/layout'
import { BillingPlanList } from '@/components/dashboard/billing/billing-plan-list'
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
    notFound()
  }

  const rawSearchParams = normalizeSearchParams((await searchParams) ?? {})
  const filters = billingPlanListQuerySchema.parse(rawSearchParams)
  const data = await listBillingPlans(filters)

  return (
    <HeaderPageShell
      title="Planos e Cobrança"
      refreshAction={<RefreshButton queryKey={['billing-plans']} />}
    >
      <BillingPlanList data={data} filters={filters} />
    </HeaderPageShell>
  )
}
