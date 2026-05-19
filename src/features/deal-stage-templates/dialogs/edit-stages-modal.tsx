'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Settings2,
  X,
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MetaRulesManager } from '@/features/deal-stages/components/meta-rules-manager'
import { cn } from '@/lib/utils/utils'
import type { DealStageFormData } from '@/features/deal-stages/types'

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

export function EditStagesModal({
  open,
  onOpenChange,
  projectId,
  organizationId,
  currentStages,
}: EditStagesModalProps) {
  const queryClient = useQueryClient()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [stages, setStages] = useState<EditableStage[]>([])
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null)

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<Template[]>({
    queryKey: ['deal-stage-templates'],
    queryFn: async () => {
      const res = await fetch('/api/v1/deal-stage-templates')
      if (!res.ok) throw new Error('Falha ao buscar templates')
      return res.json()
    },
    enabled: open,
  })

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

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
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setStages(template.items.map((item) => ({
        ...item,
        metaRules: [],
      })))
      setExpandedStageId(null)
    }
  }

  const handleAddStage = () => {
    const newStage: EditableStage = {
      name: 'Nova Fase',
      color: PRESET_COLORS[0],
      order: (stages.length) + 1,
      statusGroup: 'ACTIVE',
      probability: 50,
      suggestedMetaEventName: null,
      isNew: true,
      id: `new-${Date.now()}`,
      metaRules: [],
    }
    setStages([...stages, newStage])
  }

  const handleUpdateStage = (id: string | undefined, updates: Partial<EditableStage>) => {
    setStages(stages.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const handleRemoveStage = (id: string | undefined) => {
    setStages(stages.filter(s => s.id !== id))
  }

  const handleApply = () => {
    if (!selectedTemplateId) return

    const hasDeals = currentStages.some(s => s.dealsCount > 0)

    if (hasDeals) {
      if (!confirm('Atenção: Este projeto já possui negociações. Aplicar novo funil irá mover negociações para a primeira fase. Continuar?')) return
    } else if (currentStages.length > 0) {
      if (!confirm('Vai substituir fases atuais. Continuar?')) return
    }

    applyMutation.mutate(selectedTemplateId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[85vh] max-w-6xl flex-col p-0 overflow-hidden rounded-2xl border-none shadow-2xl'>
        <div className='flex flex-1 overflow-hidden'>
          {/* Sidebar: Templates */}
          <div className='w-72 border-r border-border bg-muted/20 p-6 overflow-y-auto'>
            <div className='mb-6'>
              <h3 className='font-bold text-base tracking-tight'>Metodologias</h3>
              <p className='text-muted-foreground text-xs font-medium uppercase tracking-wider mt-1'>Selecione uma base</p>
            </div>

            <div className='space-y-1.5'>
              {isLoadingTemplates ? (
                <div className='flex flex-col items-center justify-center py-12 gap-3'>
                  <Loader2 className='h-6 w-6 animate-spin text-primary/40' />
                  <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest'>Carregando...</p>
                </div>
              ) : (
                templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 border-2',
                      selectedTemplateId === t.id
                        ? 'bg-primary border-primary text-primary-foreground font-semibold shadow-md translate-x-1'
                        : 'hover:bg-muted border-transparent text-muted-foreground hover:translate-x-1'
                    )}
                  >
                    {t.name}
                    {t.isPopular && (
                      <Badge className='ml-2 bg-yellow-400 text-black hover:bg-yellow-400 border-none text-[9px] h-4 px-1.5'>POPULAR</Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main: Edit Stages */}
          <div className='flex-1 flex flex-col min-w-0 bg-background overflow-hidden'>
            <DialogHeader className='px-8 py-6 border-b border-border shrink-0 bg-background/50 backdrop-blur-md sticky top-0 z-10'>
              <DialogTitle className='text-xl font-bold tracking-tight'>
                {selectedTemplate ? selectedTemplate.name : 'Configurar Funil'}
              </DialogTitle>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar'>
              {!selectedTemplate ? (
                <div className='h-full flex flex-col items-center justify-center text-center px-12'>
                  <div className='bg-muted/30 p-6 rounded-full mb-6'>
                    <Settings2 className='h-12 w-12 text-primary/20' />
                  </div>
                  <h4 className='font-bold text-lg tracking-tight'>Escolha uma metodologia</h4>
                  <p className='text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed'>
                    Selecione um modelo à esquerda e personalize suas fases e eventos Meta CAPI.
                  </p>
                </div>
              ) : (
                <>
                  <StagesEditor
                    stages={stages}
                    expandedStageId={expandedStageId}
                    onExpandedChange={setExpandedStageId}
                    onUpdateStage={handleUpdateStage}
                    onRemoveStage={handleRemoveStage}
                    projectId={projectId}
                  />

                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleAddStage}
                    className='w-full gap-2 rounded-xl border-dashed'
                  >
                    <Plus className='h-4 w-4' />
                    Adicionar Fase
                  </Button>
                </>
              )}
            </div>

            <DialogFooter className='px-8 py-5 border-t border-border shrink-0 bg-muted/5'>
              <Button variant='ghost' className='rounded-full px-6' onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                className='rounded-full px-8 font-bold shadow-lg transition-all active:scale-95'
                disabled={!selectedTemplateId || applyMutation.isPending}
                onClick={handleApply}
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Salvando...
                  </>
                ) : (
                  'Aplicar Funil'
                )}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StagesEditor({
  stages,
  expandedStageId,
  onExpandedChange,
  onUpdateStage,
  onRemoveStage,
  projectId,
}: {
  stages: EditableStage[]
  expandedStageId: string | null
  onExpandedChange: (id: string | null) => void
  onUpdateStage: (id: string | undefined, updates: Partial<EditableStage>) => void
  onRemoveStage: (id: string | undefined) => void
  projectId: string
}) {
  const groupedStages = {
    ACTIVE: stages.filter(s => s.statusGroup === 'ACTIVE'),
    WON: stages.filter(s => s.statusGroup === 'WON'),
    LOST: stages.filter(s => s.statusGroup === 'LOST'),
  }

  const groups: Array<{
    key: 'ACTIVE' | 'WON' | 'LOST'
    title: string
    color: string
  }> = [
    { key: 'ACTIVE', title: 'EM ANDAMENTO', color: 'text-blue-600' },
    { key: 'WON', title: 'FECHAMENTO', color: 'text-green-600' },
    { key: 'LOST', title: 'PERDA', color: 'text-red-600' },
  ]

  return (
    <div className='space-y-8'>
      {groups.map(({ key, title, color }) => (
        <div key={key} className='space-y-4'>
          <div className={cn('flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]', color)}>
            <ChevronRight className='h-3 w-3 stroke-[3px]' />
            {title}
          </div>
          <div className='space-y-2'>
            {groupedStages[key].map((stage) => (
              <StageRow
                key={stage.id}
                stage={stage}
                isExpanded={expandedStageId === stage.id}
                onToggleExpand={() => onExpandedChange(expandedStageId === stage.id ? null : (stage.id ?? ''))}
                onUpdate={(updates) => onUpdateStage(stage.id, updates)}
                onRemove={() => onRemoveStage(stage.id)}
                projectId={projectId}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function StageRow({
  stage,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  projectId,
}: {
  stage: EditableStage
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (updates: Partial<EditableStage>) => void
  onRemove: () => void
  projectId: string
}) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(stage.name)

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all group'>
        <div className='flex items-center gap-3 flex-1 min-w-0'>
          <input
            type='color'
            value={stage.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className='h-8 w-8 rounded-lg cursor-pointer border border-border'
          />

          {isEditingName ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => {
                if (editName.trim()) {
                  onUpdate({ name: editName })
                  setIsEditingName(false)
                } else {
                  setEditName(stage.name)
                  setIsEditingName(false)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editName.trim()) {
                    onUpdate({ name: editName })
                    setIsEditingName(false)
                  } else {
                    setEditName(stage.name)
                    setIsEditingName(false)
                  }
                }
                if (e.key === 'Escape') {
                  setEditName(stage.name)
                  setIsEditingName(false)
                }
              }}
              autoFocus
              className='h-9 flex-1 min-w-0'
            />
          ) : (
            <span
              onClick={() => setIsEditingName(true)}
              className='font-bold text-sm tracking-tight cursor-pointer hover:text-primary transition-colors truncate'
            >
              {stage.name}
            </span>
          )}

          <div className='flex items-center gap-2 ml-auto'>
            {stage.probability > 0 && stage.probability < 100 && (
              <Badge variant='secondary' className='text-[10px] font-black h-5 px-1.5 bg-muted/50 whitespace-nowrap'>
                {stage.probability}%
              </Badge>
            )}
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {stage.isNew && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-destructive hover:bg-destructive/10'
              onClick={onRemove}
            >
              <X className='h-4 w-4' />
            </Button>
          )}
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={onToggleExpand}
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className='ml-4 p-4 rounded-xl bg-muted/30 border border-border/50 space-y-4'>
          <MetaRulesManager
            projectId={projectId}
            rules={stage.metaRules}
            onChange={(rules) => onUpdate({ metaRules: rules })}
          />
        </div>
      )}
    </div>
  )
}
