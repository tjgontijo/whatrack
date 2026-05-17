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
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-primary h-7 gap-1.5 px-3 text-[10px] font-bold transition-all hover:text-white"
        >
          <Eye className="h-3 w-3" />
          Explorar Dados
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="p-6 pb-2">
          <div className="mb-1 flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 h-5 text-[10px] font-black uppercase tracking-tighter"
            >
              {log.eventType}
            </Badge>
            <span className="text-muted-foreground text-[10px]">
              {new Date(log.createdAt).toLocaleString('pt-BR')}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Detalhes do Evento Webhook
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 pt-2">
          <div className="bg-muted/30 overflow-x-auto rounded-xl border p-4 font-mono text-xs">
            <pre className="text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(log.payload, null, 2)}
            </pre>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-background flex items-center gap-3 rounded-lg border p-3">
              <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] font-bold uppercase leading-none tracking-widest">
                  ID do Log
                </p>
                <p className="max-w-[150px] truncate font-mono text-xs">{log.id}</p>
              </div>
            </div>
            <div className="bg-background flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] font-bold uppercase leading-none tracking-widest">
                  Origem
                </p>
                <p className="text-xs font-medium">WhatsApp Cloud API</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-muted/20 flex justify-end gap-2 border-t p-4">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-4 text-[10px] font-bold"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2))
              toast.success('JSON copiado para a área de transferência!')
            }}
          >
            Copiar JSON
          </Button>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 px-6 text-[10px] font-black">
              Fechar
            </Button>
          </DialogTrigger>
        </div>
      </DialogContent>
    </Dialog>
  )
}
