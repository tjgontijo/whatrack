'use client'

import * as React from 'react'
import { Edit, Trash2, MoreHorizontal, MessageSquare, Phone, Mail, Calendar } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { applyWhatsAppMask, denormalizeWhatsApp } from '@/lib/mask/phone-mask'

type Lead = {
  id: string
  name: string | null
  phone: string | null
  mail: string | null
  remoteJid: string | null
  createdAt: Date
  updatedAt?: Date
  ticketsCount?: number
  salesCount?: number
  ltv?: number
  firstSource?: string | null
  firstOrigin?: string | null
  firstTracking?: {
    utmSource: string | null
    sourceType: string | null
  } | null
}

type LeadsTableViewProps = {
  leads: Lead[]
  visibleColumns: string[]
  onView?: (leadId: string) => void
  onChat?: (leadId: string) => void
  onEdit?: (leadId: string) => void
  onDelete?: (leadId: string) => void
}

export function LeadsTableView({
  leads,
  visibleColumns,
  onView,
  onChat,
  onEdit,
  onDelete,
}: LeadsTableViewProps) {
  const isColumnVisible = (columnId: string) => visibleColumns.includes(columnId)

  const getInitials = (name: string | null) => {
    if (!name) return '??'
    return name.slice(0, 2).toUpperCase()
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  const getSourceLabel = (source: string | null | undefined) => {
    if (!source) return null
    if (source === 'paid') return 'Pago'
    if (source === 'organic') return 'Orgânico'
    return source
  }

  const resolveLeadOrigin = (lead: Lead) => {
    return {
      origin: lead.firstOrigin ?? lead.firstTracking?.utmSource ?? null,
      source: lead.firstSource ?? lead.firstTracking?.sourceType ?? null,
    }
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-border bg-muted/30 border-b">
              <th className="text-muted-foreground px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">
                Lead
              </th>
              {isColumnVisible('phone') && (
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">
                  Contato
                </th>
              )}
              {(isColumnVisible('firstOrigin') || isColumnVisible('firstSource')) && (
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">
                  Primeira Origem
                </th>
              )}
              {isColumnVisible('ticketsCount') && (
                <th className="text-muted-foreground px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide">
                  Tickets
                </th>
              )}
              {isColumnVisible('salesCount') && (
                <th className="text-muted-foreground px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide">
                  Vendas
                </th>
              )}
              {isColumnVisible('ltv') && (
                <th className="text-muted-foreground px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide">
                  LTV
                </th>
              )}
              {isColumnVisible('createdAt') && (
                <th className="text-muted-foreground px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide">
                  Criado em
                </th>
              )}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const { origin, source } = resolveLeadOrigin(lead)
              const originParts = [origin, getSourceLabel(source)].filter(Boolean)

              return (
                <tr
                  key={lead.id}
                  className={cn(
                    'border-border/50 group cursor-pointer border-b transition-colors last:border-0',
                    'hover:bg-muted/40'
                  )}
                  onClick={() => onView?.(lead.id)}
                >
                  {/* Lead */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="border-border/50 h-7 w-7 border">
                        <AvatarFallback className="bg-primary/5 text-primary text-[9px] font-semibold">
                          {getInitials(lead.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <span className="text-foreground truncate text-[13px] font-medium leading-tight">
                          {lead.name || 'Sem nome'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Contact (Phone/Email) */}
                  {isColumnVisible('phone') && (
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground font-mono text-[12px]">
                          {lead.phone ? applyWhatsAppMask(denormalizeWhatsApp(lead.phone)) : '—'}
                        </span>
                        {isColumnVisible('email') && lead.mail && (
                          <span className="text-muted-foreground/70 max-w-[150px] truncate text-[10px]">
                            {lead.mail}
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Consolidated Origin */}
                  {(isColumnVisible('firstOrigin') || isColumnVisible('firstSource')) && (
                    <td className="px-4 py-2.5">
                      <span className="text-muted-foreground block max-w-[150px] truncate text-[12px]">
                        {originParts.join(' • ') || '—'}
                      </span>
                    </td>
                  )}

                  {/* Tickets Count */}
                  {isColumnVisible('ticketsCount') && (
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-muted-foreground text-[12px] tabular-nums">
                        {lead.ticketsCount || 0}
                      </span>
                    </td>
                  )}

                  {/* Sales Count */}
                  {isColumnVisible('salesCount') && (
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={cn(
                          'text-[12px] tabular-nums',
                          (lead.salesCount || 0) > 0
                            ? 'font-medium text-emerald-600'
                            : 'text-muted-foreground'
                        )}
                      >
                        {lead.salesCount || 0}
                      </span>
                    </td>
                  )}

                  {/* LTV */}
                  {isColumnVisible('ltv') && (
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-[12px] font-semibold text-emerald-600">
                        {formatCurrency(lead.ltv || 0)}
                      </span>
                    </td>
                  )}

                  {/* Created At */}
                  {isColumnVisible('createdAt') && (
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-muted-foreground whitespace-nowrap text-[11px]">
                        {formatDate(lead.createdAt)}
                      </span>
                    </td>
                  )}

                  {/* Actions (Kebab Menu) */}
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <MoreHorizontal className="text-muted-foreground h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onChat?.(lead.id)}>
                          <MessageSquare className="mr-2 h-3.5 w-3.5" />
                          Abrir Chat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(lead.id)}>
                          <Edit className="mr-2 h-3.5 w-3.5" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete?.(lead.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {leads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhum lead encontrado</p>
        </div>
      )}
    </div>
  )
}
