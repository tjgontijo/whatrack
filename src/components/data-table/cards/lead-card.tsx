'use client'

import * as React from 'react'
import {
  Inbox,
  ShoppingBag,
  MessageSquareText,
  ClipboardCheck,
} from 'lucide-react'
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
import { StatusIconButton } from './status-icon-button'
import { cn } from '@/lib/utils'

interface Lead {
  id: string
  name: string | null
  phone: string | null
  mail: string | null
  instagram: string | null
  created_at: string
  hasTickets: boolean
  hasSales: boolean
  hasAudit: boolean
  hasMessages: boolean
}

interface LeadCardProps {
  lead: Lead
  onOpenDialog?: (leadId: string, mode: 'tickets' | 'sales' | 'messages' | 'audits') => void
  className?: string
}

/**
 * LeadCard - Mobile card view for a lead
 *
 * Features:
 * - Displays lead info (name, phone, email, instagram)
 * - 4 action buttons with status indicators
 * - WhatsApp integration
 * - Responsive layout
 * - Dialog trigger callbacks
 */
export const LeadCard = React.memo(
  React.forwardRef<HTMLDivElement, LeadCardProps>(
    ({ lead, onOpenDialog, className }, ref) => {
      const createdDate = new Date(lead.created_at)
      const formattedDate = createdDate.toLocaleString('pt-BR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      return (
        <DataTableCard ref={ref} className={className}>
          <DataTableCardHeader>
            <DataTableCardTitle>{lead.name || 'Lead sem nome'}</DataTableCardTitle>
            <DataTableCardMeta>{formattedDate}</DataTableCardMeta>
          </DataTableCardHeader>

          <DataTableCardContent>
            {/* Phone */}
            {lead.phone && (
              <DataTableCardRow label="Telefone">
                <PhoneWithWhatsApp phone={lead.phone} />
              </DataTableCardRow>
            )}

            {/* Email */}
            {lead.mail && (
              <DataTableCardRow label="Email">
                <a
                  href={`mailto:${lead.mail}`}
                  className="text-sm text-blue-600 hover:underline"
                  aria-label={`Enviar email para ${lead.mail}`}
                >
                  {lead.mail}
                </a>
              </DataTableCardRow>
            )}

            {/* Instagram */}
            {lead.instagram && (
              <DataTableCardRow label="Instagram">
                <a
                  href={`https://instagram.com/${lead.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-pink-600 hover:underline"
                  aria-label={`Ver perfil do Instagram @${lead.instagram}`}
                >
                  @{lead.instagram}
                </a>
              </DataTableCardRow>
            )}
          </DataTableCardContent>

          <DataTableCardFooter>
            <div className="flex gap-2">
              <StatusIconButton
                hasData={lead.hasTickets}
                label="Ver tickets do lead"
                onClick={() => onOpenDialog?.(lead.id, 'tickets')}
                activeIcon={Inbox}
                inactiveIcon={Inbox}
                activeClassName="text-blue-600"
                inactiveClassName="text-muted-foreground"
              />
              <StatusIconButton
                hasData={lead.hasSales}
                label="Ver vendas do lead"
                onClick={() => onOpenDialog?.(lead.id, 'sales')}
                activeIcon={ShoppingBag}
                inactiveIcon={ShoppingBag}
                activeClassName="text-amber-600"
                inactiveClassName="text-muted-foreground"
              />
              <StatusIconButton
                hasData={lead.hasMessages}
                label="Ver mensagens do lead"
                onClick={() => onOpenDialog?.(lead.id, 'messages')}
                activeIcon={MessageSquareText}
                inactiveIcon={MessageSquareText}
                activeClassName="text-emerald-600"
                inactiveClassName="text-muted-foreground"
              />
              <StatusIconButton
                hasData={lead.hasAudit}
                label="Ver auditoria do lead"
                onClick={() => onOpenDialog?.(lead.id, 'audits')}
                activeIcon={ClipboardCheck}
                inactiveIcon={ClipboardCheck}
                activeClassName="text-violet-600"
                inactiveClassName="text-muted-foreground"
              />
            </div>
          </DataTableCardFooter>
        </DataTableCard>
      )
    }
  )
)

LeadCard.displayName = 'LeadCard'
