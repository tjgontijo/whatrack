'use client'

import { useMemo, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'

import { HeaderPageShell, HeaderTabs, type HeaderTab } from '@/components/dashboard/layout'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth/auth-client'
import { useWhatsAppOnboarding } from '@/hooks/whatsapp/use-whatsapp-onboarding'
import { WhatsAppSettingsPage } from './whatsapp-settings-page'
import { WebhooksView } from './webhooks-view'

type WhatsAppSettingsHubProps = {
  organizationId?: string
}

export function WhatsAppSettingsHub({ organizationId }: WhatsAppSettingsHubProps) {
  const { data: session } = authClient.useSession()
  const canViewWebhooks = session?.user?.role === 'admin' || session?.user?.role === 'owner'
  const [activeTab, setActiveTab] = useState<'instances' | 'webhook'>('instances')
  const [searchValue, setSearchValue] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefetch = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 800)
  }

  const { status: onboardingStatus, sdkReady, startOnboarding } = useWhatsAppOnboarding(handleRefetch)
  const isOnboarding = onboardingStatus === 'pending'

  const tabs = useMemo<HeaderTab[]>(
    () => [
      { key: 'instances', label: 'Instâncias' },
      ...(canViewWebhooks ? [{ key: 'webhook', label: 'Webhook' } satisfies HeaderTab] : []),
    ],
    [canViewWebhooks]
  )

  return (
    <HeaderPageShell
      title="WhatsApp"
      selector={
        <HeaderTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as 'instances' | 'webhook')}
        />
      }
      searchValue={activeTab === 'instances' ? searchValue : undefined}
      onSearchChange={activeTab === 'instances' ? setSearchValue : undefined}
      searchPlaceholder="Buscar instância..."
      onRefresh={activeTab === 'instances' ? handleRefetch : undefined}
      isRefreshing={isRefreshing}
      primaryAction={
        activeTab === 'instances' ? (
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={startOnboarding}
            disabled={!sdkReady || isOnboarding}
          >
            {isOnboarding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Nova Instância
          </Button>
        ) : null
      }
    >
      {activeTab === 'webhook' && canViewWebhooks ? (
        <WebhooksView />
      ) : (
        <WhatsAppSettingsPage
          organizationId={organizationId}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          sdkReady={sdkReady}
          isOnboarding={isOnboarding}
          onStartOnboarding={startOnboarding}
        />
      )}
    </HeaderPageShell>
  )
}
