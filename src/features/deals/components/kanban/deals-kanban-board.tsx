'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  getFirstCollision,
  MeasuringStrategy,
  pointerWithin,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
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
  onReorderDeal: (dealId: string, stageId: string, position: number) => void
  onConfigStage?: (stageId: string) => void
}

function buildColumnItems(columns: DealStageColumn[], deals: DealItem[]): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  for (const col of columns) map[col.id] = []
  for (const deal of deals) {
    if (map[deal.stage.id]) map[deal.stage.id].push(deal.id)
  }
  return map
}

export function DealsKanbanBoard({
  columns,
  deals,
  stageStats,
  organizationId,
  projectId,
  onReorderDeal,
  onConfigStage,
}: DealsKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [columnItems, setColumnItems] = useState<Record<string, string[]>>(() =>
    buildColumnItems(columns, deals)
  )

  const lastOverId = useRef<string | null>(null)
  const recentlyMovedToNewContainer = useRef(false)
  const dragStartContainer = useRef<string | null>(null)

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

  useEffect(() => {
    if (!activeId) setColumnItems(buildColumnItems(columns, deals))
  }, [deals, columns, activeId])

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false
    })
  }, [columnItems])

  const findContainer = useCallback(
    (id: string) => {
      if (id in columnItems) return id
      return Object.keys(columnItems).find((key) => columnItems[key].includes(id)) ?? null
    },
    [columnItems]
  )

  const collisionDetection = useCallback(
    (args: Parameters<typeof pointerWithin>[0]) => {
      const pointerIntersections = pointerWithin(args)
      const intersections =
        pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args)
      let overId = getFirstCollision(intersections, 'id')

      if (overId != null) {
        const overIdStr = String(overId)
        if (overIdStr in columnItems) {
          const containerCards = columnItems[overIdStr]
          if (containerCards.length > 0) {
            const closest = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (c) => c.id !== overIdStr && containerCards.includes(String(c.id))
              ),
            })
            overId = closest[0]?.id ?? overId
          }
        }
        lastOverId.current = String(overId)
        return [{ id: overId }]
      }

      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId
      }

      return lastOverId.current ? [{ id: lastOverId.current }] : []
    },
    [activeId, columnItems]
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    const id = String(active.id)
    setActiveId(id)
    dragStartContainer.current = findContainer(id)
    document.body.style.cursor = 'grabbing'
  }

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    const overId = over ? String(over.id) : null
    if (!overId) return

    const overContainer = findContainer(overId)
    const activeContainer = findContainer(String(active.id))

    if (!overContainer || !activeContainer || activeContainer === overContainer) return

    setColumnItems((prev) => {
      const activeItems = prev[activeContainer]
      const overItems = prev[overContainer]
      const overIndex = overItems.indexOf(overId)
      const activeIndex = activeItems.indexOf(String(active.id))

      let newIndex: number
      if (overId in prev) {
        newIndex = overItems.length
      } else {
        const isBelowOverItem =
          active.rect.current.translated != null &&
          active.rect.current.translated.top > over!.rect.top + over!.rect.height
        const modifier = isBelowOverItem ? 1 : 0
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length
      }

      recentlyMovedToNewContainer.current = true

      return {
        ...prev,
        [activeContainer]: prev[activeContainer].filter((id) => id !== String(active.id)),
        [overContainer]: [
          ...prev[overContainer].slice(0, newIndex),
          activeItems[activeIndex],
          ...prev[overContainer].slice(newIndex),
        ],
      }
    })
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const activeItemId = String(active.id)
    const currentContainer = findContainer(activeItemId)
    const originalContainer = dragStartContainer.current

    setActiveId(null)
    dragStartContainer.current = null
    document.body.style.cursor = ''

    if (!currentContainer || !over) return

    const overId = String(over.id)
    const overContainer = findContainer(overId)

    // Compute final order after optional arrayMove
    let finalOrder = columnItems[currentContainer]

    if (overContainer) {
      const activeIndex = columnItems[currentContainer].indexOf(activeItemId)
      const overIndex = columnItems[overContainer].indexOf(overId)

      if (activeIndex !== overIndex) {
        const moved = arrayMove(columnItems[overContainer], activeIndex, overIndex)
        setColumnItems((prev) => ({ ...prev, [overContainer]: moved }))
        if (currentContainer === overContainer) finalOrder = moved
      }
    }

    // Calculate float position from neighbors
    const itemIndex = finalOrder.indexOf(activeItemId)
    const prevId = itemIndex > 0 ? finalOrder[itemIndex - 1] : null
    const nextId = itemIndex < finalOrder.length - 1 ? finalOrder[itemIndex + 1] : null

    const prevPos = prevId ? (dealsById.get(prevId)?.position ?? 65536) : 0
    const nextPos = nextId ? (dealsById.get(nextId)?.position ?? null) : null

    const newPosition =
      nextPos === null
        ? prevPos + 65536
        : prevPos === 0
          ? nextPos / 2
          : (prevPos + nextPos) / 2

    onReorderDeal(activeItemId, currentContainer, newPosition)
  }

  const dealsById = React.useMemo(
    () => new Map(deals.map((d) => [d.id, d])),
    [deals]
  )

  const dealsByColumn = React.useMemo(() => {
    const map = new Map<string, DealItem[]>()
    for (const [stageId, ids] of Object.entries(columnItems)) {
      map.set(stageId, ids.map((id) => dealsById.get(id)).filter(Boolean) as DealItem[])
    }
    return map
  }, [columnItems, dealsById])

  const activeDeal = activeId ? dealsById.get(activeId) ?? null : null

  const openAddDialog = (afterIndex: number) => {
    setInsertAfterIndex(afterIndex)
    setNewStageName('')
    setNewStageColor(PRESET_COLORS[0])
    setAddDialogOpen(true)
  }

  const handleMoveStageLeft = (stageId: string) => {
    reorderMutation.mutate({ stageId, direction: 'up', columns, organizationId, projectId })
  }

  const handleMoveStageRight = (stageId: string) => {
    reorderMutation.mutate({ stageId, direction: 'down', columns, organizationId, projectId })
  }

  const handleDeleteStage = (stageId: string) => {
    setStageToDelete(stageId)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (stageToDelete) {
      deleteMutation.mutate({ stageId: stageToDelete, organizationId, projectId })
      setDeleteConfirmOpen(false)
      setStageToDelete(null)
    }
  }

  const handleCreateStage = () => {
    if (!newStageName.trim() || createStageMutation.isPending) return
    createStageMutation.mutate(
      { organizationId, projectId, name: newStageName, color: newStageColor, insertAfterIndex, columns },
      {
        onSuccess: () => {
          setAddDialogOpen(false)
          setNewStageName('')
          setNewStageColor(PRESET_COLORS[0])
        },
      }
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className='scrollbar-thin flex h-full w-full flex-1 gap-0 overflow-x-auto px-3 pt-3 pb-3'>
          {columns.map((column, index) => (
            <React.Fragment key={column.id}>
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
                deals={dealsByColumn.get(column.id) ?? []}
                stats={stageStats[column.id]}
                stageIndex={index}
                totalStages={columns.length}
                activeId={activeId}
                onConfigStage={() => onConfigStage?.(column.id)}
                onMoveStageLeft={() => handleMoveStageLeft(column.id)}
                onMoveStageRight={() => handleMoveStageRight(column.id)}
                onCreateStageBefore={() => openAddDialog(index)}
                onDeleteStage={() => handleDeleteStage(column.id)}
              />
            </React.Fragment>
          ))}

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

        <DragOverlay dropAnimation={null}>
          {activeDeal ? (
            <div className='w-[280px] cursor-grabbing'>
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
