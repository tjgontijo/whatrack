'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MessageSquare, Plug, TrendingUp } from 'lucide-react'

import { SectionHeader, SectionTabsList, SectionTabsTrigger } from '@/components/dashboard/layout'
import { MetaAdsSettingsContent } from '@/components/dashboard/meta-ads/settings/meta-ads-settings-content'
import { WhatsAppSettingsHub } from '@/components/dashboard/whatsapp/settings/whatsapp-settings-hub'
import { Tabs, TabsContent } from '@/components/ui/tabs'

type IntegrationsHubProps = {
  organizationId: string
  initialTab: 'whatsapp' | 'meta-ads'
}

function normalizeTab(value: string | null | undefined): 'whatsapp' | 'meta-ads' {
  return value === 'meta-ads' ? 'meta-ads' : 'whatsapp'
}

export function IntegrationsHub({ organizationId, initialTab }: IntegrationsHubProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = normalizeTab(searchParams.get('tab') ?? initialTab)

  const handleTabChange = (value: string) => {
    const tab = normalizeTab(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(nextUrl, { scroll: false })
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <SectionHeader
        className="mt-6"
        icon={Plug}
        title="Integrações"
        subtitle="Centralize WhatsApp e Meta Ads em um único hub de configuração por projeto."
      >
        <SectionTabsList className="-ml-3">
          <SectionTabsTrigger value="whatsapp" icon={MessageSquare}>
            WhatsApp
          </SectionTabsTrigger>
          <SectionTabsTrigger value="meta-ads" icon={TrendingUp}>
            Meta Ads
          </SectionTabsTrigger>
        </SectionTabsList>
      </SectionHeader>

      <TabsContent value="whatsapp" className="mt-0 flex-1 overflow-y-auto">
        <WhatsAppSettingsHub organizationId={organizationId} />
      </TabsContent>
      <TabsContent value="meta-ads" className="mt-0 flex-1 overflow-y-auto">
        <MetaAdsSettingsContent organizationId={organizationId} />
      </TabsContent>
    </Tabs>
  )
}
