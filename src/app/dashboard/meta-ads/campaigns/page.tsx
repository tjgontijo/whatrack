import { Metadata } from 'next'
import { BarChart3 } from 'lucide-react'
import { PageShell, PageHeader, PageContent } from '@/components/dashboard/layout'
import { MetaAdsCampaignsClient } from './client'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Meta Ads Campanhas | Whatrack',
  description: 'Acompanhe as métricas detalhadas das suas campanhas no Meta Ads.',
}

export default async function MetaAdsCampaignsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect('/sign-in')
  }

  return (
    <PageShell>
      <PageHeader
        title="Campanhas do Meta"
        description="Acompanhamento e dados detalhados das suas campanhas ativas"
        icon={BarChart3}
      />

      <PageContent>
        <MetaAdsCampaignsClient />
      </PageContent>
    </PageShell>
  )
}
