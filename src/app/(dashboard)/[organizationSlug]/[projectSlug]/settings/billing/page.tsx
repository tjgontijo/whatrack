import { notFound, redirect } from 'next/navigation'
import { BillingPlanList } from '@/features/billing/components/billing-plan-list'
import { billingPlanListQuerySchema } from '@/features/billing/schemas/billing-plan-schemas'
import { listBillingPlans } from '@/features/billing/services/billing-plan-query.service'
import { HeaderPageShell, RefreshButton } from '@/features/dashboard/components/layout'
import { isAdmin } from '@/lib/auth/rbac/roles'
import { getServerSession } from '@/server/auth/server-session'

type BillingSettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function normalizeSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ])
  )
}

export const metadata = {
  title: 'Planos e Cobrança | WhaTrack',
  description: 'Gerencie o catálogo interno de planos e as configurações de faturamento.',
}

export default async function BillingSettingsPage({ searchParams }: BillingSettingsPageProps) {
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
      title='Planos e Cobrança'
      refreshAction={<RefreshButton queryKey={['billing-plans']} />}
    >
      <BillingPlanList data={data} filters={filters} />
    </HeaderPageShell>
  )
}
