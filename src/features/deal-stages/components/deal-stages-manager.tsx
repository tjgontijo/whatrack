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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Kanban, Plus, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState, LoadingPage } from '@/features/dashboard/components/states'
import { EditStagesModal } from '@/features/deal-stage-templates/dialogs/edit-stages-modal'
import { apiFetch } from '@/lib/http/api-client'
import { StageDialog } from '../dialogs/stage-dialog'
import { DealStageItem } from './deal-stage-item'
import type { DealStage, DealStageFormData } from '../types'

export function DealStagesManager({
  organizationId,
  projectId,
}: {
  organizationId?: string
  projectId?: string
}) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<DealStage | null>(null)
  const [localOrder, setLocalOrder] = useState<DealStage[] | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const { data, isLoading } = useQuery<{ items: DealStage[] }>({
    queryKey: ['deal-stages', organizationId, projectId],
    queryFn: async () => {
      const data = await apiFetch('/api/v1/deal-stages', {
        orgId: organizationId,
        projectId,
      })
      return data as { items: DealStage[] }
    },
    enabled: !!organizationId,
  })

  const stages = localOrder ?? data?.items ?? []

  const createMutation = useMutation({
    mutationFn: async (body: DealStageFormData) => {
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
    mutationFn: async ({ id, ...body }: DealStageFormData & { id: string }) => {
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

  const handleSave = (form: DealStageFormData) => {
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
      <div className='flex items-center justify-between gap-3 mb-6'>
        <div className='flex flex-col gap-0.5'>
          <h2 className='text-lg font-semibold tracking-tight'>Fases do Funil</h2>
          <p className='text-xs text-muted-foreground font-medium uppercase tracking-wider'>
            {stages.length} fase{stages.length !== 1 ? 's' : ''} — arraste para reordenar
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setTemplateModalOpen(true)}
            size='sm'
            className='gap-2 rounded-full px-4 border-primary/20 hover:bg-primary/5 transition-colors'
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
            className='gap-2 rounded-full px-4 shadow-sm'
          >
            <Plus className='h-4 w-4' />
            Nova Fase
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

      <div className='space-y-3'>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {stages.map((stage) => (
              <DealStageItem
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
            description='Clique em "Adicionar Fase" ou escolha um Template'
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
