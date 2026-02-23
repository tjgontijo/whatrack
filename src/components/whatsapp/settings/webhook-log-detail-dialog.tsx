'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Eye, Info, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface WebhookLogDetailDialogProps {
    log: any
}

export function WebhookLogDetailDialog({ log }: WebhookLogDetailDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-3 text-[10px] font-bold gap-1.5 hover:bg-primary hover:text-white transition-all">
                    <Eye className="h-3 w-3" />
                    Explorar Dados
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] h-5 font-black uppercase tracking-tighter">
                            {log.eventType}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </span>
                    </div>
                    <DialogTitle className="text-xl font-bold tracking-tight">Detalhes do Evento Webhook</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 pt-2">
                    <div className="bg-muted/30 p-4 rounded-xl border font-mono text-xs overflow-x-auto">
                        <pre className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                            {JSON.stringify(log.payload, null, 2)}
                        </pre>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg border bg-background flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Info className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">ID do Log</p>
                                <p className="text-xs font-mono truncate max-w-[150px]">{log.id}</p>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border bg-background flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                                <MessageSquare className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Origem</p>
                                <p className="text-xs font-medium">WhatsApp Cloud API</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-muted/20 border-t flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold px-4" onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2))
                        toast.success("JSON copiado para a área de transferência!")
                    }}>
                        Copiar JSON
                    </Button>
                    <DialogTrigger asChild>
                        <Button size="sm" className="h-8 text-[10px] font-black px-6">Fechar</Button>
                    </DialogTrigger>
                </div>
            </DialogContent>
        </Dialog>
    )
}
