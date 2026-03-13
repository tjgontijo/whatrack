'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MessageSquare, TrendingUp, Plug } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

import { MetaAdsSettingsContent } from '@/components/dashboard/meta-ads/settings/meta-ads-settings-content'
import { WhatsAppSettingsPage } from '@/components/dashboard/settings/whatsapp-settings-page'
import { TemplateMainHeader } from '@/components/dashboard/leads'

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

  const tabs = [
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'meta-ads', label: 'Meta Ads', icon: TrendingUp },
  ] as const

  return (
    <>
      <TemplateMainHeader className="mt-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg mb-3">
            <Plug className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-foreground text-lg font-bold tracking-tight mb-0.5">Integrações</h1>
            <p className="text-muted-foreground text-xs mb-3">
              Centralize WhatsApp e Meta Ads em um único hub de configuração por projeto.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 -ml-3">
          {tabs.map((tab) => {
            const isActive = initialTab === tab.id
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'ring-offset-background focus-visible:ring-ring group relative flex items-center gap-2 px-3 py-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="bg-primary absolute inset-x-0 -bottom-[1px] h-[2px] shadow-[0_0_8px_0_var(--color-primary)]" />
                )}
                {!isActive && (
                  <span className="group-hover:bg-muted-foreground/20 absolute inset-x-0 -bottom-[1px] h-[2px] bg-transparent transition-colors" />
                )}
              </button>
            )
          })}
        </div>
      </TemplateMainHeader>

      <div className="flex-1 overflow-y-auto">
        {initialTab === 'whatsapp' ? (
          <WhatsAppSettingsPage organizationId={organizationId} />
        ) : (
          <MetaAdsSettingsContent organizationId={organizationId} />
        )}
      </div>
    </>
  )
}
