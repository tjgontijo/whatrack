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
import { cn } from '@/lib/utils'
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="relative group/card"
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover/card:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="pl-5">
        {renderCard(item, isDragging)}
      </div>
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
    <div className="flex flex-col w-[300px] shrink-0 h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: column.color }}
          />
          <span className="text-sm font-semibold text-foreground truncate">{column.name}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 min-w-[20px] text-center">
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
            'flex-1 flex flex-col gap-2 px-1 pb-4 overflow-y-auto scrollbar-thin min-h-[80px] rounded-xl transition-colors',
            isOver && activeId && !itemIds.includes(activeId) && 'bg-muted/30 ring-1 ring-border ring-inset'
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
            <div className="flex-1 flex items-center justify-center min-h-[60px]">
              <p className="text-xs text-muted-foreground/50 text-center">Vazio</p>
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
      <div className="flex gap-3 h-full overflow-x-auto px-6 py-4 pb-6 scrollbar-thin">
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
          <div className="opacity-95 rotate-1 shadow-2xl">
            {renderCard(activeItem, true)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
