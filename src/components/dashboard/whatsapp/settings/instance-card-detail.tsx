'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Send, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { whatsappApi } from '@/lib/whatsapp/client'
import type { WhatsAppPhoneNumber, WhatsAppBusinessProfile } from '@/types/whatsapp/whatsapp'

interface InstanceCardDetailProps {
  phone: WhatsAppPhoneNumber
  onSendTestClick?: (phone: WhatsAppPhoneNumber) => void
}

const STATUS_BADGE_CONFIG = {
  CONNECTED: { color: 'bg-green-100 text-green-800', label: 'Conectado', icon: '●' },
  DISCONNECTED: { color: 'bg-red-100 text-red-800', label: 'Desconectado', icon: '●' },
  FLAGGED: { color: 'bg-orange-100 text-orange-800', label: 'Sinalizado', icon: '●' },
  PENDING: { color: 'bg-gray-100 text-gray-800', label: 'Pendente', icon: '●' },
  RESTRICTED: { color: 'bg-red-100 text-red-800', label: 'Restrito', icon: '●' },
}

const QUALITY_BADGE_CONFIG = {
  GREEN: { color: 'bg-green-100 text-green-800', label: 'Alta Qualidade', icon: '⚡' },
  YELLOW: { color: 'bg-yellow-100 text-yellow-800', label: 'Qualidade Média', icon: '⚡' },
  RED: { color: 'bg-red-100 text-red-800', label: 'Qualidade Baixa', icon: '⚡' },
  UNKNOWN: { color: '', label: '', icon: '' },
}

export function InstanceCardDetail({ phone, onSendTestClick }: InstanceCardDetailProps) {
  const { organizationId } = useRequiredProjectRouteContext()

  // Fetch business profile for this specific phone
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['whatsapp', 'phone-profile', phone.id],
    queryFn: async () => {
      return await whatsappApi.getPhoneProfile(phone.id, organizationId)
    },
  })

  const status = (phone.status?.toUpperCase() || 'PENDING') as keyof typeof STATUS_BADGE_CONFIG
  const statusConfig = STATUS_BADGE_CONFIG[status]
  const qualityConfig = QUALITY_BADGE_CONFIG[phone.quality_rating || 'UNKNOWN']

  const showStatusAlert =
    status !== 'CONNECTED' && status !== 'DISCONNECTED' && status !== 'RESTRICTED'

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Header with phone info */}
      <div className="border-b p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Flag emoji for country - could be enhanced later */}
            <span className="text-2xl">🌐</span>
            <div className="flex-1">
              <div className="font-semibold text-lg">{phone.display_phone_number}</div>
              {phone.verified_name && (
                <div className="text-sm text-muted-foreground">{phone.verified_name}</div>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSendTestClick?.(phone)}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            Enviar Teste
          </Button>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className={`${statusConfig.color}`}>
            {statusConfig.icon} {statusConfig.label}
          </Badge>

          {qualityConfig.label && (
            <Badge variant="secondary" className={`${qualityConfig.color}`}>
              {qualityConfig.icon} {qualityConfig.label}
            </Badge>
          )}

          {phone.account_mode === 'SANDBOX' && (
            <Badge variant="outline" className="border-orange-200 text-orange-700">
              SANDBOX
            </Badge>
          )}
        </div>

        {/* Phone ID and WABA ID */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            <span className="font-medium">Phone ID:</span> {phone.id}
          </div>
          {phone.webhook_configuration?.whatsapp_business_account && (
            <div>
              <span className="font-medium">WABA ID:</span> {phone.webhook_configuration.whatsapp_business_account}
            </div>
          )}
        </div>
      </div>

      {/* Status alert if needed */}
      {showStatusAlert && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-sm text-yellow-900">Ação Requerida</div>
            <div className="text-sm text-yellow-800">Ativar Número</div>
          </div>
        </div>
      )}

      {/* Business Profile Section */}
      {!profileLoading && profile ? (
        <div className="border-b p-4 space-y-4">
          <h3 className="font-semibold text-sm uppercase text-muted-foreground">
            Perfil Comercial
          </h3>
          <div className="space-y-3">
            {profile.profile_picture_url && (
              <img
                src={profile.profile_picture_url}
                alt={phone.verified_name}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}

            <div>
              <div className="font-medium">{phone.verified_name}</div>
              {profile.vertical && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {profile.vertical}
                </Badge>
              )}
            </div>

            {profile.about && <div className="text-sm text-muted-foreground">{profile.about}</div>}

            <div className="space-y-2 text-sm">
              {profile.email && (
                <div className="flex gap-2">
                  <span>✉</span>
                  <span>{profile.email}</span>
                </div>
              )}
              {profile.websites && profile.websites.length > 0 && (
                <div className="flex gap-2">
                  <span>🌐</span>
                  <span>{profile.websites[0]}</span>
                </div>
              )}
              {profile.address && (
                <div className="flex gap-2">
                  <span>📍</span>
                  <span>{profile.address}</span>
                </div>
              )}
            </div>

            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
              → Editar no Business Manager
            </Button>
          </div>
        </div>
      ) : null}

      {/* Capacity Section */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-sm uppercase text-muted-foreground">
          Capacidade de Envio
        </h3>
        <div className="text-sm text-muted-foreground">
          Tier Standard · 1.000 msgs/dia · Cloud API · Live
        </div>
      </div>
    </div>
  )
}
