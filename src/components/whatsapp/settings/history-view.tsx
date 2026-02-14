'use client'

import React from 'react'
import { History, Search, Filter, CalendarClock, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { WhatsAppPhoneNumber } from '@/types/whatsapp'

interface HistoryViewProps {
    phone: WhatsAppPhoneNumber
}

export function HistoryView({ phone }: HistoryViewProps) {
    // Mock de dados para mostrar como será
    const mockLogs = [
        { id: '1', date: '2024-03-20 14:30', to: '+55 11 99999-1111', template: 'hello_world', status: 'sent' },
        { id: '2', date: '2024-03-20 14:35', to: '+55 11 99999-2222', template: 'appointment_reminder', status: 'delivered' },
        { id: '3', date: '2024-03-20 14:40', to: '+55 11 99999-3333', template: 'shipping_update', status: 'read' },
        { id: '4', date: '2024-03-20 14:45', to: '+55 11 99999-4444', template: 'feedback_request', status: 'failed' },
    ]

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">

            {/* Overlay de "Em Breve" */}
            <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 shadow-sm border border-primary/20">
                    <History className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Histórico de Mensagens</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                    Em breve você poderá visualizar o log completo de mensagens enviadas e recebidas por esta instância, com status de entrega em tempo real.
                </p>
                <Button disabled className="gap-2 font-bold">
                    <Lock className="h-4 w-4" />
                    Funcionalidade em desenvolvimento
                </Button>
            </div>

            {/* Interface Mockada (Background) */}
            <div className="opacity-40 pointer-events-none select-none filter blur-[1px]">
                <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar por telefone ou template..." className="pl-9" />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon"><CalendarClock className="h-4 w-4" /></Button>
                    </div>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden mt-6">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[180px]">Data/Hora</TableHead>
                                <TableHead>Destinatário</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockLogs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs">{log.date}</TableCell>
                                    <TableCell>{log.to}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono text-[10px]">{log.template}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={
                                            log.status === 'read' ? 'default' :
                                                log.status === 'failed' ? 'destructive' :
                                                    'secondary'
                                        } className="capitalize">
                                            {log.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
