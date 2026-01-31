'use client'

import * as React from 'react'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DataTableCard,
  DataTableCardHeader,
  DataTableCardTitle,
  DataTableCardMeta,
  DataTableCardContent,
  DataTableCardRow,
  DataTableCardFooter,
} from './data-table-card'
import { PhoneWithWhatsApp } from './phone-with-whatsapp'
import { formatDateTime } from '@/lib/mask/formatters'
import { cn } from '@/lib/utils'

interface TicketCardProps {
  id: string
  createdAt: string
  stage?: { id: string; name: string; color: string } | null
  pipefyId: string | null
  pipefyUrl: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  leadId: string | null
  leadName: string | null
  leadPhone: string | null
  leadInstagram: string | null
  leadMail: string | null
  onViewLead?: (leadId: string) => void
  className?: string
}

/**
 * TicketCard - Mobile card view for a ticket
 *
 * Features:
 * - Created date and status badge
 * - Lead information with WhatsApp
 * - Email and Instagram links
 * - UTM parameters
 * - Pipefy link
 * - View Lead button
 */
export const TicketCard = React.memo(
  React.forwardRef<HTMLDivElement, TicketCardProps>(
    (
      {
        id,
        createdAt,
        stage,
        pipefyId,
        pipefyUrl,
        utmSource,
        utmMedium,
        utmCampaign,
        leadId,
        leadName,
        leadPhone,
        leadInstagram,
        leadMail,
        onViewLead,
        className,
      },
      ref
    ) => {
      const formattedDate = formatDateTime(createdAt)

      return (
        <DataTableCard ref={ref} className={className}>
          <DataTableCardHeader>
            <DataTableCardTitle className="text-base">{formattedDate}</DataTableCardTitle>
            {stage && (
              <DataTableCardMeta>
                <Badge variant="secondary" className="text-xs" style={{ backgroundColor: stage.color, color: 'white' }}>
                  {stage.name}
                </Badge>
              </DataTableCardMeta>
            )}
          </DataTableCardHeader>

          <DataTableCardContent>
            {/* Lead Info */}
            {leadName && (
              <>
                <DataTableCardRow label="Lead">{leadName}</DataTableCardRow>
                {leadPhone && (
                  <DataTableCardRow label="Telefone">
                    <PhoneWithWhatsApp phone={leadPhone} />
                  </DataTableCardRow>
                )}
              </>
            )}

            {/* Email */}
            {leadMail && (
              <DataTableCardRow label="Email">
                <a
                  href={`mailto:${leadMail}`}
                  className="text-sm text-blue-600 hover:underline"
                  aria-label={`Enviar email para ${leadMail}`}
                >
                  {leadMail}
                </a>
              </DataTableCardRow>
            )}

            {/* Instagram */}
            {leadInstagram && (
              <DataTableCardRow label="Instagram">
                <a
                  href={`https://instagram.com/${leadInstagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-pink-600 hover:underline"
                  aria-label={`Ver perfil do Instagram @${leadInstagram}`}
                >
                  @{leadInstagram}
                </a>
              </DataTableCardRow>
            )}

            {/* UTM Parameters */}
            {(utmSource || utmMedium || utmCampaign) && (
              <div className="mt-3 space-y-2 border-t pt-3">
                {utmSource && (
                  <DataTableCardRow label="UTM Source">
                    <span className="text-xs text-muted-foreground">{utmSource}</span>
                  </DataTableCardRow>
                )}
                {utmMedium && (
                  <DataTableCardRow label="UTM Medium">
                    <span className="text-xs text-muted-foreground">{utmMedium}</span>
                  </DataTableCardRow>
                )}
                {utmCampaign && (
                  <DataTableCardRow label="UTM Campaign">
                    <span className="text-xs text-muted-foreground">{utmCampaign}</span>
                  </DataTableCardRow>
                )}
              </div>
            )}

            {/* Pipefy Link */}
            {pipefyId && (
              <DataTableCardRow label="Pipefy">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">#{pipefyId}</span>
                  {pipefyUrl && (
                    <a
                      href={pipefyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-transparent text-muted-foreground transition hover:border-muted-foreground/20 hover:bg-muted"
                      aria-label="Abrir no Pipefy"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </DataTableCardRow>
            )}
          </DataTableCardContent>

          {leadId && onViewLead && (
            <DataTableCardFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewLead(leadId)}
                className="w-full"
              >
                Ver Lead
              </Button>
            </DataTableCardFooter>
          )}
        </DataTableCard>
      )
    }
  )
)

TicketCard.displayName = 'TicketCard'
