'use client'

import { useCallback, useMemo, useState } from 'react'
import { useIsFetching, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Send } from 'lucide-react'
import { toast } from 'sonner'

import { HeaderPageShell, HeaderTabs, type HeaderTab } from '@/components/dashboard/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth/auth-client'
import { ORGANIZATION_HEADER } from '@/lib/constants/http-headers'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { useWhatsAppOnboarding } from '@/hooks/whatsapp/use-whatsapp-onboarding'
import { whatsappApi } from '@/lib/whatsapp/client'
import { TemplateEditorForm } from '@/components/dashboard/whatsapp/template-editor/template-editor-form'
import { AccountTab } from './account-tab'
import { TemplatesView } from './templates-view'
import { WebhooksView } from './webhooks-view'
import { DebugTab } from './debug-tab'
import { SendTestSheet } from '../send-test-sheet'
import type { WhatsAppTemplate } from '@/types/whatsapp/whatsapp'
import type { WhatsAppInstance } from './instance-card-detail'

type Tab = 'conta' | 'templates' | 'webhook' | 'debug'
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
  const { organizationId: contextOrganizationId, projectId } = useRequiredProjectRouteContext()
  const queryClient = useQueryClient()
  const resolvedOrgId = organizationId ?? contextOrganizationId

  const canViewWebhooks = session?.user?.role === 'admin' || session?.user?.role === 'owner'

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('conta')

  // Templates tab filters
  const [searchValue, setSearchValue] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState('Todos')

  // Webhook tab filters
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')

  // Template editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null)

  // Send test sheet state
  const [sendTestOpen, setSendTestOpen] = useState(false)
  const [sendTestPhone, setSendTestPhone] = useState<WhatsAppInstance | null>(null)
  const [sendTestTemplate, setSendTestTemplate] = useState<string | undefined>(undefined)

  const { data: instancesData, isLoading: instancesLoading } = useQuery({
    queryKey: ['whatsapp', 'instances', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/whatsapp/instances?projectId=${projectId}`, {
        headers: { [ORGANIZATION_HEADER]: resolvedOrgId },
      })
      if (!res.ok) throw new Error('Failed to fetch instances')
      return res.json() as Promise<{ items: WhatsAppInstance[] }>
    },
    enabled: !!resolvedOrgId && !!projectId,
  })

  const instance = instancesData?.items?.[0] ?? null

  // Fetch templates for templates tab
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['whatsapp', 'templates', resolvedOrgId],
    queryFn: () => whatsappApi.getTemplates(resolvedOrgId),
    enabled: activeTab === 'templates' && !!resolvedOrgId,
  })

  // Refreshing state
  const isRefreshingConta = useIsFetching({ queryKey: ['whatsapp', 'instances', projectId] }) > 0
  const isRefreshingTemplates = useIsFetching({ queryKey: ['whatsapp', 'templates', resolvedOrgId] }) > 0
  const isRefreshingLogs = useIsFetching({ queryKey: ['whatsapp', 'webhook', 'logs', resolvedOrgId] }) > 0
  const isRefreshing =
    activeTab === 'conta' ? isRefreshingConta :
    activeTab === 'templates' ? isRefreshingTemplates :
    isRefreshingLogs

  const handleRefetch = useCallback(() => {
    if (!resolvedOrgId) return
    if (activeTab === 'conta') {
      void queryClient.invalidateQueries({ queryKey: ['whatsapp', 'instances', projectId] })
    } else if (activeTab === 'templates') {
      void queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates', resolvedOrgId] })
    } else {
      void queryClient.invalidateQueries({ queryKey: ['whatsapp', 'webhook', 'logs', resolvedOrgId] })
    }
  }, [queryClient, resolvedOrgId, projectId, activeTab])

  const {
    startOnboarding,
    status: onboardingStatus,
    sdkReady,
  } = useWhatsAppOnboarding(handleRefetch)

  const isConnectingWhatsApp = onboardingStatus === 'pending'

  const tabs = useMemo<HeaderTab[]>(
    () => [
      { key: 'conta', label: 'Conta' },
      { key: 'templates', label: 'Templates' },
      ...(canViewWebhooks ? [
        { key: 'webhook', label: 'Webhook' } satisfies HeaderTab,
        { key: 'debug', label: 'Debug' } satisfies HeaderTab,
      ] : []),
    ],
    [canViewWebhooks]
  )

  // Handlers for AccountTab
  const handleSendTestFromAccount = useCallback((phone: WhatsAppInstance) => {
    setSendTestPhone(phone)
    setSendTestTemplate(undefined)
    setSendTestOpen(true)
  }, [])

  const { mutateAsync: handleDisconnectAsync } = useMutation({
    mutationFn: async () => {
      if (!instance?.id) throw new Error('No instance to disconnect')
      await whatsappApi.disconnect(instance.id, resolvedOrgId)
    },
    onSuccess: async () => {
      toast.success('Número WhatsApp desconectado com sucesso')
      // Invalidate and refetch instances
      await queryClient.invalidateQueries({ queryKey: ['whatsapp', 'instances', projectId] })
      await queryClient.refetchQueries({ queryKey: ['whatsapp', 'instances', projectId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao desconectar')
    },
  })

  // Handlers for TemplatesView
  const handleNewTemplate = useCallback(() => {
    setSelectedTemplate(null)
    setEditorOpen(true)
  }, [])

  const handleEditTemplate = useCallback((template: WhatsAppTemplate) => {
    setSelectedTemplate(template)
    setEditorOpen(true)
  }, [])

  const handleSendTestFromTemplate = (template: WhatsAppTemplate) => {
    // Need a phone to send test — try to get from instances cache
    setSendTestTemplate(template.name)
    setSendTestPhone(null)
    setSendTestOpen(true)
  }

  // Primary action per tab
  const primaryAction = useMemo(() => {
    if (activeTab === 'conta') {
      if (instancesLoading) {
        return (
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            disabled
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Carregando instância...
          </Button>
        )
      }

      if (instance) {
        return (
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => handleSendTestFromAccount(instance)}
          >
            <Send className="h-3.5 w-3.5" />
            Enviar Teste
          </Button>
        )
      }

      return (
        <Button
          type="button"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={startOnboarding}
          disabled={!sdkReady || isConnectingWhatsApp}
        >
          {isConnectingWhatsApp ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Nova Instância
        </Button>
      )
    }

    if (activeTab === 'templates') {
      return (
        <Button
          type="button"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={handleNewTemplate}
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Template
        </Button>
      )
    }
    return null
  }, [
    activeTab,
    handleNewTemplate,
    handleSendTestFromAccount,
    instance,
    instancesLoading,
    isConnectingWhatsApp,
    sdkReady,
    startOnboarding,
  ])

  // Filters per tab
  const filters = useMemo(() => {
    if (activeTab === 'templates') {
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Categoria
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {['Todos', 'Marketing', 'Utilidade', 'Autenticação'].map((cat) => (
                <Button
                  key={cat}
                  type="button"
                  variant={categoryFilter === cat ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Status
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {['Todos', 'Aprovados', 'Em análise', 'Reprovados'].map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === 'webhook') {
      return (
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
      )
    }

    return undefined
  }, [activeTab, categoryFilter, statusFilter, eventTypeFilter, datePreset])

  return (
    <>
      {activeTab === 'templates' && editorOpen ? (
        <TemplateEditorForm
          template={selectedTemplate}
          onClose={() => {
            setEditorOpen(false)
            setSelectedTemplate(null)
          }}
        />
      ) : (
      <HeaderPageShell
        title="WhatsApp"
        selector={
          <HeaderTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as Tab)}
          />
        }
        searchValue={activeTab === 'templates' ? searchValue : undefined}
        onSearchChange={activeTab === 'templates' ? setSearchValue : undefined}
        searchPlaceholder="Buscar template..."
        onRefresh={handleRefetch}
        isRefreshing={isRefreshing}
        filters={filters}
        primaryAction={primaryAction}
      >
        {activeTab === 'conta' && (
          <AccountTab
            instance={instance}
            isLoading={instancesLoading}
            isConnecting={isConnectingWhatsApp}
            canStartOnboarding={sdkReady}
            onConnectClick={startOnboarding}
            onSendTestClick={handleSendTestFromAccount}
            onDisconnectClick={() => handleDisconnectAsync()}
          />
        )}

        {activeTab === 'templates' && (
          <TemplatesView
            templates={templates}
            isLoading={templatesLoading}
            searchValue={searchValue}
            categoryFilter={categoryFilter}
            statusFilter={statusFilter}
            organizationId={resolvedOrgId}
            onEditClick={handleEditTemplate}
            onSendTestClick={handleSendTestFromTemplate}
          />
        )}

        {activeTab === 'webhook' && canViewWebhooks && (
          <WebhooksView eventTypeFilter={eventTypeFilter} datePreset={datePreset} />
        )}

        {activeTab === 'debug' && canViewWebhooks && (
          <DebugTab />
        )}
      </HeaderPageShell>
      )}

      {/* Send test sheet */}
      {sendTestPhone && (
        <SendTestSheet
          phone={sendTestPhone}
          organizationId={resolvedOrgId}
          open={sendTestOpen}
          onOpenChange={setSendTestOpen}
          initialTemplate={sendTestTemplate}
        />
      )}
    </>
  )
}
