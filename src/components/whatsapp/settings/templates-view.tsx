'use client'

import React, { useState, useEffect } from 'react'
import { MessageSquare, Edit, Trash2, MoreVertical, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
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
    CrudPageShell,
    CrudEditDrawer,
    DeleteConfirmDialog,
    type ViewType,
    type ColumnDef,
    type CardConfig,
    type RowActions,
} from '@/components/dashboard/crud'
import { CrudDataView } from './crud-data-view-wrapper'
import type { WhatsAppPhoneNumber, WhatsAppTemplate } from '@/types/whatsapp'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TemplateEditorForm } from '@/components/whatsapp/template-editor/template-editor-form'

interface TemplatesViewProps {
    phone: WhatsAppPhoneNumber
}

export function TemplatesView({ phone }: TemplatesViewProps) {
    // View & Search state
    const [view, setView] = useState<ViewType>('cards')
    const [searchInput, setSearchInput] = useState('')

    // Pagination state
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(20)

    // Editor drawer state
    const [editorOpen, setEditorOpen] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null)

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [templateToDelete, setTemplateToDelete] = useState<WhatsAppTemplate | null>(null)

    // Fetch templates
    const { data: templates, isLoading } = useQuery<WhatsAppTemplate[]>({
        queryKey: ['whatsapp', 'templates'],
        queryFn: () => whatsappApi.getTemplates(),
    })

    // Filter templates based on search
    const filteredTemplates = templates?.filter(template => {
        if (!searchInput) return true
        const search = searchInput.toLowerCase()
        return (
            template.name.toLowerCase().includes(search) ||
            template.category.toLowerCase().includes(search) ||
            template.components?.find((c: any) =>
                c.type === 'BODY' && c.text?.toLowerCase().includes(search)
            )
        )
    }) || []

    // Paginated data
    const paginatedTemplates = filteredTemplates.slice((page - 1) * limit, page * limit)
    const totalItems = filteredTemplates.length
    const totalPages = Math.ceil(totalItems / limit)

    // Reset page when search changes
    useEffect(() => {
        setPage(1)
    }, [searchInput])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:text-green-400'
            case 'REJECTED': return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:text-red-400'
            case 'PENDING': return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400'
            case 'PAUSED': return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:text-orange-400'
            case 'DISABLED': return 'text-slate-400 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:text-slate-500'
            default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:text-slate-400'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle2 className="h-3 w-3" />
            case 'REJECTED': return <XCircle className="h-3 w-3" />
            case 'PENDING': return <AlertCircle className="h-3 w-3" />
            default: return <AlertCircle className="h-3 w-3" />
        }
    }

    const getCategoryLabel = (category: string) => {
        const map: Record<string, string> = {
            'MARKETING': 'Marketing',
            'UTILITY': 'Utilidade',
            'AUTHENTICATION': 'Autenticação'
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
            render: (item) => (
                <div className="font-medium text-sm">{item.name}</div>
            ),
            width: '25%'
        },
        {
            key: 'category',
            label: 'Categoria',
            render: (item) => (
                <Badge variant="secondary" className="text-xs">
                    {getCategoryLabel(item.category)}
                </Badge>
            ),
            width: '15%'
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
                                className={`gap-1.5 font-semibold cursor-default ${getStatusColor(item.status)}`}
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
            width: '15%'
        },
        {
            key: 'body',
            label: 'Prévia',
            render: (item) => (
                <div className="text-xs text-muted-foreground italic line-clamp-2">
                    {item.components?.find((c: any) => c.type === 'BODY')?.text || "—"}
                </div>
            ),
            width: '35%'
        },
        {
            key: 'language',
            label: 'Idioma',
            render: (item) => (
                <span className="text-xs font-mono text-muted-foreground uppercase">
                    {item.language}
                </span>
            ),
            width: '10%'
        },
    ]

    // Card configuration
    const cardConfig: CardConfig<WhatsAppTemplate> = {
        title: (item) => item.name,
        subtitle: (item) => (
            <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                    {getCategoryLabel(item.category)}
                </Badge>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge
                                variant="outline"
                                className={`gap-1.5 font-semibold cursor-default text-[10px] ${getStatusColor(item.status)}`}
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
            <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">
                    {item.language}
                </span>
                <div className="text-xs text-primary font-medium">
                    Clique para editar →
                </div>
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
                    <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        onClick={() => handleEdit(item)}
                    >
                        <Edit className="h-4 w-4" /> Editar Template
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                        onClick={() => handleDeleteClick(item)}
                    >
                        <Trash2 className="h-4 w-4" /> Excluir Template
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    return (
        <TooltipProvider>
            <CrudPageShell
                title="Templates WhatsApp"
                subtitle="Gerencie suas mensagens padronizadas do WhatsApp"
                icon={MessageSquare}
                view={view}
                setView={setView}
                enabledViews={['list', 'cards']}
                searchInput={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Buscar por nome, categoria ou conteúdo..."
                page={page}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={setLimit}
                totalItems={totalItems}
                totalPages={totalPages}
                hasMore={page * limit < totalItems}
                onAdd={handleCreate}
                addLabel="Novo Template"
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
                        action: !searchInput ? {
                            label: 'Criar primeiro template',
                            onClick: handleCreate
                        } : undefined
                    }}
                />
            </CrudPageShell>

            {/* Overlay components (Drawers, Dialogs) */}
            <div>
                <CrudEditDrawer
                    open={editorOpen}
                    onOpenChange={setEditorOpen}
                    title={selectedTemplate ? 'Editar Template' : 'Novo Template'}
                    subtitle={selectedTemplate
                        ? 'Atualize seu template de mensagem'
                        : 'Crie uma message reutilizável para seus clientes'}
                    icon={MessageSquare}
                    maxWidth="max-w-[95vw]"
                    showFooter={false}
                >
                    <TemplateEditorForm
                        template={selectedTemplate}
                        onClose={() => setEditorOpen(false)}
                    />
                </CrudEditDrawer>

                <DeleteConfirmDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    trigger={null}
                    title="Excluir Template?"
                    description={`Tem certeza que deseja excluir o template "${templateToDelete?.name}"? Esta ação não pode ser desfeita e ele será removido permanentemente da Meta.`}
                    onConfirm={async () => {
                        if (templateToDelete) {
                            await whatsappApi.deleteTemplate(templateToDelete.name)
                            setDeleteDialogOpen(false)
                            setTemplateToDelete(null)
                        }
                    }}
                />
            </div>
        </TooltipProvider>
    )
}
