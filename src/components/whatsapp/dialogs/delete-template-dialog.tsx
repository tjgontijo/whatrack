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
} from '@/components/ui/alert-dialog'
import { whatsappApi } from '@/lib/whatsapp/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface DeleteTemplateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    templateName: string | null
    onSuccess?: () => void
}

export function DeleteTemplateDialog({
    open,
    onOpenChange,
    templateName,
    onSuccess
}: DeleteTemplateDialogProps) {
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: (name: string) => whatsappApi.deleteTemplate(name),
        onSuccess: () => {
            toast.success('Template excluído com sucesso')
            queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates'] })
            if (onSuccess) onSuccess()
            onOpenChange(false)
        },
        onError: (error: any) => {
            toast.error(`Erro ao excluir template: ${error.message}`)
        }
    })

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Template?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja excluir o template <strong>{templateName}</strong>?
                        Esta ação não pode ser desfeita e ele será removido permanentemente da Meta.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={(e) => {
                            e.preventDefault()
                            if (templateName) mutation.mutate(templateName)
                        }}
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? 'Excluindo...' : 'Sim, excluir'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
