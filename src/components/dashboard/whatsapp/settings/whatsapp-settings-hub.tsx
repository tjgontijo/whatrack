'use client'

import { useMemo, useState } from 'react'

import { SectionPageShell, type SectionTab } from '@/components/dashboard/layout'
import { authClient } from '@/lib/auth/auth-client'
import { WhatsAppSettingsPage } from './whatsapp-settings-page'
import { WebhooksView } from './webhooks-view'

type WhatsAppSettingsHubProps = {
  organizationId?: string
}

export function WhatsAppSettingsHub({ organizationId }: WhatsAppSettingsHubProps) {
  const { data: session } = authClient.useSession()
  const canViewWebhooks = session?.user?.role === 'admin' || session?.user?.role === 'owner'
  const [activeTab, setActiveTab] = useState<'instances' | 'webhook'>('instances')

  const tabs = useMemo<SectionTab[]>(
    () => [
      { key: 'instances', label: 'Instâncias' },
      ...(canViewWebhooks ? [{ key: 'webhook', label: 'Webhook' } satisfies SectionTab] : []),
    ],
    [canViewWebhooks]
  )

  return (
    <SectionPageShell
      title="WhatsApp"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as 'instances' | 'webhook')}
    >
      {activeTab === 'webhook' && canViewWebhooks ? (
        <WebhooksView />
      ) : (
        <WhatsAppSettingsPage organizationId={organizationId} />
      )}
    </SectionPageShell>
  )
}
