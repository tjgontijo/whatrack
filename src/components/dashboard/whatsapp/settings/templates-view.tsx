'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  XCircle,
  Clock,
  MinusCircle,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CrudListView, DeleteConfirmDialog } from '@/components/dashboard/crud'
import { CrudEmptyState } from '@/components/dashboard/crud/crud-data-view'
import type { ColumnDef, RowActions } from '@/components/dashboard/crud/types'
import { whatsappApi } from '@/lib/whatsapp/client'
import { ORGANIZATION_HEADER } from '@/lib/constants/http-headers'
import type { WhatsAppTemplate } from '@/types/whatsapp/whatsapp'
import type { TemplateStats } from '@/services/whatsapp/whatsapp-template-analytics.service'

interface TemplatesViewProps {
  templates: WhatsAppTemplate[]
  isLoading?: boolean
  searchValue?: string
  categoryFilter?: string
  statusFilter?: string
  organizationId: string
  onSendTestClick?: (template: WhatsAppTemplate) => void
  onEditClick?: (template: WhatsAppTemplate) => void
}

const CATEGORY_MAP: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
}

const CATEGORY_FILTER_MAP: Record<string, string> = {
  Marketing: 'MARKETING',
  Utilidade: 'UTILITY',
  Autenticação: 'AUTHENTICATION',
}

const STATUS_LABEL: Record<string, string> = {
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado',
  PENDING: 'Em análise',
  DISABLED: 'Desativado',
}

function StatusCell({ template }: { template: WhatsAppTemplate }) {
  const icon = {
    APPROVED: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    REJECTED: <XCircle className="h-4 w-4 text-orange-600" />,
    PENDING: <Clock className="h-4 w-4 text-slate-400" />,
    DISABLED: <MinusCircle className="h-4 w-4 text-slate-400" />,
  }[template.status] ?? <Clock className="h-4 w-4 text-slate-400" />

  const colorMap: Record<string, string> = {
    APPROVED: 'text-green-600',
    REJECTED: 'text-orange-600',
  }
  const color = colorMap[template.status] ?? 'text-slate-400'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          {icon}
          <span className={`text-xs ${color}`}>{STATUS_LABEL[template.status] ?? template.status}</span>
        </div>
      </TooltipTrigger>
      {template.status === 'REJECTED' && template.rejected_reason && (
        <TooltipContent className="max-w-xs text-xs">{template.rejected_reason}</TooltipContent>
      )}
    </Tooltip>
  )
}

function StatCell({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>
  const color = value >= 70 ? 'text-green-600' : value >= 40 ? 'text-yellow-600' : 'text-destructive'
  return (
    <span className={`text-xs font-semibold tabular-nums ${color}`}>
      {value}%
    </span>
  )
}

export function TemplatesView({
  templates,
  isLoading = false,
  searchValue = '',
  categoryFilter = '',
  statusFilter = '',
  organizationId,
  onSendTestClick,
  onEditClick,
}: TemplatesViewProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<WhatsAppTemplate | null>(null)

  const { data: analyticsData } = useQuery({
    queryKey: ['whatsapp', 'templates', 'analytics', organizationId],
    queryFn: async () => {
      const res = await fetch('/api/v1/whatsapp/templates/analytics', {
        headers: { [ORGANIZATION_HEADER]: organizationId },
      })
      if (!res.ok) return { stats: [] as TemplateStats[] }
      return res.json() as Promise<{ stats: TemplateStats[] }>
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  })

  const statsMap = new Map<string, TemplateStats>(
    (analyticsData?.stats ?? []).map((s) => [s.templateName, s])
  )

  const filteredTemplates = templates.filter((t) => {
    if (searchValue) {
      const s = searchValue.toLowerCase()
      const bodyText = (t.components?.find((c: any) => c.type === 'BODY') as any)?.text ?? ''
      if (!t.name.toLowerCase().includes(s) && !bodyText.toLowerCase().includes(s)) return false
    }
    if (categoryFilter && categoryFilter !== 'Todos') {
      if (t.category !== CATEGORY_FILTER_MAP[categoryFilter]) return false
    }
    if (statusFilter && statusFilter !== 'Todos') {
      const statusMap: Record<string, string> = { Aprovados: 'APPROVED', 'Em análise': 'PENDING', Reprovados: 'REJECTED' }
      if (t.status !== statusMap[statusFilter]) return false
    }
    return true
  })

  const columns: ColumnDef<WhatsAppTemplate>[] = [
    {
      key: 'name',
      label: 'Nome',
      render: (t) => <span className="text-[13px] font-medium">{t.name}</span>,
    },
    {
      key: 'category',
      label: 'Categoria',
      width: 130,
      render: (t) => <span className="text-sm text-muted-foreground">{CATEGORY_MAP[t.category] ?? t.category}</span>,
    },
    {
      key: 'language',
      label: 'Idioma',
      width: 90,
      render: (t) => <span className="font-mono text-xs uppercase text-muted-foreground">{t.language}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      width: 130,
      render: (t) => <StatusCell template={t} />,
    },
    {
      key: 'sent',
      label: 'Enviados',
      width: 80,
      render: (t) => {
        const s = statsMap.get(t.name)
        return s
          ? <span className="text-xs tabular-nums font-medium">{s.sent.toLocaleString('pt-BR')}</span>
          : <span className="text-xs text-muted-foreground">—</span>
      },
    },
    {
      key: 'delivery',
      label: 'Entregues',
      width: 90,
      render: (t) => {
        const s = statsMap.get(t.name)
        return s ? <StatCell value={s.deliveryRate} label="entregues" /> : <span className="text-xs text-muted-foreground">—</span>
      },
    },
    {
      key: 'read',
      label: 'Lidos',
      width: 80,
      render: (t) => {
        const s = statsMap.get(t.name)
        return s ? <StatCell value={s.readRate} label="lidos" /> : <span className="text-xs text-muted-foreground">—</span>
      },
    },
    {
      key: 'actioned',
      label: 'Ação',
      width: 80,
      render: (t) => {
        const s = statsMap.get(t.name)
        return s ? <StatCell value={s.actionRate} label="ação" /> : <span className="text-xs text-muted-foreground">—</span>
      },
    },
  ]

  const rowActions: RowActions<WhatsAppTemplate> = {
    customActions: (t) => (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEditClick?.(t)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => { setTemplateToDelete(t); setDeleteDialogOpen(true) }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </>
    ),
  }

  if (isLoading) {
    return <div className="text-muted-foreground text-center py-8 text-sm">Carregando templates...</div>
  }

  return (
    <TooltipProvider>
      {filteredTemplates.length === 0 ? (
        <CrudEmptyState />
      ) : (
        <CrudListView
          data={filteredTemplates}
          columns={columns}
          rowActions={rowActions}
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        trigger={null}
        title="Excluir Template?"
        description={`Tem certeza que deseja excluir o template "${templateToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={async () => {
          if (templateToDelete) {
            await whatsappApi.deleteTemplate(templateToDelete.name, organizationId)
            setDeleteDialogOpen(false)
            setTemplateToDelete(null)
          }
        }}
      />
    </TooltipProvider>
  )
}
