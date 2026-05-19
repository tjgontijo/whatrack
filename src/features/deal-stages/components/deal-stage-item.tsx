'use client'

import { GripVertical, Megaphone, Pencil, Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from '@/features/dashboard/components/crud/delete-confirm-dialog'
import { cn } from '@/lib/utils/utils'
import type { DealStage } from '../types'

interface DealStageItemProps {
  stage: DealStage
  onEdit: (stage: DealStage) => void
  onDelete: (stage: DealStage) => void
}

export function DealStageItem({ stage, onEdit, onDelete }: DealStageItemProps) {
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
      className='group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20 hover:bg-muted/30 hover:shadow-sm'
    >
      <button
        type='button'
        {...attributes}
        {...listeners}
        className='cursor-grab text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing'
      >
        <GripVertical className='h-4 w-4' />
      </button>

      <span className='h-3.5 w-3.5 shrink-0 rounded-full border border-black/5 shadow-inner' style={{ backgroundColor: stage.color }} />

      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='truncate font-semibold text-sm tracking-tight'>{stage.name}</span>
          <Badge 
            variant='outline' 
            className={cn(
              'px-1.5 py-0 text-[9px] uppercase tracking-wider font-bold',
              stage.statusGroup === 'WON' && 'border-green-200 bg-green-50 text-green-700',
              stage.statusGroup === 'LOST' && 'border-red-200 bg-red-50 text-red-700',
              stage.statusGroup === 'ACTIVE' && 'border-blue-200 bg-blue-50 text-blue-700',
            )}
          >
            {stage.statusGroup}
          </Badge>
          {stage.isDefault && (
            <Badge variant='secondary' className='px-1.5 py-0 text-[10px] bg-muted text-muted-foreground'>
              Padrão
            </Badge>
          )}
        </div>
        <div className='mt-1 flex items-center gap-3'>
          <p className='text-[11px] text-muted-foreground font-medium'>
            {stage.dealsCount} deal{stage.dealsCount !== 1 ? 's' : ''}
          </p>
          {stage.metaRules.length > 0 && (
            <div className='flex items-center gap-1.5 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/50'>
              <Megaphone className='h-2.5 w-2.5' />
              {stage.metaRules.length} automação{stage.metaRules.length > 1 ? 'es' : ''}
            </div>
          )}
        </div>
      </div>

      <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-8 w-8 rounded-full'
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
              className='h-8 w-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10'
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
