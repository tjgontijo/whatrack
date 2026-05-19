'use client'

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import React, { useState } from 'react'
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
import { useCreateStageMutation } from '@/features/deal-stages/mutations/use-create-stage-mutation'
import { useDeleteStageMutation } from '@/features/deal-stages/mutations/use-delete-stage-mutation'
import { useReorderStageMutation } from '@/features/deal-stages/mutations/use-reorder-stage-mutation'
import type { DealItem, DealStageColumn, DealStageStats } from '@/features/deals/types'
import { cn } from '@/lib/utils/utils'
import { DealsKanbanCard } from './deals-kanban-card'
import { DealsKanbanStage } from './deals-kanban-stage'

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

interface DealsKanbanBoardProps {
  columns: DealStageColumn[]
  deals: DealItem[]
  stageStats: DealStageStats
  organizationId: string
  projectId: string
  onMoveDeal: (dealId: string, toStageId: string) => Promise<void> | void
  onConfigStage?: (stageId: string) => void
}

export function DealsKanbanBoard({
  columns,
  deals,
  stageStats,
  organizationId,
  projectId,
  onMoveDeal,
  onConfigStage,
}: DealsKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [insertAfterIndex, setInsertAfterIndex] = useState<number>(-1)
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState<string>(PRESET_COLORS[0])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [stageToDelete, setStageToDelete] = useState<string | null>(null)

  const createStageMutation = useCreateStageMutation()
  const reorderMutation = useReorderStageMutation()
  const deleteMutation = useDeleteStageMutation()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null

  const dealsByStage = React.useMemo(() => {
    const map = new Map<string, DealItem[]>()
    for (const col of columns) map.set(col.id, [])
    for (const deal of deals) {
      const stageId = deal.stage.id
      const existing = map.get(stageId) ?? []
      existing.push(deal)
      map.set(stageId, existing)
    }
    return map
  }, [columns, deals])

  const openAddDialog = (afterIndex: number) => {
    setInsertAfterIndex(afterIndex)
    setNewStageName('')
    setNewStageColor(PRESET_COLORS[0])
    setAddDialogOpen(true)
  }

  const handleMoveStageLeft = (stageId: string) => {
    reorderMutation.mutate({
      stageId,
      direction: 'up',
      columns,
      organizationId,
      projectId,
    })
  }

  const handleMoveStageRight = (stageId: string) => {
    reorderMutation.mutate({
      stageId,
      direction: 'down',
      columns,
      organizationId,
      projectId,
    })
  }

  const handleDeleteStage = (stageId: string) => {
    setStageToDelete(stageId)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (stageToDelete) {
      deleteMutation.mutate({
        stageId: stageToDelete,
        organizationId,
        projectId,
      })
      setDeleteConfirmOpen(false)
      setStageToDelete(null)
    }
  }

  const handleCreateNewStage = (afterIndex: number) => {
    openAddDialog(afterIndex)
  }

  const handleCreateStage = () => {
    if (!newStageName.trim() || createStageMutation.isPending) return

    createStageMutation.mutate(
      {
        organizationId,
        projectId,
        name: newStageName,
        color: newStageColor,
        insertAfterIndex,
        columns,
      },
      {
        onSuccess: () => {
          setAddDialogOpen(false)
          setNewStageName('')
          setNewStageColor(PRESET_COLORS[0])
        },
      }
    )
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const dealId = String(active.id)
    const activeDeal = deals.find((d) => d.id === dealId)
    if (!activeDeal) return
    const fromStageId = activeDeal.stage.id
    let toStageId = String(over.id)
    const overDeal = deals.find((d) => d.id === toStageId)
    if (overDeal) toStageId = overDeal.stage.id
    if (fromStageId === toStageId) return
    await onMoveDeal(dealId, toStageId)
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className='scrollbar-thin flex h-full w-full flex-1 gap-0 overflow-x-auto px-3 pt-3 pb-3'>
          {columns.map((column, index) => (
            <React.Fragment key={column.id}>
              {/* Separator with hover add button */}
              {index > 0 && (
                <div className='group relative flex w-3 shrink-0 items-center justify-center self-stretch transition-all duration-150 hover:w-8'>
                  <div className='h-full w-px bg-transparent transition-colors group-hover:bg-primary/20' />
                  <Button
                    variant='secondary'
                    size='icon'
                    className='absolute z-10 h-6 w-6 scale-0 rounded-full border border-border bg-background shadow transition-transform group-hover:scale-100'
                    onClick={() => openAddDialog(index - 1)}
                  >
                    <Plus className='h-3 w-3' />
                  </Button>
                </div>
              )}
              <DealsKanbanStage
                stage={column}
                deals={dealsByStage.get(column.id) ?? []}
                stats={stageStats[column.id]}
                stageIndex={index}
                totalStages={columns.length}
                onConfigStage={() => onConfigStage?.(column.id)}
                onMoveStageLeft={() => handleMoveStageLeft(column.id)}
                onMoveStageRight={() => handleMoveStageRight(column.id)}
                onCreateStageBefore={() => handleCreateNewStage(index)}
                onDeleteStage={() => handleDeleteStage(column.id)}
              />
            </React.Fragment>
          ))}

          {/* Add stage button after last column */}
          <div className='group relative flex w-3 shrink-0 items-center justify-center self-stretch transition-all duration-150 hover:w-8'>
            <div className='h-full w-px bg-transparent transition-colors group-hover:bg-primary/20' />
            <Button
              variant='secondary'
              size='icon'
              className='absolute z-10 h-6 w-6 scale-0 rounded-full border border-border bg-background shadow transition-transform group-hover:scale-100'
              onClick={() => openAddDialog(columns.length - 1)}
            >
              <Plus className='h-3 w-3' />
            </Button>
          </div>
        </div>

        <DragOverlay
          dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}
        >
          {activeDeal ? (
            <div className='w-[280px]'>
              <DealsKanbanCard deal={activeDeal} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>Nova Fase</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-1.5'>
              <Label className='text-xs'>Nome</Label>
              <Input
                placeholder='Ex: Proposta enviada'
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateStage()}
                autoFocus
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs'>Cor</Label>
              <div className='flex flex-wrap gap-2'>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type='button'
                    onClick={() => setNewStageColor(color)}
                    className={cn(
                      'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                      newStageColor === color ? 'scale-110 border-foreground' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='ghost' onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateStage}
              disabled={!newStageName.trim() || createStageMutation.isPending}
            >
              {createStageMutation.isPending ? 'Criando...' : 'Criar Fase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>Deletar Fase</DialogTitle>
          </DialogHeader>
          <p className='text-muted-foreground text-sm'>
            Tem certeza que deseja deletar esta fase? Os deals serão movidos para a fase padrão.
          </p>
          <DialogFooter>
            <Button variant='ghost' onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant='destructive'
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deletando...' : 'Deletar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
