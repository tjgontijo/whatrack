'use client'

import { useState } from 'react'
import {
  MessageSquare,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { whatsappApi } from '@/lib/whatsapp/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CrudEditDrawer,
  DeleteConfirmDialog,
  ViewSwitcher,
  type ViewType,
  type ColumnDef,
  type CardConfig,
  type RowActions,
} from '@/components/dashboard/crud'
import { HeaderPageShell } from '@/components/dashboard/layout'
import { CrudDataView } from './crud-data-view-wrapper'
import type { WhatsAppPhoneNumber, WhatsAppTemplate } from '@/types/whatsapp/whatsapp'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TemplateEditorForm } from '@/components/dashboard/whatsapp/template-editor/template-editor-form'

interface TemplatesViewProps {
  phone: WhatsAppPhoneNumber
}

import { useOrganization } from '@/hooks/organization/use-organization'

export function TemplatesView({ phone: _phone }: TemplatesViewProps) {
  const { data: org } = useOrganization()
  const orgId = org?.id
  // View & Search state
  const [view, setView] = useState<ViewType>('cards')
  const [searchInput, setSearchInput] = useState('')

  // Pagination state
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  // Editor drawer state
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<WhatsAppTemplate | null>(null)

  // Fetch templates
  const { data: templates, isLoading } = useQuery<WhatsAppTemplate[]>({
    queryKey: ['whatsapp', 'templates', orgId],
    queryFn: () => whatsappApi.getTemplates(orgId!),
    enabled: !!orgId,
  })

  // Filter templates based on search
  const filteredTemplates =
    templates?.filter((template) => {
      if (!searchInput) return true
      const search = searchInput.toLowerCase()
      return (
        template.name.toLowerCase().includes(search) ||
        template.category.toLowerCase().includes(search) ||
        template.components?.find(
          (c: any) => c.type === 'BODY' && c.text?.toLowerCase().includes(search)
        )
      )
    }) || []

  // Paginated data
  const paginatedTemplates = filteredTemplates.slice((page - 1) * limit, page * limit)
  const totalItems = filteredTemplates.length

  // Removed useEffect for resetting page, now handled in onSearchChange

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:text-green-400'
      case 'REJECTED':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:text-red-400'
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400'
      case 'PAUSED':
        return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:text-orange-400'
      case 'DISABLED':
        return 'text-slate-400 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:text-slate-500'
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:text-slate-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-3 w-3" />
      case 'REJECTED':
        return <XCircle className="h-3 w-3" />
      case 'PENDING':
        return <AlertCircle className="h-3 w-3" />
      default:
        return <AlertCircle className="h-3 w-3" />
    }
  }

  const getCategoryLabel = (category: string) => {
    const map: Record<string, string> = {
      MARKETING: 'Marketing',
      UTILITY: 'Utilidade',
      AUTHENTICATION: 'Autenticação',
    }
    return map[category] || category
  }

  const handleEdit = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template)
    setEditorOpen(true)
  }

  const handleCreate = () => {
    setSelectedTemplate(null)
    setEditorOpen(true)
  }

  const handleDeleteClick = (template: WhatsAppTemplate) => {
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  // Column definitions for list view
  const columns: ColumnDef<WhatsAppTemplate>[] = [
    {
      key: 'name',
      label: 'Nome',
      render: (item) => <div className="text-sm font-medium">{item.name}</div>,
      width: '25%',
    },
    {
      key: 'category',
      label: 'Categoria',
      render: (item) => (
        <Badge variant="secondary" className="text-xs">
          {getCategoryLabel(item.category)}
        </Badge>
      ),
      width: '15%',
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={`cursor-default gap-1.5 font-semibold ${getStatusColor(item.status)}`}
              >
                {getStatusIcon(item.status)}
                <span className="text-xs">
                  {item.status === 'APPROVED' ? 'Aprovado' : item.status}
                </span>
              </Badge>
            </TooltipTrigger>
            {item.status === 'REJECTED' && item.rejected_reason && (
              <TooltipContent>
                <p className="max-w-xs text-xs">{item.rejected_reason}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      ),
      width: '15%',
    },
    {
      key: 'body',
      label: 'Prévia',
      render: (item) => (
        <div className="text-muted-foreground line-clamp-2 text-xs italic">
          {item.components?.find((c: any) => c.type === 'BODY')?.text || '—'}
        </div>
      ),
      width: '35%',
    },
    {
      key: 'language',
      label: 'Idioma',
      render: (item) => (
        <span className="text-muted-foreground font-mono text-xs uppercase">{item.language}</span>
      ),
      width: '10%',
    },
  ]

  // Card configuration
  const cardConfig: CardConfig<WhatsAppTemplate> = {
    title: (item) => item.name,
    subtitle: (item) => (
      <div className="mt-1 flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-[10px] font-bold uppercase">
          {getCategoryLabel(item.category)}
        </Badge>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={`cursor-default gap-1.5 text-[10px] font-semibold ${getStatusColor(item.status)}`}
              >
                {getStatusIcon(item.status)}
                {item.status === 'APPROVED' ? 'Aprovado' : item.status}
              </Badge>
            </TooltipTrigger>
            {item.status === 'REJECTED' && item.rejected_reason && (
              <TooltipContent>
                <p className="max-w-xs text-xs">{item.rejected_reason}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    ),
    footer: (item) => (
      <div className="flex w-full items-center justify-between">
        <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase">
          {item.language}
        </span>
        <div className="text-primary text-xs font-medium">Clique para editar →</div>
      </div>
    ),
    onClick: handleEdit,
  }

  // Row actions
  const rowActions: RowActions<WhatsAppTemplate> = {
    customActions: (item) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => handleEdit(item)}>
            <Edit className="h-4 w-4" /> Editar Template
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer gap-2"
            onClick={() => handleDeleteClick(item)}
          >
            <Trash2 className="h-4 w-4" /> Excluir Template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  }

  return (
    <TooltipProvider>
      <HeaderPageShell
        title="Templates WhatsApp"
        selector={<ViewSwitcher view={view} setView={setView} enabledViews={['list', 'cards']} />}
        searchValue={searchInput}
        onSearchChange={(val) => {
          setSearchInput(val)
          setPage(1)
        }}
        searchPlaceholder="Buscar por nome, categoria ou conteúdo..."
        primaryAction={
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleCreate}
          >
            Novo
          </Button>
        }
        isLoading={isLoading}
      >
        <CrudDataView
          view={view}
          data={paginatedTemplates}
          columns={columns}
          cardConfig={cardConfig}
          rowActions={rowActions}
          getRowKey={(item) => item.name}
          emptyState={{
            title: 'Nenhum template encontrado',
            description: searchInput
              ? 'Nenhum template corresponde à sua busca. Tente outro termo.'
              : 'Crie seu primeiro template para começar a enviar mensagens padronizadas.',
            action: !searchInput
              ? {
                label: 'Criar primeiro template',
                onClick: handleCreate,
              }
              : undefined,
          }}
        />
      </HeaderPageShell>

      {/* Overlay components (Drawers, Dialogs) */}
      <div>
        <CrudEditDrawer
          open={editorOpen}
          onOpenChange={setEditorOpen}
          title={selectedTemplate ? 'Editar Template' : 'Novo Template'}
          subtitle={
            selectedTemplate
              ? 'Atualize seu template de mensagem'
              : 'Crie uma message reutilizável para seus clientes'
          }
          icon={MessageSquare}
          maxWidth="max-w-[95vw]"
          showFooter={false}
        >
          <TemplateEditorForm template={selectedTemplate} onClose={() => setEditorOpen(false)} />
        </CrudEditDrawer>

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          trigger={null}
          title="Excluir Template?"
          description={`Tem certeza que deseja excluir o template "${templateToDelete?.name}"? Esta ação não pode ser desfeita e ele será removido permanentemente da Meta.`}
          onConfirm={async () => {
            if (templateToDelete && orgId) {
              await whatsappApi.deleteTemplate(templateToDelete.name, orgId)
              setDeleteDialogOpen(false)
              setTemplateToDelete(null)
            }
          }}
        />
      </div>
    </TooltipProvider>
  )
}
