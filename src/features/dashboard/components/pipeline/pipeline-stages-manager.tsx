'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
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
  CheckCircle2,
  GripVertical,
  Kanban,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeleteConfirmDialog } from '@/features/dashboard/components/crud/delete-confirm-dialog'
import { EmptyState, LoadingPage } from '@/features/dashboard/components/states'
import { apiFetch } from '@/lib/http/api-client'
import { EditStagesModal } from '@/features/deal-stage-templates/components/edit-stages-modal'

const PRESET_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#64748b',
] as const

interface Stage {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
  isClosed: boolean
  dealsCount: number
  statusGroup: string
  metaRules: {
    id: string
    pixelId: string
    eventName: string
    fireOnce: boolean
  }[]
}

interface StageFormData {
  name: string
  color: string
  isDefault: boolean
  isClosed: boolean
  metaRules: {
    pixelId: string
    eventName: string
    fireOnce: boolean
  }[]
}

function StageItem({
  stage,
  onEdit,
  onDelete,
}: {
  stage: Stage
  onEdit: (stage: Stage) => void
  onDelete: (stage: Stage) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className='group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/30'
    >
      <button
        type='button'
        {...attributes}
        {...listeners}
        className='cursor-grab text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing'
      >
        <GripVertical className='h-4 w-4' />
      </button>

      <span className='h-3 w-3 shrink-0 rounded-full' style={{ backgroundColor: stage.color }} />

      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='truncate font-medium text-sm'>{stage.name}</span>
          {stage.isDefault && (
            <Badge variant='secondary' className='px-1.5 py-0 text-[10px]'>
              Padrão
            </Badge>
          )}
          {stage.statusGroup !== 'ACTIVE' && (
            <Badge variant='outline' className='px-1.5 py-0 text-[10px] text-muted-foreground'>
              {stage.statusGroup}
            </Badge>
          )}
        </div>
        <div className='mt-0.5 flex items-center gap-2'>
          <p className='text-[11px] text-muted-foreground'>
            {stage.dealsCount} deal{stage.dealsCount !== 1 ? 's' : ''}
          </p>
          {stage.metaRules.length > 0 && (
            <div className='flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100'>
              <Megaphone className='h-2.5 w-2.5' />
              {stage.metaRules.length} automação
            </div>
          )}
        </div>
      </div>

      <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-7 w-7'
          onClick={() => onEdit(stage)}
        >
          <Pencil className='h-3.5 w-3.5' />
        </Button>
        <DeleteConfirmDialog
          title='Excluir fase?'
          description={
            stage.dealsCount > 0
              ? `A fase "${stage.name}" tem ${stage.dealsCount} deal(s) que serão movidos para a fase padrão antes da exclusão.`
              : `Tem certeza que deseja excluir a fase "${stage.name}"?`
          }
          trigger={
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='h-7 w-7 text-destructive hover:text-destructive'
              disabled={stage.isDefault}
              title={stage.isDefault ? 'Não é possível excluir a fase padrão' : 'Excluir'}
            >
              <Trash2 className='h-3.5 w-3.5' />
            </Button>
          }
          onConfirm={() => onDelete(stage)}
        />
      </div>
    </div>
  )
}

interface MetaPixel {
  id: string
  name: string | null
  pixelId: string
}

interface MetaEventType {
  name: string
  label: string
}

function MetaRulesManager({
  projectId,
  rules,
  onChange,
}: {
  projectId?: string
  rules: StageFormData['metaRules']
  onChange: (rules: StageFormData['metaRules']) => void
}) {
  const { data: pixelsData } = useQuery<{ items: MetaPixel[] }>({
    queryKey: ['meta-pixels', projectId],
    queryFn: async () => {
      const data = await apiFetch('/api/v1/meta-ads/pixels', {
        projectId,
      })
      return data as { items: MetaPixel[] }
    },
    enabled: !!projectId,
  })

  // Hardcoded for now as defined in T1 seed
  const standardEvents: MetaEventType[] = [
    { name: 'Lead', label: 'Lead Captado' },
    { name: 'QualifiedLead', label: 'Lead Qualificado' },
    { name: 'Purchase', label: 'Venda Realizada' },
    { name: 'Schedule', label: 'Agendamento' },
    { name: 'Contact', label: 'Contato' },
    { name: 'CompleteRegistration', label: 'Cadastro Concluido' },
  ]

  const addRule = () => {
    if (!pixelsData?.items?.length) {
      toast.error('Nenhum pixel configurado para este projeto')
      return
    }
    onChange([...rules, { pixelId: pixelsData.items[0].id, eventName: 'Lead', fireOnce: true }])
  }

  const removeRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index))
  }

  const updateRule = (index: number, updates: Partial<StageFormData['metaRules'][0]>) => {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...updates } : r)))
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2 text-muted-foreground'>
          <Megaphone className='h-4 w-4' />
          <h4 className='font-medium text-sm'>Automações Meta CAPI</h4>
        </div>
        <Button type='button' variant='ghost' size='sm' onClick={addRule} className='h-8 gap-1.5'>
          <Plus className='h-3.5 w-3.5' />
          Adicionar regra
        </Button>
      </div>

      <div className='space-y-3'>
        {rules.map((rule, index) => (
          <div key={`${index}-${rule.pixelId}`} className='relative rounded-lg border border-border p-4'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='absolute top-2 right-2 h-6 w-6'
              onClick={() => removeRule(index)}
            >
              <X className='h-3 w-3' />
            </Button>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label className='text-xs'>Pixel / Dataset</Label>
                <Select
                  value={rule.pixelId}
                  onValueChange={(v) => updateRule(index, { pixelId: v })}
                >
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue placeholder='Selecione o pixel' />
                  </SelectTrigger>
                  <SelectContent>
                    {pixelsData?.items.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name || p.pixelId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label className='text-xs'>Evento</Label>
                <Select
                  value={standardEvents.some((e) => e.name === rule.eventName) ? rule.eventName : 'custom'}
                  onValueChange={(v) => {
                    if (v === 'custom') {
                      updateRule(index, { eventName: '' })
                    } else {
                      updateRule(index, { eventName: v })
                    }
                  }}
                >
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue placeholder='Selecione o evento' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Padrão Meta</SelectLabel>
                      {standardEvents.map((e) => (
                        <SelectItem key={e.name} value={e.name}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <Separator className='my-1' />
                    <SelectItem value='custom'>Personalizado...</SelectItem>
                  </SelectContent>
                </Select>
                {!standardEvents.some((e) => e.name === rule.eventName) && (
                  <Input
                    className='mt-2 h-8 text-xs'
                    placeholder='Nome do evento (ex: LeadFrio)'
                    value={rule.eventName}
                    onChange={(e) => updateRule(index, { eventName: e.target.value })}
                  />
                )}
              </div>
            </div>

            <div className='mt-4 flex items-center justify-between'>
              <div className='space-y-0.5'>
                <Label className='text-xs'>Enviar apenas uma vez</Label>
                <p className='text-[10px] text-muted-foreground'>Evita duplicidade para o mesmo deal</p>
              </div>
              <Switch
                checked={rule.fireOnce}
                onCheckedChange={(v) => updateRule(index, { fireOnce: v })}
              />
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center'>
            <Settings2 className='h-8 w-8 text-muted-foreground/20' />
            <p className='mt-2 text-muted-foreground text-xs'>Nenhuma automação configurada</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StageDialog({
  open,
  onOpenChange,
  stage,
  projectId,
  onSave,
  isSaving,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  stage: Stage | null
  projectId?: string
  onSave: (data: StageFormData) => void
  isSaving: boolean
}) {
  const [form, setForm] = useState<StageFormData>({
    name: '',
    color: PRESET_COLORS[0],
    isDefault: false,
    isClosed: false,
    metaRules: [],
  })

  // Sync form with stage when it opens
  useState(() => {
    if (stage) {
      setForm({
        name: stage.name,
        color: stage.color,
        isDefault: stage.isDefault,
        isClosed: stage.isClosed,
        metaRules: stage.metaRules.map(r => ({
          pixelId: r.pixelId,
          eventName: r.eventName,
          fireOnce: r.fireOnce
        })),
      })
    }
  })

  // Update form when stage changes (e.g. switching between edit and create)
  useState(() => {
    if (!open) return
    setForm({
      name: stage?.name ?? '',
      color: stage?.color ?? PRESET_COLORS[0],
      isDefault: stage?.isDefault ?? false,
      isClosed: stage?.isClosed ?? false,
      metaRules: stage?.metaRules.map(r => ({
        pixelId: r.pixelId,
        eventName: r.eventName,
        fireOnce: r.fireOnce
      })) ?? [],
    })
  })

  // Correct way to handle initial state in Dialog with controlled form
  const handleOpenChange = (v: boolean) => {
    if (v && stage) {
      setForm({
        name: stage.name,
        color: stage.color,
        isDefault: stage.isDefault,
        isClosed: stage.isClosed,
        metaRules: stage.metaRules.map(r => ({
          pixelId: r.pixelId,
          eventName: r.eventName,
          fireOnce: r.fireOnce
        })),
      })
    } else if (v && !stage) {
      setForm({
        name: '',
        color: PRESET_COLORS[0],
        isDefault: false,
        isClosed: false,
        metaRules: [],
      })
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{stage ? 'Editar Fase' : 'Nova Fase'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue='general' className='w-full'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='general'>Geral</TabsTrigger>
            <TabsTrigger value='automations'>Automações</TabsTrigger>
          </TabsList>
          
          <TabsContent value='general' className='space-y-5 py-4'>
            <div className='space-y-5'>
              <div className='space-y-2'>
                <Label>Nome da fase</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder='Ex: Em análise'
                  autoFocus
                />
              </div>

              <div className='space-y-2'>
                <Label>Cor</Label>
                <div className='flex flex-wrap gap-2'>
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type='button'
                      className='h-7 w-7 rounded-full border-2 transition-all'
                      style={{
                        backgroundColor: color,
                        borderColor: form.color === color ? 'white' : 'transparent',
                        outline: form.color === color ? `2px solid ${color}` : 'none',
                        outlineOffset: '1px',
                      }}
                      onClick={() => setForm((f) => ({ ...f, color }))}
                    />
                  ))}
                </div>
              </div>

              <div className='flex items-center justify-between rounded-lg border border-border px-4 py-3'>
                <div className='flex items-center gap-2'>
                  <CheckCircle2 className='h-4 w-4 text-primary' />
                  <div>
                    <p className='font-medium text-sm'>Fase padrão</p>
                    <p className='text-muted-foreground text-xs'>Novos deals entram aqui</p>
                  </div>
                </div>
                <Switch
                  checked={form.isDefault}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isDefault: v }))}
                />
              </div>

              <div className='flex items-center justify-between rounded-lg border border-border px-4 py-3'>
                <div className='flex items-center gap-2'>
                  <XCircle className='h-4 w-4 text-muted-foreground' />
                  <div>
                    <p className='font-medium text-sm'>Fase de fechamento</p>
                    <p className='text-muted-foreground text-xs'>
                      Deals nesta fase são considerados fechados
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.isClosed}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isClosed: v }))}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value='automations' className='py-4'>
            <MetaRulesManager
              projectId={projectId}
              rules={form.metaRules}
              onChange={(rules) => setForm((f) => ({ ...f, metaRules: rules }))}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type='button'
            onClick={() => onSave(form)}
            disabled={!form.name.trim() || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PipelineStagesManager({
  organizationId,
  projectId,
}: {
  organizationId?: string
  projectId?: string
}) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<Stage | null>(null)
  const [localOrder, setLocalOrder] = useState<Stage[] | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const { data, isLoading } = useQuery<{ items: Stage[] }>({
    queryKey: ['deal-stages', organizationId, projectId],
    queryFn: async () => {
      const data = await apiFetch('/api/v1/deal-stages', {
        orgId: organizationId,
        projectId,
      })
      return data as { items: Stage[] }
    },
    enabled: !!organizationId,
  })

  const stages = localOrder ?? data?.items ?? []

  const createMutation = useMutation({
    mutationFn: async (body: StageFormData) => {
      const data = await apiFetch('/api/v1/deal-stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        orgId: organizationId,
        projectId,
      })
      return data
    },
    onSuccess: () => {
      toast.success('Fase criada com sucesso')
      setDialogOpen(false)
      setLocalOrder(null)
      queryClient.invalidateQueries({ queryKey: ['deal-stages'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: StageFormData & { id: string }) => {
      const data = await apiFetch(`/api/v1/deal-stages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        orgId: organizationId,
        projectId,
      })
      return data
    },
    onSuccess: () => {
      toast.success('Fase atualizada')
      setDialogOpen(false)
      setEditingStage(null)
      setLocalOrder(null)
      queryClient.invalidateQueries({ queryKey: ['deal-stages'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/v1/deal-stages/${id}`, {
        method: 'DELETE',
        orgId: organizationId,
        projectId,
      })
    },
    onSuccess: () => {
      toast.success('Fase excluída')
      setLocalOrder(null)
      queryClient.invalidateQueries({ queryKey: ['deal-stages'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await apiFetch('/api/v1/deal-stages/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
        orgId: organizationId,
        projectId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-stages'] })
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setLocalOrder(null)
    },
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const currentStages = localOrder ?? data?.items ?? []
    const oldIndex = currentStages.findIndex((s) => s.id === active.id)
    const newIndex = currentStages.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(currentStages, oldIndex, newIndex)
    setLocalOrder(reordered)
    reorderMutation.mutate(reordered.map((s) => s.id))
  }

  const handleSave = (form: StageFormData) => {
    if (editingStage) {
      updateMutation.mutate({ id: editingStage.id, ...form })
      return
    }

    createMutation.mutate(form)
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  if (!organizationId) {
    return <LoadingPage message='Carregando pipeline...' />
  }

  if (isLoading) {
    return <LoadingPage message='Carregando fases...' />
  }

  return (
    <>
      <div className='flex items-center justify-between gap-3'>
        <p className='font-semibold text-muted-foreground text-xs uppercase tracking-widest'>
          {stages.length} fase{stages.length !== 1 ? 's' : ''} — arraste para reordenar
        </p>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setTemplateModalOpen(true)}
            size='sm'
            className='gap-2'
          >
            <Settings2 className='h-4 w-4' />
            Explorar Templates
          </Button>
          <Button
            type='button'
            onClick={() => {
              setEditingStage(null)
              setDialogOpen(true)
            }}
            size='sm'
            className='gap-2'
          >
            <Plus className='h-4 w-4' />
            Adicionar Fase
          </Button>
        </div>
      </div>

      <EditStagesModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        projectId={projectId!}
        organizationId={organizationId}
        currentStages={stages}
      />

      <div className='mt-4 space-y-2'>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {stages.map((stage) => (
              <StageItem
                key={stage.id}
                stage={stage}
                onEdit={(currentStage) => {
                  setEditingStage(currentStage)
                  setDialogOpen(true)
                }}
                onDelete={(currentStage) => deleteMutation.mutate(currentStage.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {stages.length === 0 && (
          <EmptyState
            icon={Kanban}
            title='Nenhuma fase configurada'
            description='Clique em "Adicionar Fase" para começar'
          />
        )}
      </div>

      <StageDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingStage(null)
        }}
        stage={editingStage}
        projectId={projectId}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </>
  )
}
