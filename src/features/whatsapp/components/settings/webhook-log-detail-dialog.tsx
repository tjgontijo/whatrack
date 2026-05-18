'use client'

import { Eye, Info, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface WebhookLogDetailDialogProps {
  log: any
}

export function WebhookLogDetailDialog({ log }: WebhookLogDetailDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className='h-7 gap-1.5 px-3 font-bold text-[10px] transition-all hover:bg-primary hover:text-white'
        >
          <Eye className='h-3 w-3' />
          Explorar Dados
        </Button>
      </DialogTrigger>
      <DialogContent className='flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-5xl'>
        <DialogHeader className='p-6 pb-2'>
          <div className='mb-1 flex items-center gap-2'>
            <Badge
              variant='outline'
              className='h-5 border-primary/20 bg-primary/5 font-black text-[10px] text-primary uppercase tracking-tighter'
            >
              {log.eventType}
            </Badge>
            <span className='text-[10px] text-muted-foreground'>
              {new Date(log.createdAt).toLocaleString('pt-BR')}
            </span>
          </div>
          <DialogTitle className='font-bold text-xl tracking-tight'>
            Detalhes do Evento Webhook
          </DialogTitle>
        </DialogHeader>
        <div className='flex-1 overflow-y-auto p-6 pt-2'>
          <div className='overflow-x-auto rounded-xl border bg-muted/30 p-4 font-mono text-xs'>
            <pre className='whitespace-pre-wrap text-foreground/80 leading-relaxed'>
              {JSON.stringify(log.payload, null, 2)}
            </pre>
          </div>
          <div className='mt-4 grid grid-cols-2 gap-4'>
            <div className='flex items-center gap-3 rounded-lg border bg-background p-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary'>
                <Info className='h-4 w-4' />
              </div>
              <div>
                <p className='mb-1 font-bold text-[10px] text-muted-foreground uppercase leading-none tracking-widest'>
                  ID do Log
                </p>
                <p className='max-w-[150px] truncate font-mono text-xs'>{log.id}</p>
              </div>
            </div>
            <div className='flex items-center gap-3 rounded-lg border bg-background p-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600'>
                <MessageSquare className='h-4 w-4' />
              </div>
              <div>
                <p className='mb-1 font-bold text-[10px] text-muted-foreground uppercase leading-none tracking-widest'>
                  Origem
                </p>
                <p className='font-medium text-xs'>WhatsApp Cloud API</p>
              </div>
            </div>
          </div>
        </div>
        <div className='flex justify-end gap-2 border-t bg-muted/20 p-4'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 px-4 font-bold text-[10px]'
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2))
              toast.success('JSON copiado para a área de transferência!')
            }}
          >
            Copiar JSON
          </Button>
          <DialogTrigger asChild>
            <Button size='sm' className='h-8 px-6 font-black text-[10px]'>
              Fechar
            </Button>
          </DialogTrigger>
        </div>
      </DialogContent>
    </Dialog>
  )
}
