'use client'

import { ExternalLink, Loader2, MessageCircle } from 'lucide-react'
import { EmptyState } from '@/components/dashboard/states/empty-state'
import { Button } from '@/components/ui/button'
import { InstanceCardDetail, type WhatsAppInstance } from './instance-card-detail'

interface AccountTabProps {
  instance: WhatsAppInstance | null
  isLoading?: boolean
  isConnecting?: boolean
  canStartOnboarding?: boolean
  onConnectClick?: () => void | Promise<void>
  onSendTestClick?: (instance: WhatsAppInstance) => void
  onDisconnectClick?: () => void | Promise<void>
}

export function AccountTab({
  instance,
  isLoading = false,
  isConnecting = false,
  canStartOnboarding = false,
  onConnectClick,
  onSendTestClick,
  onDisconnectClick,
}: AccountTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!instance) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Nenhum número conectado"
        description="Conecte um número WhatsApp Business para começar a enviar mensagens."
        action={
          <Button
            type="button"
            className="gap-2"
            onClick={() => {
              void onConnectClick?.()
            }}
            disabled={!canStartOnboarding || isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Conectar WhatsApp
          </Button>
        }
      />
    )
  }

  return (
    <InstanceCardDetail instance={instance} onSendTestClick={onSendTestClick} onDisconnectClick={onDisconnectClick} />
  )
}
