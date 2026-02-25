'use client'

import React, { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCorners,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils/utils'
import { KanbanColumn } from './types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface CrudKanbanViewProps<T> {
  columns: KanbanColumn[]
  items: T[]
  getItemId: (item: T) => string
  getColumnId: (item: T) => string
  renderCard: (item: T, isDragging?: boolean) => React.ReactNode
  onMoveItem?: (itemId: string, toColumnId: string) => Promise<void> | void
  onAddItem?: (columnId: string) => void
  isLoading?: boolean
}

interface SortableCardProps<T> {
  item: T
  getItemId: (item: T) => string
  renderCard: (item: T, isDragging?: boolean) => React.ReactNode
}

function SortableCard<T>({ item, getItemId, renderCard }: SortableCardProps<T>) {
  const id = getItemId(item)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="group/card relative"
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 z-10 -translate-y-1/2 cursor-grab opacity-0 transition-opacity active:cursor-grabbing group-hover/card:opacity-100"
      >
        <GripVertical className="text-muted-foreground h-4 w-4" />
      </div>
      <div className="pl-5">{renderCard(item, isDragging)}</div>
    </div>
  )
}

interface KanbanColumnProps<T> {
  column: KanbanColumn
  items: T[]
  getItemId: (item: T) => string
  renderCard: (item: T, isDragging?: boolean) => React.ReactNode
  onAddItem?: (columnId: string) => void
  activeId: string | null
}

function KanbanColumnComponent<T>({
  column,
  items,
  getItemId,
  renderCard,
  onAddItem,
  activeId,
}: KanbanColumnProps<T>) {
  const itemIds = items.map(getItemId)
  const isOver = activeId !== null

  return (
    <div className="bg-muted/20 dark:bg-muted/10 border-border/40 flex h-full w-[320px] shrink-0 flex-col rounded-2xl border p-2 shadow-sm">
      {/* Column Header */}
      <div className="mb-3 flex shrink-0 items-center justify-between bg-transparent px-3 py-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <span className="text-foreground truncate text-sm font-semibold">{column.name}</span>
          <Badge variant="secondary" className="min-w-[20px] px-1.5 py-0 text-center text-[10px]">
            {items.length}
          </Badge>
        </div>
        {onAddItem && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => onAddItem(column.id)}
            title={`Adicionar a ${column.name}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Cards Area */}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          className={cn(
            'scrollbar-thin flex min-h-[80px] flex-1 flex-col gap-3 overflow-y-auto rounded-xl px-1 pb-4 transition-all duration-200',
            isOver &&
              activeId &&
              !itemIds.includes(activeId) &&
              'bg-primary/5 ring-primary/20 ring-1 ring-inset'
          )}
        >
          {items.map((item) => (
            <SortableCard
              key={getItemId(item)}
              item={item}
              getItemId={getItemId}
              renderCard={renderCard}
            />
          ))}

          {items.length === 0 && (
            <div className="flex min-h-[60px] flex-1 items-center justify-center">
              <p className="text-muted-foreground/50 text-center text-xs">Vazio</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export function CrudKanbanView<T>({
  columns,
  items,
  getItemId,
  getColumnId,
  renderCard,
  onMoveItem,
  onAddItem,
}: CrudKanbanViewProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overColumnId, setOverColumnId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const activeItem = activeId ? items.find((item) => getItemId(item) === activeId) : null

  // Group items by column
  const itemsByColumn = React.useMemo(() => {
    const map = new Map<string, T[]>()
    for (const col of columns) map.set(col.id, [])
    for (const item of items) {
      const colId = getColumnId(item)
      const existing = map.get(colId) ?? []
      existing.push(item)
      map.set(colId, existing)
    }
    return map
  }, [columns, items, getColumnId])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setOverColumnId(null)
      return
    }

    // Check if over a column directly
    const overIsColumn = columns.some((col) => col.id === String(over.id))
    if (overIsColumn) {
      setOverColumnId(String(over.id))
      return
    }

    // Find which column the over item belongs to
    const overItem = items.find((item) => getItemId(item) === String(over.id))
    if (overItem) {
      setOverColumnId(getColumnId(overItem))
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverColumnId(null)

    if (!over || !onMoveItem) return

    const activeItemData = items.find((item) => getItemId(item) === String(active.id))
    if (!activeItemData) return

    const fromColumnId = getColumnId(activeItemData)

    // Determine target column
    let toColumnId = overColumnId
    if (!toColumnId) {
      const overIsColumn = columns.some((col) => col.id === String(over.id))
      if (overIsColumn) {
        toColumnId = String(over.id)
      } else {
        const overItem = items.find((item) => getItemId(item) === String(over.id))
        toColumnId = overItem ? getColumnId(overItem) : null
      }
    }

    if (!toColumnId || toColumnId === fromColumnId) return

    await onMoveItem(String(active.id), toColumnId)
  }

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="scrollbar-thin flex h-full gap-3 overflow-x-auto px-6 py-4 pb-6">
        {sortedColumns.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            items={itemsByColumn.get(column.id) ?? []}
            getItemId={getItemId}
            renderCard={renderCard}
            onAddItem={onAddItem}
            activeId={activeId}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeItem ? (
          <div className="ring-primary rotate-2 scale-105 cursor-grabbing rounded-xl opacity-90 shadow-2xl ring-2 ring-offset-1 transition-transform">
            {renderCard(activeItem, true)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
