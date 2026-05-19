'use client'

import {
  closestCenter,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bookmark,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import React from 'react'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MetaRulesManager } from '@/features/deal-stages/components/meta-rules-manager'
import { apiFetch } from '@/lib/http/api-client'
import { cn } from '@/lib/utils/utils'
import type { DealStageFormData } from '@/features/deal-stages/types'

const CURRENT_KEY = '__current__'

interface TemplateItem {
  id: string
  name: string
  color: string
  order: number
  statusGroup: 'ACTIVE' | 'WON' | 'LOST'
  probability: number
  suggestedMetaEventName: string | null
}

interface Template {
  id: string
  name: string
  description: string | null
  category: string
  icon: string | null
  isPopular: boolean
  isPersonal: boolean
  items: TemplateItem[]
}

interface EditableStage extends Omit<TemplateItem, 'id'> {
  id?: string
  isNew?: boolean
  metaRules: DealStageFormData['metaRules']
}

interface EditStagesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  organizationId: string
  currentStages: any[]
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b',
] as const

const GROUP_CONFIG = [
  { key: 'ACTIVE' as const, title: 'ACTIVE', textColor: 'text-blue-600', borderColor: 'border-blue-200 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/20', limit: null },
  { key: 'WON' as const, title: 'DONE', textColor: 'text-green-600', borderColor: 'border-green-200 bg-green-50/40 dark:border-green-900/40 dark:bg-green-950/20', limit: 1 },
  { key: 'LOST' as const, title: 'CLOSED', textColor: 'text-red-500', borderColor: 'border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20', limit: null },
]

function mapToEditable(stages: any[]): EditableStage[] {
  return stages.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color ?? '#6366f1',
    order: s.order ?? 0,
    statusGroup: s.statusGroup ?? 'ACTIVE',
    probability: s.probability ?? 0,
    suggestedMetaEventName: s.suggestedMetaEventName ?? null,
    metaRules: s.metaRules ?? [],
  }))
}

export function EditStagesModal({
  open,
  onOpenChange,
  projectId,
  organizationId,
  currentStages,
}: EditStagesModalProps) {
  const queryClient = useQueryClient()
  const [selectedKey, setSelectedKey] = useState<string>(CURRENT_KEY)
  const [stages, setStages] = useState<EditableStage[]>([])
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null)
  const [pendingMigrations, setPendingMigrations] = useState<Record<string, string>>({})
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false)

  const registerMigration = (stageId: string, destinationId: string) => {
    setPendingMigrations((prev) => ({ ...prev, [stageId]: destinationId }))
  }

  // DnD state — lives at modal level so DndContext can be outside overflow-y-auto
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const activeStage = activeId ? stages.find((s) => s.id === activeId) ?? null : null

  useEffect(() => {
    if (open) {
      setSelectedKey(CURRENT_KEY)
      setStages(mapToEditable(currentStages))
      setExpandedStageId(null)
    }
  }, [open])

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveTemplateName, setSaveTemplateName] = useState('')

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<Template[]>({
    queryKey: ['deal-stage-templates', organizationId, projectId],
    queryFn: async () => {
      const params = new URLSearchParams({ projectId })
      const res = await fetch(`/api/v1/deal-stage-templates?${params}`)
      if (!res.ok) throw new Error('Falha ao buscar templates')
      return res.json()
    },
    enabled: open,
  })

  const savePersonalMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/v1/deal-stage-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          projectId,
          stages: stages.map((s) => ({
            name: s.name,
            color: s.color,
            statusGroup: s.statusGroup,
            probability: s.probability,
            suggestedMetaEventName: s.suggestedMetaEventName,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Falha ao salvar template')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Template salvo!')
      queryClient.invalidateQueries({ queryKey: ['deal-stage-templates'] })
      setSaveDialogOpen(false)
      setSaveTemplateName('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deletePersonalMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`/api/v1/deal-stage-templates/${templateId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao deletar template')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-stage-templates'] })
      if (selectedKey !== CURRENT_KEY) setSelectedKey(CURRENT_KEY)
      toast.success('Template deletado')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const isCurrentMode = selectedKey === CURRENT_KEY
  const selectedTemplate = templates.find((t) => t.id === selectedKey)

  const grouped = {
    ACTIVE: stages.filter((s) => s.statusGroup === 'ACTIVE'),
    WON: stages.filter((s) => s.statusGroup === 'WON'),
    LOST: stages.filter((s) => s.statusGroup === 'LOST'),
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const dragged = stages.find((s) => s.id === active.id)
    if (!dragged) return

    const overIsGroup = ['ACTIVE', 'WON', 'LOST'].includes(over.id as string)
    const overStage = overIsGroup ? null : stages.find((s) => s.id === over.id)
    const targetGroup: 'ACTIVE' | 'WON' | 'LOST' = overIsGroup
      ? (over.id as 'ACTIVE' | 'WON' | 'LOST')
      : (overStage?.statusGroup ?? dragged.statusGroup)

    if (targetGroup !== dragged.statusGroup) {
      if (targetGroup === 'WON' && grouped.WON.length >= 1) {
        toast.error('Só pode haver uma fase DONE.')
        return
      }
      setStages(stages.map((s) => (s.id === dragged.id ? { ...s, statusGroup: targetGroup } : s)))
    } else {
      const groupStages = stages.filter((s) => s.statusGroup === targetGroup)
      const oldIdx = groupStages.findIndex((s) => s.id === active.id)
      const newIdx = groupStages.findIndex((s) => s.id === over.id)
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return
      const reordered = arrayMove(groupStages, oldIdx, newIdx)
      setStages([...stages.filter((s) => s.statusGroup !== targetGroup), ...reordered])
    }
  }

  const handleSelectTemplate = (templateId: string) => {
    setSelectedKey(templateId)
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setStages(template.items.map((item) => ({ ...item, metaRules: [] })))
      setExpandedStageId(null)
    }
  }

  const handleSelectCurrent = () => {
    setSelectedKey(CURRENT_KEY)
    setStages(mapToEditable(currentStages))
    setExpandedStageId(null)
  }

  const handleAddStage = () => {
    const newStage: EditableStage = {
      name: 'Nova Fase',
      color: PRESET_COLORS[0],
      order: stages.length + 1,
      statusGroup: 'ACTIVE',
      probability: 50,
      suggestedMetaEventName: null,
      isNew: true,
      id: `new-${Date.now()}`,
      metaRules: [],
    }
    setStages([...stages, newStage])
  }

  const applyMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch('/api/v1/deal-stage-templates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, projectId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Falha ao aplicar template')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Funil configurado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['deal-stages'] })
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const saveCurrentMutation = useMutation({
    mutationFn: async () => {
      const originalIds = new Set(currentStages.map((s: any) => s.id))
      const keptIds = new Set(stages.filter((s) => s.id && !s.isNew).map((s) => s.id))
      const toDelete = currentStages.filter((s: any) => !keptIds.has(s.id))
      const toCreate = stages.filter((s) => s.isNew || !s.id)
      const toUpdate = stages.filter((s) => s.id && !s.isNew && originalIds.has(s.id))

      // Migrate deals before deleting stages that have a pending migration
    await Promise.all(
      toDelete
        .filter((s: any) => pendingMigrations[s.id])
        .map((s: any) =>
          apiFetch(`/api/v1/deal-stages/${s.id}/migrate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destinationStageId: pendingMigrations[s.id] }),
            orgId: organizationId,
            projectId,
          })
        )
    )

    await Promise.all([
        ...toDelete.map((s: any) =>
          apiFetch(`/api/v1/deal-stages/${s.id}`, { method: 'DELETE', orgId: organizationId, projectId })
        ),
        ...toUpdate.map((s) =>
          apiFetch(`/api/v1/deal-stages/${s.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: s.name, color: s.color, statusGroup: s.statusGroup,
              probability: s.probability, isClosed: s.statusGroup === 'WON' || s.statusGroup === 'LOST',
            }),
            orgId: organizationId, projectId,
          })
        ),
        ...toCreate.map((s) =>
          apiFetch('/api/v1/deal-stages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: s.name, color: s.color, statusGroup: s.statusGroup,
              probability: s.probability, isClosed: s.statusGroup === 'WON' || s.statusGroup === 'LOST',
            }),
            orgId: organizationId, projectId,
          })
        ),
      ])
    },
    onSuccess: () => {
      toast.success('Funil salvo com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['deal-stages'] })
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleApply = () => {
    if (isCurrentMode) { saveCurrentMutation.mutate(); return }
    if (!selectedKey) return
    setApplyConfirmOpen(true)
  }

  const handleConfirmApply = () => {
    setApplyConfirmOpen(false)
    applyMutation.mutate(selectedKey)
  }

  const isSaving = applyMutation.isPending || saveCurrentMutation.isPending
  const rightTitle = isCurrentMode ? 'Editar Fases Atuais' : (selectedTemplate?.name ?? 'Configurar Funil')
  const saveLabel = isCurrentMode ? 'Salvar Alterações' : 'Aplicar Funil'
  const isAnyDragging = activeId !== null

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[85vh] w-[90vw] max-w-6xl sm:max-w-6xl flex-col p-0 overflow-hidden rounded-2xl border-none shadow-2xl'>
        {/*
          DndContext FORA do overflow-y-auto.
          DragOverlay vai para document.body via createPortal,
          escapando do transform: translate(-50%,-50%) do DialogContent.
        */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className='flex flex-1 overflow-hidden'>
            {/* Sidebar */}
            <div className='w-64 border-r border-border bg-muted/20 p-5 overflow-y-auto shrink-0'>
              <div className='mb-4'>
                <h3 className='font-bold text-sm tracking-tight'>Configurar Funil</h3>
              </div>

              {/* Templates and Personal Templates */}
              {(() => {
                const personalTemplates = templates.filter((t) => t.isPersonal)
                const globalTemplates = templates.filter((t) => !t.isPersonal)
                return (
                  <>
                    {/* Global Templates */}
                    <div className='mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground'>
                      <ChevronRight className='h-3 w-3 stroke-[3px]' />
                      Templates
                    </div>
                    <div className='space-y-1 mb-5'>
                      {isLoadingTemplates ? (
                        <div className='flex items-center justify-center py-8'>
                          <Loader2 className='h-5 w-5 animate-spin text-primary/40' />
                        </div>
                      ) : (
                        globalTemplates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleSelectTemplate(t.id)}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 border-2',
                              selectedKey === t.id
                                ? 'bg-primary border-primary text-primary-foreground font-semibold shadow-md'
                                : 'hover:bg-muted border-transparent text-muted-foreground'
                            )}
                          >
                            {t.name}
                          </button>
                        ))
                      )}
                    </div>

                    {/* Personal Templates */}
                    <div className='mb-2 flex items-center justify-between'>
                      <div className='flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground'>
                        <ChevronRight className='h-3 w-3 stroke-[3px]' />
                        Meus Templates
                      </div>
                      <button
                        type='button'
                        onClick={() => { setSaveTemplateName(''); setSaveDialogOpen(true) }}
                        className='flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors'
                      >
                        <Plus className='h-3 w-3' />
                        Salvar atual
                      </button>
                    </div>
                    <div className='space-y-1'>
                      {personalTemplates.length === 0 ? (
                        <p className='text-[11px] text-muted-foreground/50 italic px-3 py-1.5'>
                          Nenhum template salvo ainda.
                        </p>
                      ) : (
                        personalTemplates.map((t) => (
                          <div key={t.id} className='flex items-center gap-1 group'>
                            <button
                              onClick={() => handleSelectTemplate(t.id)}
                              className={cn(
                                'flex-1 text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 border-2',
                                selectedKey === t.id
                                  ? 'bg-primary border-primary text-primary-foreground font-semibold shadow-md'
                                  : 'hover:bg-muted border-transparent text-muted-foreground'
                              )}
                            >
                              {t.name}
                            </button>
                            <button
                              type='button'
                              onClick={() => deletePersonalMutation.mutate(t.id)}
                              className='h-6 w-6 flex items-center justify-center text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0'
                            >
                              <Trash2 className='h-3.5 w-3.5' />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Main panel */}
            <div className='flex-1 flex flex-col min-w-0 bg-background overflow-hidden'>
              <DialogHeader className='px-6 py-4 border-b border-border shrink-0'>
                <DialogTitle className='text-lg font-bold tracking-tight'>{rightTitle}</DialogTitle>
                {!isCurrentMode && (
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    Prévia — clique em "Aplicar Funil" para substituir as fases atuais
                  </p>
                )}
              </DialogHeader>

              {/* Scroll container — DndContext is OUTSIDE this */}
              <div className='flex-1 overflow-y-auto p-6'>
                {stages.length === 0 && isCurrentMode ? (
                  <div className='flex flex-col items-center justify-center h-32 text-center'>
                    <p className='text-muted-foreground text-sm'>Nenhuma fase. Adicione uma ou selecione um template.</p>
                  </div>
                ) : (
                  <div className='space-y-5'>
                    {GROUP_CONFIG.map(({ key, title, textColor, borderColor, limit }) => {
                      const groupStages = grouped[key]
                      const isFull = limit !== null && groupStages.length >= limit
                      return (
                        <GroupSection
                          key={key}
                          groupKey={key}
                          title={title}
                          textColor={textColor}
                          borderColor={borderColor}
                          stages={groupStages}
                          allStages={stages}
                          onStagesChange={setStages}
                          onRegisterMigration={registerMigration}
                          expandedStageId={expandedStageId}
                          onExpandedChange={setExpandedStageId}
                          projectId={projectId}
                          isAnyDragging={isAnyDragging}
                          isFull={isFull}
                          limit={limit}
                        />
                      )
                    })}
                  </div>
                )}

                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleAddStage}
                  className='w-full gap-2 rounded-lg border-dashed mt-4'
                >
                  <Plus className='h-4 w-4' />
                  Adicionar Fase
                </Button>
              </div>

              <DialogFooter className='px-6 py-4 border-t border-border shrink-0 bg-muted/5'>
                <Button variant='ghost' className='rounded-full px-5' onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  className='rounded-full px-7 font-bold shadow-lg transition-all active:scale-95'
                  disabled={isSaving}
                  onClick={handleApply}
                >
                  {isSaving ? (
                    <><Loader2 className='mr-2 h-4 w-4 animate-spin' />Salvando...</>
                  ) : saveLabel}
                </Button>
              </DialogFooter>
            </div>
          </div>

          {/* DragOverlay via portal para document.body —
              escapa o transform: translate(-50%,-50%) do DialogContent,
              que criava um containing block errado para position:fixed */}
          {typeof document !== 'undefined' && createPortal(
            <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }} zIndex={9999}>
              {activeStage ? <StageRowContent stage={activeStage} /> : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      </DialogContent>
    </Dialog>

    <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Salvar como template</DialogTitle>
          <DialogDescription>
            Salva a configuração atual de fases para reutilizar depois.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder='Nome do template (ex: Meu Funil)'
          value={saveTemplateName}
          onChange={(e) => setSaveTemplateName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveTemplateName.trim() && savePersonalMutation.mutate(saveTemplateName)}
          autoFocus
        />
        <DialogFooter>
          <Button variant='ghost' onClick={() => setSaveDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => savePersonalMutation.mutate(saveTemplateName)}
            disabled={!saveTemplateName.trim() || savePersonalMutation.isPending}
          >
            {savePersonalMutation.isPending ? (
              <><Loader2 className='mr-2 h-4 w-4 animate-spin' />Salvando...</>
            ) : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ApplyTemplateConfirmDialog
      open={applyConfirmOpen}
      onOpenChange={setApplyConfirmOpen}
      templateName={selectedTemplate?.name ?? ''}
      firstStageName={selectedTemplate?.items?.[0]?.name ?? 'primeira fase'}
      totalDeals={currentStages.reduce((acc: number, s: any) => acc + (s.dealsCount ?? 0), 0)}
      isPending={applyMutation.isPending}
      onConfirm={handleConfirmApply}
    />
  </>
  )
}

function ApplyTemplateConfirmDialog({
  open,
  onOpenChange,
  templateName,
  firstStageName,
  totalDeals,
  isPending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateName: string
  firstStageName: string
  totalDeals: number
  isPending: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <AlertTriangle className='h-4 w-4 text-amber-500' />
            Aplicar "{templateName}"?
          </DialogTitle>
          <DialogDescription>
            {totalDeals > 0
              ? `As fases atuais serão substituídas. ${totalDeals} negociação${totalDeals !== 1 ? 'ões' : ''} será${totalDeals !== 1 ? 'ão' : ''} movida${totalDeals !== 1 ? 's' : ''} para "${firstStageName}".`
              : 'As fases atuais serão substituídas pelas do template selecionado.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <><Loader2 className='mr-2 h-4 w-4 animate-spin' />Aplicando...</>
            ) : 'Aplicar Funil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GroupSection({
  groupKey,
  title,
  textColor,
  borderColor,
  stages,
  allStages,
  onStagesChange,
  onRegisterMigration,
  expandedStageId,
  onExpandedChange,
  projectId,
  isAnyDragging,
  isFull,
  limit,
}: {
  groupKey: string
  title: string
  textColor: string
  borderColor: string
  stages: EditableStage[]
  allStages: EditableStage[]
  onStagesChange: (s: EditableStage[]) => void
  onRegisterMigration: (stageId: string, destinationId: string) => void
  expandedStageId: string | null
  onExpandedChange: (id: string | null) => void
  projectId: string
  isAnyDragging: boolean
  isFull: boolean
  limit: number | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: groupKey })

  return (
    <div>
      <div className={cn('flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] mb-1.5', textColor)}>
        <ChevronRight className='h-3 w-3 stroke-[3px]' />
        {title}
        {limit === 1 && <span className='text-[9px] font-medium opacity-50 normal-case tracking-normal ml-1'>(máx. 1)</span>}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[2.5rem] rounded-lg border-2 p-1 transition-all duration-150',
          isAnyDragging
            ? isFull
              ? 'border-dashed border-destructive/40 bg-destructive/5'
              : `border-dashed ${borderColor}`
            : 'border-transparent',
          isOver && !isFull && 'scale-[1.01]',
        )}
      >
        <SortableContext
          items={stages.map((s) => s.id ?? '')}
          strategy={verticalListSortingStrategy}
        >
          <div className='space-y-1.5'>
            {stages.map((stage) => (
              <StageRow
                key={stage.id}
                stage={stage}
                otherStages={allStages.filter((s) => s.id !== stage.id)}
                isExpanded={expandedStageId === stage.id}
                onToggleExpand={() =>
                  onExpandedChange(expandedStageId === stage.id ? null : (stage.id ?? ''))
                }
                onUpdate={(updates) =>
                  onStagesChange(allStages.map((s) => (s.id === stage.id ? { ...s, ...updates } : s)))
                }
                onRemove={(migrateToId) => {
                  onStagesChange(allStages.filter((s) => s.id !== stage.id))
                  if (stage.id && migrateToId) onRegisterMigration(stage.id, migrateToId)
                }}
                projectId={projectId}
              />
            ))}
            {stages.length === 0 && isAnyDragging && !isFull && (
              <div className='text-[11px] text-muted-foreground/50 italic px-2 py-1 text-center'>
                Solte aqui
              </div>
            )}
            {isAnyDragging && isFull && (
              <div className='text-[10px] text-destructive/60 text-center py-1 font-medium'>
                Limite atingido
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

/** Versão sortable do row — mostra placeholder quando está sendo arrastado */
function StageRow({
  stage,
  otherStages,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  projectId,
}: {
  stage: EditableStage
  otherStages: EditableStage[]
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (updates: Partial<EditableStage>) => void
  onRemove: (migrateToId?: string) => void
  projectId: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id ?? '',
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [migrateTo, setMigrateTo] = useState<string>('')

  const style = { transform: CSS.Transform.toString(transform), transition }

  const handleDeleteClick = () => {
    if (stage.isNew) {
      onRemove()
      return
    }
    setMigrateTo('')
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    onRemove(migrateTo || undefined)
    setDeleteDialogOpen(false)
  }

  const dealsCount = (stage as any).dealsCount ?? 0

  // Placeholder no lugar original — sem transform aplicado ao visual
  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style}>
        <div className='h-10 rounded-lg border-2 border-dashed border-primary/25 bg-primary/5' />
      </div>
    )
  }

  return (
    <>
      <div ref={setNodeRef} style={style}>
        <StageRowContent
          stage={stage}
          dragHandleProps={{ ...attributes, ...listeners }}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          onUpdate={onUpdate}
          onRemove={handleDeleteClick}
          projectId={projectId}
        />
        {isExpanded && (
          <div className='border border-t-0 rounded-b-lg border-border bg-card px-4 pb-4 pt-3 space-y-4'>
            <div className='flex items-center gap-2'>
              <span className='text-xs text-muted-foreground flex-1'>Probabilidade de conversão</span>
              <Input
                type='number'
                min={0}
                max={100}
                value={stage.probability}
                onChange={(e) =>
                  onUpdate({ probability: Math.min(100, Math.max(0, Number(e.target.value))) })
                }
                className='h-7 w-16 text-xs text-center px-1'
              />
              <span className='text-xs text-muted-foreground'>%</span>
            </div>
            <MetaRulesManager
              projectId={projectId}
              rules={stage.metaRules}
              onChange={(rules) => onUpdate({ metaRules: rules })}
            />
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <AlertTriangle className='h-4 w-4 text-destructive' />
              Deletar fase "{stage.name}"
            </DialogTitle>
            <DialogDescription>
              {dealsCount > 0
                ? `Esta fase possui ${dealsCount} negociação${dealsCount !== 1 ? 'ões' : ''} ativa${dealsCount !== 1 ? 's' : ''}.`
                : 'Esta fase não possui negociações.'}
            </DialogDescription>
          </DialogHeader>

          {dealsCount > 0 && (
            <div className='space-y-3'>
              <p className='text-sm text-muted-foreground'>
                Selecione uma fase de destino para mover as negociações antes de deletar.
                Sem destino, as negociações serão perdidas.
              </p>
              <Select value={migrateTo} onValueChange={setMigrateTo}>
                <SelectTrigger>
                  <SelectValue placeholder='Mover negociações para...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>Não migrar (negociações serão perdidas)</SelectItem>
                  {otherStages
                    .filter((s) => s.id && !s.isNew)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id!}>
                        <span className='flex items-center gap-2'>
                          <span
                            className='h-2 w-2 rounded-full shrink-0 inline-block'
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                          {(s as any).dealsCount ? ` (${(s as any).dealsCount})` : ''}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {!migrateTo && (
                <p className='text-xs text-destructive flex items-center gap-1'>
                  <AlertTriangle className='h-3 w-3' />
                  Sem destino, {dealsCount} negociação{dealsCount !== 1 ? 'ões' : ''} será{dealsCount !== 1 ? 'ão' : ''} perdida{dealsCount !== 1 ? 's' : ''}.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant='ghost' onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant='destructive' onClick={handleConfirmDelete}>
              Deletar fase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Conteúdo visual do row — usado tanto pelo StageRow quanto pelo DragOverlay */
function StageRowContent({
  stage,
  dragHandleProps,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  projectId,
}: {
  stage: EditableStage
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
  isExpanded?: boolean
  onToggleExpand?: () => void
  onUpdate?: (updates: Partial<EditableStage>) => void
  onRemove?: () => void
  projectId?: string
}) {
  const colorRef = useRef<HTMLInputElement>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(stage.name)
  const isOverlay = !onUpdate

  const commitName = () => {
    if (editName.trim()) onUpdate?.({ name: editName })
    else setEditName(stage.name)
    setIsEditingName(false)
  }

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 border bg-card transition-colors',
      isExpanded && !isOverlay ? 'rounded-t-lg rounded-b-none' : 'rounded-lg',
      isOverlay ? 'border-primary/40 shadow-xl ring-2 ring-primary/20 cursor-grabbing' : 'border-border hover:border-primary/20',
    )}>
      {/* Drag handle */}
      <button
        type='button'
        className='cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0 touch-none'
        {...(dragHandleProps ?? {})}
      >
        <GripVertical className='h-4 w-4' />
      </button>

      {/* Color swatch */}
      <button
        type='button'
        className='h-4 w-4 rounded-full shrink-0 border border-black/15 hover:scale-110 transition-transform'
        style={{ backgroundColor: stage.color }}
        onClick={() => !isOverlay && colorRef.current?.click()}
      />
      <input
        ref={colorRef}
        type='color'
        value={stage.color}
        onChange={(e) => onUpdate?.({ color: e.target.value })}
        className='sr-only'
      />

      {/* Name */}
      <div className='flex-1 min-w-0'>
        {isEditingName && !isOverlay ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName()
              if (e.key === 'Escape') { setEditName(stage.name); setIsEditingName(false) }
            }}
            autoFocus
            className='h-7 text-sm px-2'
          />
        ) : (
          <span
            onClick={() => !isOverlay && setIsEditingName(true)}
            className={cn('text-sm font-medium truncate block', !isOverlay && 'cursor-pointer hover:text-primary transition-colors')}
          >
            {stage.name}
          </span>
        )}
      </div>

      {/* Remove */}
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10 shrink-0'
        onClick={onRemove}
        disabled={isOverlay}
      >
        <Trash2 className='h-3.5 w-3.5' />
      </Button>

      {/* Expand */}
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='h-7 w-7 shrink-0'
        onClick={onToggleExpand}
        disabled={isOverlay}
      >
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
      </Button>
    </div>
  )
}
