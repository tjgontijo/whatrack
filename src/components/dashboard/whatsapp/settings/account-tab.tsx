'use client'

import { useQuery } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { ORGANIZATION_HEADER } from '@/lib/constants/http-headers'
import { EmptyState } from '@/components/dashboard/states/empty-state'
import { Button } from '@/components/ui/button'
import { InstanceCardDetail, type WhatsAppInstance } from './instance-card-detail'

interface AccountTabProps {
  onSendTestClick?: (instance: WhatsAppInstance) => void
}

export function AccountTab({ onSendTestClick }: AccountTabProps) {
  const { organizationId, projectId } = useRequiredProjectRouteContext()

  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp', 'instances', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/whatsapp/instances?projectId=${projectId}`, {
        headers: { [ORGANIZATION_HEADER]: organizationId },
      })
      if (!res.ok) throw new Error('Failed to fetch instances')
      return res.json() as Promise<{ items: WhatsAppInstance[] }>
    },
  })

  const instance = data?.items?.[0]

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
          <Button onClick={() => { /* TODO: startOnboarding */ }}>
            Conectar WhatsApp
          </Button>
        }
      />
    )
  }

  return (
    <InstanceCardDetail instance={instance} onSendTestClick={onSendTestClick} />
  )
}
