'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { authClient } from '@/lib/auth/auth-client'

type ConnectInstanceDialogProps = {
    instanceId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onConnected: () => void
}

export function ConnectInstanceDialog({
    instanceId,
    open,
    onOpenChange,
    onConnected,
}: ConnectInstanceDialogProps) {
    const { data: activeOrg } = authClient.useActiveOrganization()
    const organizationId = activeOrg?.id
    const [qrcode, setQrcode] = useState<string | null>(null)
    const [paircode, setPaircode] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const [canPollStatus, setCanPollStatus] = useState(false)

    const fetchQrcode = useCallback(async () => {
        if (!organizationId) return

        setIsLoading(true)
        setCanPollStatus(false)
        try {
            const response = await fetch(`/api/v1/whatsapp/w/instances/${instanceId}/connect`, {
                method: 'POST',
                headers: {
                    [ORGANIZATION_HEADER]: organizationId,
                },
            })

            if (!response.ok) throw new Error('Falha ao gerar QR Code')

            const data = await response.json()
            // API retorna 'qr' e 'pairCode' (não 'qrcode' e 'paircode')
            setQrcode(data.qr || null)
            setPaircode(data.pairCode || null)
            setCanPollStatus(true)
        } catch {
            toast.error('Erro ao gerar QR Code')
            setCanPollStatus(false)
        } finally {
            setIsLoading(false)
        }
    }, [instanceId, organizationId])

    // Polling para detectar quando o usuário conectar
    useEffect(() => {
        if (!open || !organizationId || isConnected || !canPollStatus) return

        const checkStatus = async () => {
            try {
                const response = await fetch(`/api/v1/whatsapp/w/instances/${instanceId}/status`, {
                    headers: {
                        [ORGANIZATION_HEADER]: organizationId,
                    },
                })

                if (response.ok) {
                    const data = await response.json()
                    // Verificar se conectou
                    // WuzAPI: loggedIn=true means fully connected
                    const connected =
                        data.status === 'connected' ||
                        data.status === 'open' ||
                        data.loggedIn === true


                    if (connected) {
                        setIsConnected(true)
                        toast.success('WhatsApp conectado com sucesso!')

                        // Aguardar 1 segundo para o usuário ver a mensagem
                        setTimeout(() => {
                            onConnected()
                            onOpenChange(false)
                        }, 1500)
                    }
                }
            } catch (error) {
                console.error('Erro ao verificar status:', error)
            }
        }

        // Verificar status a cada 3 segundos
        const interval = setInterval(checkStatus, 3000)

        // Verificar imediatamente também
        checkStatus()

        return () => clearInterval(interval)
    }, [open, instanceId, organizationId, isConnected, canPollStatus, onConnected, onOpenChange])

    useEffect(() => {
        if (open) {
            setIsConnected(false)
            fetchQrcode()
        } else {
            setQrcode(null)
            setPaircode(null)
            setIsConnected(false)
            setCanPollStatus(false)
        }
    }, [open, fetchQrcode])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Conectar WhatsApp</DialogTitle>
                    <DialogDescription>
                        {isConnected
                            ? 'WhatsApp conectado com sucesso!'
                            : 'Escaneie o QR Code abaixo com o seu WhatsApp para conectar.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-6 space-y-4">
                    {isConnected ? (
                        <div className="flex flex-col items-center gap-4 text-green-600">
                            <CheckCircle2 className="h-16 w-16" />
                            <p className="text-lg font-medium">Conectado!</p>
                        </div>
                    ) : isLoading ? (
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                            <div className="h-64 w-64 rounded-lg bg-muted animate-pulse" />
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <p>Gerando QR Code...</p>
                            </div>
                        </div>
                    ) : qrcode ? (
                        <>
                            <div className="relative bg-white p-2 rounded-lg border shadow-sm">
                                <Image
                                    src={qrcode}
                                    alt="QR Code"
                                    width={256}
                                    height={256}
                                    className="h-64 w-64 object-contain"
                                    unoptimized
                                />
                            </div>

                            {paircode && (
                                <div className="text-center space-y-1">
                                    <p className="text-sm text-muted-foreground">Código de pareamento:</p>
                                    <code className="bg-muted px-2 py-1 rounded text-lg font-mono font-bold tracking-wider">
                                        {paircode}
                                    </code>
                                </div>
                            )}

                            <div className="text-center space-y-1">
                                <p className="text-xs text-muted-foreground animate-pulse">
                                    Aguardando conexão...
                                </p>
                            </div>

                            <Button variant="ghost" size="sm" onClick={fetchQrcode} className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Gerar novo código
                            </Button>
                        </>
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <p>Não foi possível carregar o QR Code.</p>
                            <Button variant="link" onClick={fetchQrcode}>
                                Tentar novamente
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
