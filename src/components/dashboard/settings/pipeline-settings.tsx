'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Kanban,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { DeleteConfirmDialog } from '@/components/dashboard/crud/delete-confirm-dialog'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b',
]

interface Stage {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
  isClosed: boolean
  ticketsCount: number
}

interface StageFormData {
  name: string
  color: string
  isDefault: boolean
  isClosed: boolean
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
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span
        className="h-3 w-3 rounded-full shrink-0"
        style={{ backgroundColor: stage.color }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{stage.name}</span>
          {stage.isDefault && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Padrão</Badge>
          )}
          {stage.isClosed && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Fechada</Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {stage.ticketsCount} ticket{stage.ticketsCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(stage)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <DeleteConfirmDialog
          title="Excluir fase?"
          description={
            stage.ticketsCount > 0
              ? `A fase "${stage.name}" tem ${stage.ticketsCount} ticket(s) que serão movidos para a fase padrão antes da exclusão.`
              : `Tem certeza que deseja excluir a fase "${stage.name}"?`
          }
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              disabled={stage.isDefault}
              title={stage.isDefault ? 'Não é possível excluir a fase padrão' : 'Excluir'}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          }
          onConfirm={() => onDelete(stage)}
        />
      </div>
    </div>
  )
}

function StageDialog({
  open,
  onOpenChange,
  stage,
  onSave,
  isSaving,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  stage: Stage | null
  onSave: (data: StageFormData) => void
  isSaving: boolean
}) {
  const [form, setForm] = useState<StageFormData>({
    name: stage?.name ?? '',
    color: stage?.color ?? PRESET_COLORS[0],
    isDefault: stage?.isDefault ?? false,
    isClosed: stage?.isClosed ?? false,
  })

  React.useEffect(() => {
    setForm({
      name: stage?.name ?? '',
      color: stage?.color ?? PRESET_COLORS[0],
      isDefault: stage?.isDefault ?? false,
      isClosed: stage?.isClosed ?? false,
    })
  }, [stage, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{stage ? 'Editar Fase' : 'Nova Fase'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Nome da fase</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Em análise"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="h-7 w-7 rounded-full border-2 transition-all"
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

          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Fase padrão</p>
                <p className="text-xs text-muted-foreground">Novos tickets entram aqui</p>
              </div>
            </div>
            <Switch
              checked={form.isDefault}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isDefault: v }))}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Fase de fechamento</p>
                <p className="text-xs text-muted-foreground">Tickets nesta fase são considerados fechados</p>
              </div>
            </div>
            <Switch
              checked={form.isClosed}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isClosed: v }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(form)} disabled={!form.name.trim() || isSaving}>
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PipelineSettings() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<Stage | null>(null)
  const [localOrder, setLocalOrder] = useState<Stage[] | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const { data, isLoading } = useQuery<{ items: Stage[] }>({
    queryKey: ['ticket-stages'],
    queryFn: async () => {
      const res = await fetch('/api/v1/ticket-stages')
      if (!res.ok) throw new Error('Falha ao carregar fases')
      return res.json()
    },
  })

  const stages = localOrder ?? data?.items ?? []

  const createMutation = useMutation({
    mutationFn: async (body: StageFormData) => {
      const res = await fetch('/api/v1/ticket-stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Falha ao criar fase')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Fase criada com sucesso')
      setDialogOpen(false)
      setLocalOrder(null)
      queryClient.invalidateQueries({ queryKey: ['ticket-stages'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: StageFormData & { id: string }) => {
      const res = await fetch(`/api/v1/ticket-stages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Falha ao atualizar fase')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Fase atualizada')
      setDialogOpen(false)
      setEditingStage(null)
      setLocalOrder(null)
      queryClient.invalidateQueries({ queryKey: ['ticket-stages'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/ticket-stages/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Falha ao excluir fase')
      }
    },
    onSuccess: () => {
      toast.success('Fase excluída')
      setLocalOrder(null)
      queryClient.invalidateQueries({ queryKey: ['ticket-stages'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetch('/api/v1/ticket-stages/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      })
      if (!res.ok) throw new Error('Falha ao reordenar fases')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-stages'] })
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
    } else {
      createMutation.mutate(form)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Kanban className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Pipeline</h1>
              <p className="text-sm text-muted-foreground">Gerencie as fases do seu funil de tickets</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingStage(null)
              setDialogOpen(true)
            }}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Fase
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-2">
            <p className="text-xs text-muted-foreground mb-4 uppercase tracking-widest font-semibold">
              {stages.length} fase{stages.length !== 1 ? 's' : ''} — arraste para reordenar
            </p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {stages.map((stage) => (
                  <StageItem
                    key={stage.id}
                    stage={stage}
                    onEdit={(s) => {
                      setEditingStage(s)
                      setDialogOpen(true)
                    }}
                    onDelete={(s) => deleteMutation.mutate(s.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {stages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                  <Kanban className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-bold text-muted-foreground">Nenhuma fase configurada</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Clique em &quot;Adicionar Fase&quot; para começar</p>
              </div>
            )}
          </div>
        )}
      </div>

      <StageDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v)
          if (!v) setEditingStage(null)
        }}
        stage={editingStage}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  )
}
