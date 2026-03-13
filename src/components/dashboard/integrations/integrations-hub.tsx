'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MessageSquare, TrendingUp } from 'lucide-react'

import { MetaAdsSettingsContent } from '@/components/dashboard/meta-ads/settings/meta-ads-settings-content'
import { WhatsAppSettingsPage } from '@/components/dashboard/settings/whatsapp-settings-page'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type IntegrationsHubProps = {
  organizationId: string
  initialTab: 'whatsapp' | 'meta-ads'
}

export function IntegrationsHub({
  organizationId,
  initialTab,
}: IntegrationsHubProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <Tabs value={initialTab} onValueChange={handleTabChange} className="w-full gap-5">
      <TabsList variant="line" className="mb-1 w-full justify-start rounded-none border-b p-0">
        <TabsTrigger value="whatsapp" className="flex-none rounded-none px-4">
          <MessageSquare className="mr-2 h-4 w-4" />
          WhatsApp
        </TabsTrigger>
        <TabsTrigger value="meta-ads" className="flex-none rounded-none px-4">
          <TrendingUp className="mr-2 h-4 w-4" />
          Meta Ads
        </TabsTrigger>
      </TabsList>

      <TabsContent value="whatsapp" className="mt-0 outline-none">
        <WhatsAppSettingsPage organizationId={organizationId} />
      </TabsContent>

      <TabsContent value="meta-ads" className="mt-0 outline-none">
        <MetaAdsSettingsContent organizationId={organizationId} />
      </TabsContent>
    </Tabs>
  )
}
