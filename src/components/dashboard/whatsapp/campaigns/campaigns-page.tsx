'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useDeferredValue } from 'react'

import {
  CrudDataView,
  CrudListView,
  type ColumnDef,
} from '@/components/dashboard/crud'
import { HeaderPageShell, HeaderTabs } from '@/components/dashboard/layout'
import { CrudEmptyState } from '@/components/dashboard/crud/crud-data-view'
import { CampaignsOverview } from './campaigns-overview'
import { CampaignFormDrawer } from './campaign-form-drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRequiredProjectPath, useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { apiFetch } from '@/lib/api-client'

const TABS = [
  { key: 'overview', label: 'Visão Geral' },
  { key: 'campaigns', label: 'Campanhas' },
]

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendada',
  PROCESSING: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
}

const STATUS_VARIANTS: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  SCHEDULED: 'default',
  PROCESSING: 'default',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
}

const TYPE_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  OPERATIONAL: 'Operacional',
}

interface CampaignItem {
  id: string
  name: string
  type: string
  status: string
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  templateName: string | null
  projectId: string
  projectName: string | null
  createdAt: string
  createdByName: string | null
  approvedByName: string | null
  approvedAt: string | null
  totalRecipients: number
  totalDispatchGroups: number
}

interface CampaignsResponse {
  items: CampaignItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  counters: {
    total: number
    draft: number
    pendingApproval: number
    scheduled: number
    processing: number
    completed: number
    cancelled: number
  }
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

type CampaignsPageProps = {
  initialCreateOpen?: boolean
}

export function CampaignsPage({ initialCreateOpen = false }: CampaignsPageProps = {}) {
  const router = useRouter()
  const campaignsPath = useRequiredProjectPath('/whatsapp/campaigns')
  const { organizationId, projectId } = useRequiredProjectRouteContext()

  const [activeTab, setActiveTab] = React.useState('overview')
  const [searchInput, setSearchInput] = React.useState('')
  const [isCreateOpen, setIsCreateOpen] = React.useState(initialCreateOpen)
  const deferredSearch = useDeferredValue(searchInput)

  const { data, isLoading, refetch, isRefetching } = useQuery<CampaignsResponse>({
    queryKey: ['whatsapp-campaigns', organizationId, projectId],
    queryFn: async () => {
      const url = new URL('/api/v1/whatsapp/campaigns', window.location.origin)
      if (projectId) url.searchParams.set('projectId', projectId)
      const response = await apiFetch(url.toString(), { orgId: organizationId, projectId })
      return response as CampaignsResponse
    },
    enabled: !!organizationId && !!projectId,
  })

  const filteredItems = React.useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    if (!query) return data?.items || []
    return (data?.items || []).filter((campaign) =>
      campaign.name.toLowerCase().includes(query) ||
      (campaign.templateName || '').toLowerCase().includes(query)
    )
  }, [data?.items, deferredSearch])

  const openCampaignDetail = React.useCallback(
    (campaignId: string) => router.push(`${campaignsPath}/${campaignId}`),
    [campaignsPath, router],
  )

  const columns: ColumnDef<CampaignItem>[] = [
    {
      key: 'name',
      label: 'Campanha',
      render: (campaign) => (
        <div className="space-y-0.5">
          <button
            className="font-medium hover:underline text-left"
            onClick={() => openCampaignDetail(campaign.id)}
          >
            {campaign.name}
          </button>
          <div className="text-muted-foreground text-xs">
            {campaign.templateName ? `Template: ${campaign.templateName}` : 'Sem template'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 130,
      render: (campaign) => (
        <Badge variant={STATUS_VARIANTS[campaign.status] || 'secondary'}>
          {STATUS_LABELS[campaign.status] || campaign.status}
        </Badge>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      width: 120,
      render: (campaign) => (
        <Badge variant="outline">{TYPE_LABELS[campaign.type] || campaign.type}</Badge>
      ),
    },
    {
      key: 'recipients',
      label: 'Destinatários',
      width: 130,
      render: (campaign) => <span className="text-sm">{campaign.totalRecipients}</span>,
    },
    {
      key: 'dispatch',
      label: 'Disparo',
      render: (campaign) => (
        <span className="text-muted-foreground text-sm">
          {campaign.scheduledAt
            ? `Agendada em ${formatDate(campaign.scheduledAt)}`
            : formatDate(campaign.createdAt)}
        </span>
      ),
    },
  ]

  return (
    <>
      <HeaderPageShell
        title="Campanhas"
        selector={<HeaderTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />}
        searchValue={activeTab === 'campaigns' ? searchInput : undefined}
        onSearchChange={activeTab === 'campaigns' ? setSearchInput : undefined}
        searchPlaceholder="Buscar campanhas..."
        onRefresh={activeTab === 'overview' ? () => void refetch() : undefined}
        isRefreshing={isRefetching || isLoading}
        primaryAction={
          activeTab === 'campaigns' ? (
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Nova campanha
            </Button>
          ) : null
        }
      >
        {activeTab === 'overview' ? (
          <CampaignsOverview counters={data?.counters} isLoading={isLoading} />
        ) : (
          <CrudDataView
            data={filteredItems}
            view="list"
            emptyView={
              <CrudEmptyState
                title="Nenhuma campanha encontrada."
                description="Crie uma campanha de WhatsApp usando o wizard de cadastro."
              />
            }
            tableView={
              <CrudListView
                data={filteredItems}
                columns={columns}
                onRowClick={(campaign) => openCampaignDetail(campaign.id)}
              />
            }
            cardView={null}
          />
        )}
      </HeaderPageShell>

      <CampaignFormDrawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={(campaignId) => {
          refetch()
          openCampaignDetail(campaignId)
        }}
      />
    </>
  )
}
