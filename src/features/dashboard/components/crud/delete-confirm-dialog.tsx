'use client'

import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import type React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/utils'

interface DeleteConfirmDialogProps {
  onConfirm: () => void
  title?: string
  description?: string
  trigger?: React.ReactNode
  isLoading?: boolean
  variant?: 'default' | 'destructive' | 'ghost'
  buttonText?: string
  confirmText?: string
  cancelText?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DeleteConfirmDialog({
  onConfirm,
  title = 'Tem certeza?',
  description = 'Esta ação não pode ser desfeita. Isso excluirá permanentemente o item de nossos servidores.',
  trigger,
  isLoading = false,
  variant = 'destructive',
  buttonText = 'Excluir',
  confirmText = 'Confirmar Exclusão',
  cancelText = 'Cancelar',
  open,
  onOpenChange,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger !== null && (
        <AlertDialogTrigger asChild>
          {trigger || (
            <Button variant={variant} size='sm' className='gap-2'>
              <Trash2 className='h-4 w-4' />
              {buttonText}
            </Button>
          )}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent className='!max-w-[600px] overflow-hidden border-none p-0 shadow-2xl'>
        <div className='flex items-center gap-4 border-destructive/10 border-b bg-destructive/10 p-6'>
          <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/20'>
            <AlertTriangle className='h-6 w-6 text-destructive' />
          </div>
          <div>
            <AlertDialogTitle className='font-bold text-destructive text-xl'>
              {title}
            </AlertDialogTitle>
            <p className='mt-0.5 font-bold text-destructive/60 text-xs uppercase tracking-widest'>
              Confirmação Crítica
            </p>
          </div>
        </div>

        <div className='p-6'>
          <AlertDialogDescription className='text-muted-foreground text-sm leading-relaxed'>
            {description}
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter className='flex-col gap-3 bg-muted/30 p-6 sm:flex-row'>
          <AlertDialogCancel className='h-11 w-full rounded-xl border-muted-foreground/20 font-bold transition-all hover:bg-muted sm:w-auto'>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isLoading}
            className={cn(
              'h-11 w-full rounded-xl font-bold shadow-lg transition-all sm:w-auto',
              variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground shadow-destructive/20 hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Processando...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
