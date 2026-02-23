import { Metadata } from 'next'
import { MetaAdsCampaignsClient } from './client'
import { TemplateMainShell, TemplateMainHeader } from '@/components/dashboard/leads'
import { AuthGuards } from '@/lib/auth/roles'
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
    <TemplateMainShell className="flex min-w-0 flex-col bg-[#FAFAFA]">
      <TemplateMainHeader
        title="Campanhas do Meta"
        subtitle="Acompanhamento e dados detalhados das suas campanhas ativas"
      />
      <div className="w-full min-w-0 flex-1 p-4 md:p-8">
        <MetaAdsCampaignsClient />
      </div>
    </TemplateMainShell>
  )
}
