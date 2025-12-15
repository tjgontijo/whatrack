'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import type { LimitableResource } from '@/services/billing'

interface UpgradePromptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: LimitableResource
  currentUsage: number
  limit: number
}

const resourceLabels: Record<LimitableResource, string> = {
  metaProfiles: 'perfis Meta Ads',
  metaAdAccounts: 'contas de anúncio',
  whatsappInstances: 'instâncias WhatsApp',
  members: 'membros da equipe',
}

export function UpgradePromptModal({
  open,
  onOpenChange,
  resource,
  currentUsage,
  limit,
}: UpgradePromptModalProps) {
  const router = useRouter()
  const resourceLabel = resourceLabels[resource]

  const handleUpgrade = () => {
    onOpenChange(false)
    router.push('/pricing')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Limite Atingido</DialogTitle>
          <DialogDescription className="text-center">
            Você atingiu o limite de {resourceLabel} do seu plano atual ({currentUsage}/{limit}).
            <br />
            Faça upgrade para adicionar mais.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleUpgrade} className="w-full">
            Ver Planos
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
