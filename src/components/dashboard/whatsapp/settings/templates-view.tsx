'use client'

import { useState } from 'react'
import {
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  MinusCircle,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DeleteConfirmDialog } from '@/components/dashboard/crud'
import { whatsappApi } from '@/lib/whatsapp/client'
import type { WhatsAppTemplate } from '@/types/whatsapp/whatsapp'

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

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    // Search filter
    if (searchValue) {
      const search = searchValue.toLowerCase()
      const nameMatch = template.name.toLowerCase().includes(search)
      const bodyMatch = template.components
        ?.find((c: any) => c.type === 'BODY')
        ?.text?.toLowerCase()
        .includes(search)
      if (!nameMatch && !bodyMatch) return false
    }

    // Category filter
    if (categoryFilter && categoryFilter !== 'Todos') {
      const categoryMap: Record<string, string> = {
        Marketing: 'MARKETING',
        Utilidade: 'UTILITY',
        Autenticação: 'AUTHENTICATION',
      }
      if (template.category !== categoryMap[categoryFilter]) return false
    }

    // Status filter
    if (statusFilter && statusFilter !== 'Todos') {
      const statusMap: Record<string, string> = {
        Aprovados: 'APPROVED',
        'Em análise': 'PENDING',
        Reprovados: 'REJECTED',
      }
      if (template.status !== statusMap[statusFilter]) return false
    }

    return true
  })

  const getCategoryLabel = (category: string) => {
    const map: Record<string, string> = {
      MARKETING: 'Marketing',
      UTILITY: 'Utilidade',
      AUTHENTICATION: 'Autenticação',
    }
    return map[category] || category
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-orange-600" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-slate-400" />
      case 'DISABLED':
        return <MinusCircle className="h-4 w-4 text-slate-400" />
      default:
        return <Clock className="h-4 w-4 text-slate-400" />
    }
  }

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      APPROVED: 'Aprovado',
      REJECTED: 'Reprovado',
      PENDING: 'Em análise',
      DISABLED: 'Desativado',
    }
    return map[status] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-600'
      case 'REJECTED':
        return 'text-orange-600'
      case 'PENDING':
        return 'text-slate-400'
      case 'DISABLED':
        return 'text-slate-400'
      default:
        return 'text-slate-400'
    }
  }

  const handleDeleteClick = (template: WhatsAppTemplate) => {
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (templateToDelete) {
      await whatsappApi.deleteTemplate(templateToDelete.name, organizationId)
      setDeleteDialogOpen(false)
      setTemplateToDelete(null)
    }
  }

  if (isLoading) {
    return <div className="text-muted-foreground text-center py-8">Carregando templates...</div>
  }

  if (filteredTemplates.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-12">
        <p className="mb-2">Nenhum template encontrado</p>
        {searchValue && <p className="text-xs">Tente ajustar os filtros de busca</p>}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/50">
              <TableHead className="h-12">Nome</TableHead>
              <TableHead className="h-12">Categoria</TableHead>
              <TableHead className="h-12">Idioma</TableHead>
              <TableHead className="h-12">Status</TableHead>
              <TableHead className="h-12 w-12 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.map((template) => (
              <TableRow key={template.name} className="hover:bg-muted/50 cursor-pointer">
                <TableCell className="py-3">
                  <div className="text-sm font-medium">{template.name}</div>
                </TableCell>
                <TableCell className="py-3">
                  <div className="text-xs text-muted-foreground">
                    {getCategoryLabel(template.category)}
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <div className="text-xs font-mono uppercase text-muted-foreground">
                    {template.language}
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(template.status)}
                        <span className={`text-xs ${getStatusColor(template.status)}`}>
                          {getStatusLabel(template.status)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    {template.status === 'REJECTED' && template.rejected_reason && (
                      <TooltipContent className="max-w-xs text-xs">
                        {template.rejected_reason}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TableCell>
                <TableCell className="py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer gap-2"
                        onClick={() => onEditClick?.(template)}
                      >
                        <Edit className="h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer gap-2"
                        onClick={() => onSendTestClick?.(template)}
                      >
                        <Send className="h-4 w-4" /> Enviar Teste
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive cursor-pointer gap-2"
                        onClick={() => handleDeleteClick(template)}
                      >
                        <Trash2 className="h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        trigger={null}
        title="Excluir Template?"
        description={`Tem certeza que deseja excluir o template "${templateToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
      />
    </TooltipProvider>
  )
}
