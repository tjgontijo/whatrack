'use client'

import { useQuery } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { whatsappApi } from '@/lib/whatsapp/client'
import { ORGANIZATION_HEADER } from '@/lib/constants/http-headers'
import { EmptyState } from '@/components/dashboard/states/empty-state'
import { Button } from '@/components/ui/button'
import { InstanceCardDetail } from './instance-card-detail'
import type { WhatsAppPhoneNumber } from '@/types/whatsapp/whatsapp'

interface AccountTabProps {
  onSendTestClick?: (phone: WhatsAppPhoneNumber) => void
}

export function AccountTab({ onSendTestClick }: AccountTabProps) {
  const { organizationId, projectId } = useRequiredProjectRouteContext()

  // Fetch instances for this project
  const { data: instancesResponse, isLoading, error } = useQuery({
    queryKey: ['whatsapp', 'instances', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/whatsapp/instances?projectId=${projectId}`, {
        headers: { [ORGANIZATION_HEADER]: organizationId },
      })
      if (!res.ok) throw new Error('Failed to fetch instances')
      return res.json()
    },
  })

  const instances = instancesResponse?.items || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (instances.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Nenhum número conectado"
        description="Conecte um número WhatsApp Business para começar."
        action={
          <Button
            onClick={() => {
              // TODO: Open Meta Embedded Signup onboarding
            }}
          >
            Conectar WhatsApp
          </Button>
        }
      />
    )
  }

  // Get the first (and usually only) instance for the project
  const instance = instances[0] as WhatsAppPhoneNumber

  return (
    <div className="space-y-6">
      <InstanceCardDetail phone={instance} onSendTestClick={onSendTestClick} />
    </div>
  )
}
