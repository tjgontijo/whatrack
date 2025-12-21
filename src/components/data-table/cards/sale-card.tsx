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
import { formatCurrencyBRL, formatDateTime } from '@/lib/mask/formatters'
import { cn } from '@/lib/utils'

interface SaleCardProps {
  id: string
  amount: number | null
  serviceCount: number | null
  createdAt: string
  ticketStatus: string | null
  ticketPipefyId: string | null
  ticketPipefyUrl: string | null
  ticketUtmSource: string | null
  ticketUtmMedium: string | null
  ticketUtmCampaign: string | null
  leadId: string | null
  leadName: string | null
  leadPhone: string | null
  onViewLead?: (leadId: string) => void
  className?: string
}

/**
 * SaleCard - Mobile card view for a sale
 *
 * Features:
 * - Displays sale amount and date
 * - Lead information with WhatsApp
 * - Ticket status and service count
 * - UTM parameters
 * - Pipefy link
 * - View Lead button
 */
export const SaleCard = React.memo(
  React.forwardRef<HTMLDivElement, SaleCardProps>(
    (
      {
        id,
        amount,
        serviceCount,
        createdAt,
        ticketStatus,
        ticketPipefyId,
        ticketPipefyUrl,
        ticketUtmSource,
        ticketUtmMedium,
        ticketUtmCampaign,
        leadId,
        leadName,
        leadPhone,
        onViewLead,
        className,
      },
      ref
    ) => {
      const formattedDate = formatDateTime(createdAt)
      const formattedAmount = formatCurrencyBRL(amount)

      return (
        <DataTableCard ref={ref} className={className}>
          <DataTableCardHeader>
            <DataTableCardTitle className="text-lg font-semibold">
              {formattedAmount}
            </DataTableCardTitle>
            <DataTableCardMeta>{formattedDate}</DataTableCardMeta>
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

            {/* Ticket Status */}
            {ticketStatus && (
              <DataTableCardRow label="Status">
                <Badge variant="secondary">{ticketStatus}</Badge>
              </DataTableCardRow>
            )}

            {/* Services */}
            {serviceCount !== null && (
              <DataTableCardRow label="Serviços">
                <span className="text-sm font-medium">{serviceCount}</span>
              </DataTableCardRow>
            )}

            {/* UTM Parameters */}
            {(ticketUtmSource || ticketUtmMedium || ticketUtmCampaign) && (
              <div className="mt-3 space-y-2 border-t pt-3">
                {ticketUtmSource && (
                  <DataTableCardRow label="UTM Source">
                    <span className="text-xs text-muted-foreground">{ticketUtmSource}</span>
                  </DataTableCardRow>
                )}
                {ticketUtmMedium && (
                  <DataTableCardRow label="UTM Medium">
                    <span className="text-xs text-muted-foreground">{ticketUtmMedium}</span>
                  </DataTableCardRow>
                )}
                {ticketUtmCampaign && (
                  <DataTableCardRow label="UTM Campaign">
                    <span className="text-xs text-muted-foreground">{ticketUtmCampaign}</span>
                  </DataTableCardRow>
                )}
              </div>
            )}

            {/* Pipefy Link */}
            {ticketPipefyId && (
              <DataTableCardRow label="Pipefy">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">#{ticketPipefyId}</span>
                  {ticketPipefyUrl && (
                    <a
                      href={ticketPipefyUrl}
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

SaleCard.displayName = 'SaleCard'
