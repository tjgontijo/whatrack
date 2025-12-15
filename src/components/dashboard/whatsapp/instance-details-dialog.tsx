'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
    Loader2,
    Trash2,
    LogOut,
    QrCode
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { authClient } from '@/lib/auth/auth-client'
import { formatWhatsAppWithFlag } from '@/lib/mask/phone-mask'

import { ConnectInstanceDialog } from './connect-instance-dialog'
import type { WhatsappInstance } from '@/lib/schema/whatsapp'

type InstanceDetailsDialogProps = {
    instance: WhatsappInstance
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: () => void
}

export function InstanceDetailsDialog({
    instance,
    open,
    onOpenChange,
    onUpdate
}: InstanceDetailsDialogProps) {
    const { data: activeOrg } = authClient.useActiveOrganization()
    const organizationId = activeOrg?.id
    const [isConnectOpen, setIsConnectOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const instanceKey = instance.instanceId ?? instance.id
    const instanceLabel = instance.label || instanceKey || 'Instância'

    const handleLogout = async () => {
        if (!organizationId) return
        setIsLoading(true)
        try {
            const response = await fetch(`/api/v1/whatsapp/w/instances/${instanceKey}/logout`, {
                method: 'POST',
                headers: { [ORGANIZATION_HEADER]: organizationId },
            })
            if (!response.ok) throw new Error('Falha ao desconectar')
            toast.success('Instância desconectada')
            onUpdate()
            onOpenChange(false)
        } catch {
            toast.error('Erro ao desconectar')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!organizationId) return
        setIsLoading(true)
        try {
            const response = await fetch(`/api/v1/whatsapp/w/instances/${instanceKey}`, {
                method: 'DELETE',
                headers: { [ORGANIZATION_HEADER]: organizationId },
            })
            if (!response.ok) throw new Error('Falha ao deletar')
            toast.success('Instância removida')
            onUpdate()
            onOpenChange(false)
        } catch {
            toast.error('Erro ao deletar')
        } finally {
            setIsLoading(false)
            setIsDeleteDialogOpen(false)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">
                            {instance.phone ? formatWhatsAppWithFlag(instance.phone) : 'Sem número'}
                        </DialogTitle>
                        <DialogDescription>
                            {instanceLabel}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-2">
                        {/* Status */}
                        <div className="flex items-center gap-3">
                            {instance.status === 'connected' || instance.status === 'open' ? (
                                <>
                                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                    <span className="text-sm text-muted-foreground">Conectado e pronto para uso</span>
                                </>
                            ) : instance.status === 'waiting_qr' ? (
                                <>
                                    <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="text-sm text-muted-foreground">Aguardando escaneamento do QR Code</span>
                                </>
                            ) : (
                                <>
                                    <span className="flex h-2.5 w-2.5 rounded-full bg-zinc-400" />
                                    <span className="text-sm text-muted-foreground">Desconectado</span>
                                </>
                            )}
                        </div>

                        <Separator />

                        {/* Actions Section */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium">Ações</h4>

                            <div className="grid gap-2">
                                {instance.status === 'connected' || instance.status === 'open' ? (
                                    <Button variant="outline" className="justify-start text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={handleLogout} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                                        Desconectar
                                    </Button>
                                ) : (
                                    <Button variant="outline" className="justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => setIsConnectOpen(true)}>
                                        <QrCode className="mr-2 h-4 w-4" />
                                        Conectar (QR Code)
                                    </Button>
                                )}

                                <Button variant="outline" className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setIsDeleteDialogOpen(true)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Apagar Instância
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <ConnectInstanceDialog
                instanceId={instanceKey}
                open={isConnectOpen}
                onOpenChange={setIsConnectOpen}
                onConnected={onUpdate}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a instância e desconectará o número do WhatsApp.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sim, apagar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
