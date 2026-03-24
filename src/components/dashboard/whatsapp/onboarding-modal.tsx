'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmbeddedSignupButton } from './embedded-signup-button'
import { EmbeddedSignupButtonSDK } from './embedded-signup-button-sdk'

interface OnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function OnboardingModal({ open, onOpenChange, onSuccess }: OnboardingModalProps) {
  const handleSuccess = () => {
    onSuccess?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp Business</DialogTitle>
          <DialogDescription>
            Escolha o método de conexão. Ambos são seguros e oficiais da Meta.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 md:grid-cols-2">
          {/* Classic flow */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Método Clássico</h3>
            <EmbeddedSignupButton onSuccess={handleSuccess} />
            <p className="text-xs text-muted-foreground">
              Redirecionamento OAuth padrão. Pode importar múltiplos números se você tiver várias contas.
            </p>
          </div>

          {/* SDK flow */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Novo: QR Code (SDK)</h3>
            <EmbeddedSignupButtonSDK onSuccess={handleSuccess} />
            <p className="text-xs text-muted-foreground">
              Embedded signup com popup modal. Importa apenas o número do QR Code lido (recomendado para
              coexistência).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
