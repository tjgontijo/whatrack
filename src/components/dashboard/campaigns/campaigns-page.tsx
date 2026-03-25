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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRequiredProjectPath, useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { apiFetch } from '@/lib/api-client'

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
  isAbTest: boolean
  abTestConfig: any | null
  stats: {
    sent: number
    delivered: number
    read: number
  }
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
  const campaignsPath = useRequiredProjectPath('/campaigns')
  const { organizationId, projectId } = useRequiredProjectRouteContext()

  const [searchInput, setSearchInput] = React.useState('')
  const deferredSearch = useDeferredValue(searchInput)

  const tabs = [
    { key: 'campaigns', label: 'Campanhas' },
    { key: 'blocklist', label: 'Blocklist' },
  ]

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
          <div className="flex items-center gap-2">
            <button
              className="font-medium hover:underline text-left"
              onClick={() => openCampaignDetail(campaign.id)}
            >
              {campaign.name}
            </button>
            {campaign.isAbTest && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/30">
                A/B
              </Badge>
            )}
          </div>
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
      key: 'metrics',
      label: 'Engajamento',
      width: 200,
      render: (campaign) => (
        <div className="flex gap-4 text-xs">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Enviados</span>
            <span className="font-semibold">{campaign.stats.sent}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Entregues</span>
            <span className="font-semibold">{campaign.stats.delivered}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Lidos</span>
            <span className="font-semibold">{campaign.stats.read}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Criada em',
      width: 160,
      render: (campaign) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(campaign.createdAt)}
        </span>
      ),
    },
  ]

  const handleTabChange = (tabKey: string) => {
    if (tabKey === 'blocklist') {
      router.push(`${campaignsPath}/opt-outs`)
    }
  }

  return (
    <>
      <HeaderPageShell
        title="Campanhas"
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Buscar campanhas..."
        onRefresh={() => void refetch()}
        isRefreshing={isRefetching || isLoading}
        primaryAction={
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => router.push(`${campaignsPath}/new`)}
          >
            <Plus className="h-3.5 w-3.5" />
            Nova campanha
          </Button>
        }
      >
        <HeaderTabs
          tabs={tabs}
          activeTab="campaigns"
          onTabChange={handleTabChange}
        />
        <CrudDataView
          data={filteredItems}
          view="list"
          emptyView={
            <CrudEmptyState
              title="Nenhuma campanha encontrada."
              description="Crie uma campanha de WhatsApp clicando em 'Nova campanha'."
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
      </HeaderPageShell>

    </>
  )
}
