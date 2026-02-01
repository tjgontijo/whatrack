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
import { cn } from '@/lib/utils'

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
    onOpenChange
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
            <AlertDialogContent className="!max-w-[600px] p-0 overflow-hidden border-none shadow-2xl">
                <div className="bg-destructive/10 p-6 flex items-center gap-4 border-b border-destructive/10">
                    <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                        <AlertDialogTitle className="text-xl font-bold text-destructive">
                            {title}
                        </AlertDialogTitle>
                        <p className="text-xs font-bold uppercase tracking-widest text-destructive/60 mt-0.5">
                            Confirmação Crítica
                        </p>
                    </div>
                </div>

                <div className="p-6">
                    <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
                        {description}
                    </AlertDialogDescription>
                </div>

                <AlertDialogFooter className="p-6 bg-muted/30 gap-3 flex-col sm:flex-row">
                    <AlertDialogCancel className="h-11 font-bold rounded-xl border-muted-foreground/20 hover:bg-muted transition-all w-full sm:w-auto">
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault()
                            onConfirm()
                        }}
                        disabled={isLoading}
                        className={cn(
                            "h-11 font-bold rounded-xl shadow-lg transition-all w-full sm:w-auto",
                            variant === 'destructive'
                                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/20"
                                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
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
