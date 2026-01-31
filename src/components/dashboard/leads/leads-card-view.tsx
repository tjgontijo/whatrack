'use client'

import * as React from 'react'
import { MessageSquare, Edit, Trash2, Phone, Mail, Calendar, ShoppingCart, TrendingUp, MapPin } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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

type LeadsCardViewProps = {
    leads: Lead[]
    onView?: (leadId: string) => void
    onChat?: (leadId: string) => void
    onEdit?: (leadId: string) => void
    onDelete?: (leadId: string) => void
}

export function LeadsCardView({ leads, onView, onChat, onEdit, onDelete }: LeadsCardViewProps) {
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
            maximumFractionDigits: 0
        }).format(value)
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {leads.map((lead) => {
                const { origin, source } = resolveLeadOrigin(lead)

                // Build first origin info text
                const firstOriginParts = [
                    origin,
                    getSourceLabel(source)
                ].filter(Boolean)
                const firstOriginText = firstOriginParts.length > 0 ? firstOriginParts.join(' • ') : null

                return (
                    <div
                        key={lead.id}
                        className="group relative flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md cursor-pointer"
                        onClick={() => onView?.(lead.id)}
                    >
                        {/* Actions - Absolute positioned */}
                        <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:bg-muted hover:text-primary"
                                onClick={() => onChat?.(lead.id)}
                                title="Abrir Chat"
                            >
                                <MessageSquare className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:bg-muted hover:text-primary"
                                onClick={() => onEdit?.(lead.id)}
                                title="Editar"
                            >
                                <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:bg-muted hover:text-destructive"
                                onClick={() => onDelete?.(lead.id)}
                                title="Deletar"
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>

                        {/* Lead Info */}
                        <div className="flex items-center gap-3 mb-3 pr-16">
                            <Avatar className="h-9 w-9 border border-border">
                                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold leading-none">
                                    {getInitials(lead.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm text-foreground truncate leading-tight">
                                    {lead.name || 'Sem nome'}
                                </h3>
                                {/* First Origin as subtle text */}
                                {firstOriginText && (
                                    <p className="text-[10px] text-muted-foreground truncate" title="Primeira origem do lead">
                                        <MapPin className="inline h-2.5 w-2.5 mr-0.5 opacity-60" />
                                        {firstOriginText}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Contact & Meta Info */}
                        <div className="flex flex-col gap-1.5 mb-4 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 shrink-0 opacity-60" />
                                <span className="font-mono">
                                    {lead.phone ? applyWhatsAppMask(denormalizeWhatsApp(lead.phone)) : '—'}
                                </span>
                            </div>
                            {lead.mail && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3 shrink-0 opacity-60" />
                                    <span className="truncate">{lead.mail}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 shrink-0 opacity-60" />
                                <span>{formatDate(lead.createdAt)}</span>
                            </div>
                        </div>

                        {/* Metrics Footer */}
                        <div className="mt-auto pt-3 border-t border-border/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-muted-foreground" title="Tickets">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    <span className="text-xs font-medium">{lead.ticketsCount || 0}</span>
                                </div>
                                <div className="flex items-center gap-1.5" title="Vendas">
                                    <ShoppingCart className="h-3.5 w-3.5 text-emerald-500" />
                                    <span className="text-xs font-semibold text-emerald-600">{lead.salesCount || 0}</span>
                                </div>
                                <div className="flex items-center gap-1.5" title="LTV (Lifetime Value)">
                                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                    <span className="text-xs font-semibold text-emerald-600">
                                        {formatCurrency(lead.ltv || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}

            {leads.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum lead encontrado</p>
                </div>
            )}
        </div>
    )
}
