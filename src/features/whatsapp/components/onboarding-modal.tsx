'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface WhatsAppOnboardingModalProps {
  open: boolean
  iframeUrl: string | null
  onOpenChange: (open: boolean) => void
}

export function WhatsAppOnboardingModal({
  open,
  iframeUrl,
  onOpenChange,
}: WhatsAppOnboardingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[90vh] max-w-2xl flex-col p-0'>
        <DialogHeader className='border-b px-6 py-4'>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Escaneie o código QR para conectar sua conta WhatsApp Business
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-hidden'>
          {iframeUrl ? (
            <iframe
              src={iframeUrl}
              className='h-full w-full border-0'
              title='WhatsApp Onboarding'
              sandbox='allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-scripts'
            />
          ) : (
            <div className='flex h-full items-center justify-center'>
              <p className='text-muted-foreground'>Carregando...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
