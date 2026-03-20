'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Filter, Megaphone, Plus, RefreshCw } from 'lucide-react'
import { useDeferredValue } from 'react'
import { toast } from 'sonner'

import {
  CrudCardView,
  CrudDataView,
  CrudListView,
  CrudPageShell,
  type CardConfig,
  type ColumnDef,
  type ViewType,
} from '@/components/dashboard/crud'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth/auth-client'
import { useRequiredProjectPath } from '@/hooks/project/project-route-context'
import { apiFetch } from '@/lib/api-client'
import { useProject } from '@/hooks/project/use-project'
import { CampaignFormDrawer } from './campaign-form-drawer'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_APPROVAL: 'Pendente',
  APPROVED: 'Aprovada',
  SCHEDULED: 'Agendada',
  PROCESSING: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
}

const STATUS_VARIANTS: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  PENDING_APPROVAL: 'outline',
  APPROVED: 'outline',
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
  const { data: activeOrg } = authClient.useActiveOrganization()
  const { data: activeProject } = useProject()
  const organizationId = activeOrg?.id
  const activeProjectId = activeProject?.id

  const [view, setView] = React.useState<ViewType>('list')
  const [searchInput, setSearchInput] = React.useState('')
  const [isCreateOpen, setIsCreateOpen] = React.useState(initialCreateOpen)
  const deferredSearch = useDeferredValue(searchInput)

  const { data, isLoading, refetch } = useQuery<CampaignsResponse>({
    queryKey: ['whatsapp-campaigns', organizationId],
    queryFn: async () => {
      const url = new URL('/api/v1/whatsapp/campaigns', window.location.origin)
      const response = await apiFetch(url.toString(), { orgId: organizationId })
      return response as CampaignsResponse
    },
    enabled: !!organizationId,
  })

  const filteredItems = React.useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    if (!query) return data?.items || []

    return (data?.items || []).filter((campaign) => {
      return (
        campaign.name.toLowerCase().includes(query) ||
        (campaign.templateName || '').toLowerCase().includes(query) ||
        (campaign.projectName || '').toLowerCase().includes(query)
      )
    })
  }, [data?.items, deferredSearch])

  const columns: ColumnDef<CampaignItem>[] = [
    {
      key: 'name',
      label: 'Campanha',
      render: (campaign) => (
        <div className="space-y-1">
          <Link href={`${campaignsPath}/${campaign.id}`} className="font-medium hover:underline">
            {campaign.name}
          </Link>
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
      render: (campaign) => <Badge variant="outline">{TYPE_LABELS[campaign.type] || campaign.type}</Badge>,
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
          {campaign.scheduledAt ? `Agendada em ${formatDate(campaign.scheduledAt)}` : formatDate(campaign.createdAt)}
        </span>
      ),
    },
  ]

  const cardConfig: CardConfig<CampaignItem> = {
    title: (campaign) => campaign.name,
    subtitle: (campaign) => (
      <div className="flex flex-wrap gap-2">
        <Badge variant={STATUS_VARIANTS[campaign.status] || 'secondary'}>
          {STATUS_LABELS[campaign.status] || campaign.status}
        </Badge>
        <Badge variant="outline">{TYPE_LABELS[campaign.type] || campaign.type}</Badge>
      </div>
    ),
    badge: (campaign) => (
      <span className="text-muted-foreground text-xs">
        {campaign.totalRecipients} destinatários
      </span>
    ),
    footer: (campaign) => (
      <span className="text-muted-foreground text-xs">
        {campaign.scheduledAt ? `Agendada: ${formatDate(campaign.scheduledAt)}` : formatDate(campaign.createdAt)}
      </span>
    ),
    onClick: (campaign) => router.push(`${campaignsPath}/${campaign.id}`),
  }

  const counters = data?.counters

  const openCreateDrawer = () => {
    if (!activeProjectId) {
      toast.error('Selecione um projeto ativo na sidebar para criar campanhas.')
      return
    }

    setIsCreateOpen(true)
  }

  if (!organizationId) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <p className="text-muted-foreground">Carregando organização...</p>
      </div>
    )
  }

  return (
    <>
      <CrudPageShell
        title="Campanhas"
        icon={Megaphone}
        showTitle={true}
        onAdd={openCreateDrawer}
        view={view}
        setView={setView}
        enabledViews={['list', 'cards']}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Buscar campanhas..."
        totalItems={filteredItems.length}
        isLoading={isLoading}
        filters={
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Filter className="h-3.5 w-3.5" />
            Todas as campanhas
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openCreateDrawer}>
              <Plus className="mr-2 h-4 w-4" />
              Nova campanha
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            {counters ? (
              <div className="text-muted-foreground hidden text-xs uppercase tracking-widest lg:block">
                <span className="text-foreground font-bold">{counters.completed}</span> concluídas
              </div>
            ) : null}
          </div>
        }
      >
        {counters && (
          <div className="grid grid-cols-2 gap-4 px-6 pt-4 lg:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground text-xs">Total</p>
              <p className="text-2xl font-bold">{counters.total}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground text-xs">Em andamento</p>
              <p className="text-2xl font-bold">{counters.processing + counters.scheduled}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground text-xs">Pendentes</p>
              <p className="text-2xl font-bold">{counters.pendingApproval + counters.draft}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground text-xs">Concluídas</p>
              <p className="text-2xl font-bold">{counters.completed}</p>
            </div>
          </div>
        )}

        <CrudDataView
          data={filteredItems}
          view={view}
          emptyView={
            <div className="mx-6 my-4 flex min-h-[calc(100vh-280px)] items-center justify-center rounded-3xl border border-dashed bg-muted/20 px-10 py-20 text-center">
              <div className="space-y-4">
                <div className="bg-muted mx-auto flex size-12 items-center justify-center rounded-xl">
                  <Megaphone className="text-muted-foreground size-6" />
                </div>
                <div>
                  <p className="text-muted-foreground font-bold">Nenhuma campanha encontrada.</p>
                  <p className="text-muted-foreground/60 mt-1 text-xs">
                    Crie uma campanha de WhatsApp usando o wizard de cadastro.
                  </p>
                </div>
                <Button onClick={openCreateDrawer}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar campanha
                </Button>
              </div>
            </div>
          }
          tableView={<CrudListView data={filteredItems} columns={columns} />}
          cardView={<CrudCardView data={filteredItems} config={cardConfig} />}
        />
      </CrudPageShell>

      <CampaignFormDrawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => refetch()}
      />
    </>
  )
}
