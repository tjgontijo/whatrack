'use client'

import * as React from 'react'
import { Edit, MoreVertical, Plus, Share2, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { applyWhatsAppMask } from '@/lib/mask/phone-mask'
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Lead = {
    id: string
    name: string | null
    phone: string | null
    mail: string | null
    remoteJid: string | null
    createdAt: Date
    hasTickets: boolean
    hasSales: boolean
    hasAudit: boolean
    hasMessages: boolean
    status?: string // We'll add this for kanban
}

type LeadWithStatus = Lead & { status: string }

const COLUMNS = [
    { id: 'new', label: 'Novo', color: 'bg-blue-500' },
    { id: 'contacted', label: 'Contatado', color: 'bg-amber-500' },
    { id: 'qualified', label: 'Qualificado', color: 'bg-purple-500' },
    { id: 'converted', label: 'Convertido', color: 'bg-emerald-500' },
]

function SortableCard({ lead, onEdit, onDelete, onShare }: {
    lead: LeadWithStatus
    onEdit?: (leadId: string) => void
    onDelete?: (leadId: string) => void
    onShare?: (leadId: string) => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: lead.id,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const getInitials = (name: string | null) => {
        if (!name) return '??'
        return name.slice(0, 2).toUpperCase()
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group bg-card rounded-lg border border-border p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
        >
            {/* Card Header */}
            <div className="flex items-start gap-3 mb-3">
                <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(lead.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{lead.name || 'Sem nome'}</h4>
                    <p className="text-xs text-muted-foreground font-mono">
                        {lead.phone ? applyWhatsAppMask(lead.phone) : 'Sem telefone'}
                    </p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="text-left">
                    {lead.mail && (
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={lead.mail}>
                            {lead.mail}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                            e.stopPropagation()
                            onEdit?.(lead.id)
                        }}
                    >
                        <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete?.(lead.id)
                        }}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                            e.stopPropagation()
                            onShare?.(lead.id)
                        }}
                    >
                        <Share2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

type LeadsKanbanBoardProps = {
    leads: Lead[]
    onEdit?: (leadId: string) => void
    onDelete?: (leadId: string) => void
    onShare?: (leadId: string) => void
    onStatusChange?: (leadId: string, newStatus: string) => void
}

export function LeadsKanbanBoard({ leads, onEdit, onDelete, onShare, onStatusChange }: LeadsKanbanBoardProps) {
    // Convert leads to have status based on their flags
    const getLeadStatus = (lead: Lead): string => {
        if (lead.hasSales) return 'converted'
        if (lead.hasTickets) return 'qualified'
        if (lead.hasMessages) return 'contacted'
        return 'new'
    }

    const [leadsWithStatus, setLeadsWithStatus] = React.useState<LeadWithStatus[]>(() =>
        leads.map(lead => ({ ...lead, status: getLeadStatus(lead) }))
    )

    // Update when leads prop changes
    React.useEffect(() => {
        setLeadsWithStatus(leads.map(lead => ({ ...lead, status: getLeadStatus(lead) })))
    }, [leads])

    const [activeId, setActiveId] = React.useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    )

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id

        // If dropping over a column (identified by string ID)
        if (typeof overId === 'string' && COLUMNS.some(col => col.id === overId)) {
            setLeadsWithStatus((prevLeads) =>
                prevLeads.map((lead) =>
                    lead.id === activeId ? { ...lead, status: overId } : lead
                )
            )
        } else if (typeof overId === 'string') {
            // If dropping over another lead card
            setLeadsWithStatus((prevLeads) => {
                const activeLead = prevLeads.find((lead) => lead.id === activeId)
                const overLead = prevLeads.find((lead) => lead.id === overId)

                if (activeLead && overLead && activeLead.status === overLead.status) {
                    const columnLeads = prevLeads.filter(lead => lead.status === activeLead.status)
                    const oldIndex = columnLeads.findIndex(lead => lead.id === activeId)
                    const newIndex = columnLeads.findIndex(lead => lead.id === overId)

                    if (oldIndex !== -1 && newIndex !== -1) {
                        const newColumnLeads = arrayMove(columnLeads, oldIndex, newIndex)
                        const updatedLeads = prevLeads.map(lead => {
                            const newLead = newColumnLeads.find(nl => nl.id === lead.id)
                            return newLead ? newLead : lead
                        })
                        return updatedLeads
                    }
                }
                return prevLeads
            })
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const activeId = active.id as string
        const overId = over.id

        // Notify parent of status change
        if (typeof overId === 'string' && COLUMNS.some(col => col.id === overId)) {
            const lead = leadsWithStatus.find(l => l.id === activeId)
            if (lead && lead.status !== overId) {
                onStatusChange?.(activeId, overId)
            }
        }
    }

    const activeLead = activeId ? leadsWithStatus.find((lead) => lead.id === activeId) : null

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 h-full overflow-x-auto pb-4">
                {COLUMNS.map((column) => {
                    const columnLeads = leadsWithStatus.filter((lead) => lead.status === column.id)

                    return (
                        <div
                            key={column.id}
                            className="flex-shrink-0 w-[320px] flex flex-col bg-muted/30 rounded-xl"
                        >
                            {/* Column Header */}
                            <div className="flex items-center justify-between gap-2 p-4 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <div className={cn('h-2 w-2 rounded-full', column.color)} />
                                    <h3 className="font-semibold text-sm">{column.label}</h3>
                                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                                        {columnLeads.length}
                                    </Badge>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Plus className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            {/* Column Content - Droppable & Scrollable */}
                            <SortableContext items={columnLeads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                                <div
                                    id={column.id}
                                    className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin min-h-[200px]"
                                >
                                    {columnLeads.map((lead) => (
                                        <SortableCard
                                            key={lead.id}
                                            lead={lead}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            onShare={onShare}
                                        />
                                    ))}

                                    {/* Empty State */}
                                    {columnLeads.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                            <p className="text-sm text-muted-foreground">Nenhum lead</p>
                                        </div>
                                    )}
                                </div>
                            </SortableContext>
                        </div>
                    )
                })}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeLead ? (
                    <div className="bg-card rounded-lg border border-border p-3 shadow-lg opacity-90 w-[320px]">
                        <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                    {activeLead.name ? activeLead.name.slice(0, 2).toUpperCase() : '??'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">{activeLead.name || 'Sem nome'}</h4>
                                <p className="text-xs text-muted-foreground font-mono">
                                    {activeLead.phone ? applyWhatsAppMask(activeLead.phone) : 'Sem telefone'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
