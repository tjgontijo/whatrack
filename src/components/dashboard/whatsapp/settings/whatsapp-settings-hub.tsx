'use client'

import { useCallback, useMemo, useState } from 'react'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'

import { HeaderPageShell, HeaderTabs, type HeaderTab } from '@/components/dashboard/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth/auth-client'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { useWhatsAppOnboarding } from '@/hooks/whatsapp/use-whatsapp-onboarding'
import { WhatsAppSettingsPage } from './whatsapp-settings-page'
import { WebhooksView } from './webhooks-view'

type DatePreset = 'all' | 'today' | '7d' | '30d'

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
]

type WhatsAppSettingsHubProps = {
  organizationId?: string
}

export function WhatsAppSettingsHub({ organizationId }: WhatsAppSettingsHubProps) {
  const { data: session } = authClient.useSession()
  const { organizationId: contextOrganizationId } = useRequiredProjectRouteContext()
  const queryClient = useQueryClient()
  const canViewWebhooks = session?.user?.role === 'admin' || session?.user?.role === 'owner'
  const [activeTab, setActiveTab] = useState<'instances' | 'webhook'>('instances')
  const [searchValue, setSearchValue] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const resolvedOrganizationId = organizationId ?? contextOrganizationId
  const isRefreshingInstances =
    useIsFetching({
      queryKey: ['whatsapp', 'phone-numbers', resolvedOrganizationId],
    }) > 0

  const isRefreshingLogs =
    useIsFetching({
      queryKey: ['whatsapp', 'webhook', 'logs', resolvedOrganizationId],
    }) > 0

  const isRefreshing = activeTab === 'webhook' ? isRefreshingLogs : isRefreshingInstances

  const handleRefetch = useCallback(() => {
    if (!resolvedOrganizationId) return

    if (activeTab === 'webhook') {
      void queryClient.invalidateQueries({
        queryKey: ['whatsapp', 'webhook', 'logs', resolvedOrganizationId],
      })
    } else {
      void queryClient.invalidateQueries({
        queryKey: ['whatsapp', 'phone-numbers', resolvedOrganizationId],
      })
    }
  }, [queryClient, resolvedOrganizationId, activeTab])

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
      onRefresh={handleRefetch}
      isRefreshing={isRefreshing}
      filters={
        activeTab === 'webhook' ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Tipo de Evento
              </Label>
              <Input
                placeholder="Ex: messages, statuses..."
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Período
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={datePreset === preset.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDatePreset(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : undefined
      }
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
        <WebhooksView eventTypeFilter={eventTypeFilter} datePreset={datePreset} />
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
