'use client'

import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
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
            <Button variant={variant} size="sm" className="gap-2">
              <Trash2 className="h-4 w-4" />
              {buttonText}
            </Button>
          )}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent className="!max-w-[600px] overflow-hidden border-none p-0 shadow-2xl">
        <div className="bg-destructive/10 border-destructive/10 flex items-center gap-4 border-b p-6">
          <div className="bg-destructive/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
            <AlertTriangle className="text-destructive h-6 w-6" />
          </div>
          <div>
            <AlertDialogTitle className="text-destructive text-xl font-bold">
              {title}
            </AlertDialogTitle>
            <p className="text-destructive/60 mt-0.5 text-xs font-bold uppercase tracking-widest">
              Confirmação Crítica
            </p>
          </div>
        </div>

        <div className="p-6">
          <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter className="bg-muted/30 flex-col gap-3 p-6 sm:flex-row">
          <AlertDialogCancel className="border-muted-foreground/20 hover:bg-muted h-11 w-full rounded-xl font-bold transition-all sm:w-auto">
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
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/20'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
