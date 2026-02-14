'use client'

import React from 'react'
import { ShieldCheck, Activity, Smartphone, AlertTriangle, Zap, Loader2, FileText, UserCircle, MessageSquare, Send } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whatsappApi } from '@/lib/whatsapp/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import Link from 'next/link'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import * as Flags from 'country-flag-icons/react/3x2'
import type { WhatsAppPhoneNumber } from '@/types/whatsapp'

interface OverviewViewProps {
    phone: WhatsAppPhoneNumber
}

export function OverviewView({ phone }: OverviewViewProps) {
    const queryClient = useQueryClient()

    const { data: accountInfo } = useQuery({
        queryKey: ['whatsapp', 'account'],
        queryFn: () => whatsappApi.getAccountInfo(),
    })

    const activateMutation = useMutation({
        mutationFn: () => whatsappApi.activateNumber(),
        onSuccess: (data) => {
            if (data.success) {
                toast.success('Número ativado com sucesso!')
                queryClient.invalidateQueries({ queryKey: ['whatsapp'] })
            } else {
                toast.warning('Ativação parcial', { description: data.message })
            }
        },
        onError: (error: Error) => {
            toast.error('Erro ao ativar número', { description: error.message })
        }
    })

    const needsActivation = phone.status !== 'CONNECTED'

    const reviewStatus = {
        'APPROVED': { label: 'Aprovado', color: 'default' },
        'PENDING': { label: 'Em Análise', color: 'secondary' },
        'REJECTED': { label: 'Rejeitado', color: 'destructive' }
    }[accountInfo?.account_review_status || 'PENDING'] || { label: 'Pendente', color: 'secondary' }

    const phoneStatus: Record<string, { label: string; color: "default" | "secondary" | "destructive" | "outline" }> = {
        'CONNECTED': { label: 'Conectado', color: 'default' },
        'PENDING': { label: 'Pendente', color: 'secondary' },
        'DISCONNECTED': { label: 'Desconectado', color: 'destructive' },
        'BANNED': { label: 'Banido', color: 'destructive' },
    }

    const currentStatus = phoneStatus[phone.status || 'PENDING'] || { label: phone.status || 'Desconhecido', color: 'secondary' }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full pb-8">
            {needsActivation && (
                <Alert variant="destructive" className="py-3 bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                        <div>
                            <AlertTitle className="text-sm font-bold">Ação Requerida: Ativar Número</AlertTitle>
                            <AlertDescription className="text-xs opacity-90">
                                Registre este número na Meta Cloud para habilitar o envio de mensagens.
                            </AlertDescription>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-amber-500/50 text-amber-700 hover:bg-amber-500/10 shrink-0 text-xs"
                            onClick={() => activateMutation.mutate()}
                            disabled={activateMutation.isPending}
                        >
                            {activateMutation.isPending ? (
                                <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Processando</>
                            ) : (
                                <><Zap className="h-3 w-3 mr-2" /> Ativar Agora</>
                            )}
                        </Button>
                    </div>
                </Alert>
            )}

            {/* Status Grid - Compact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-muted/20 border-none shadow-none">
                    <CardHeader className="pb-2 pt-4">
                        <CardDescription className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider">
                            <Smartphone className="h-3 w-3" /> Status do Número
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const raw = phone.display_phone_number
                                    const clean = raw.startsWith('+') ? raw : `+${raw.replace(/\D/g, '')}`
                                    const parsed = parsePhoneNumberFromString(clean)
                                    const country = parsed?.country || (raw.startsWith('1') || raw.startsWith('+1') ? 'US' : null)
                                    const Flag = country ? (Flags as any)[country] : null
                                    return (
                                        <>
                                            {Flag && <div className="w-5 shadow-sm border rounded-[2px] overflow-hidden shrink-0"><Flag /></div>}
                                            <span className="text-lg font-mono font-bold tracking-tight">
                                                {parsed?.formatInternational() || raw}
                                            </span>
                                        </>
                                    )
                                })()}
                            </div>
                            <Badge variant={currentStatus.color as any} className="text-[10px] font-bold px-2 py-0 h-5">
                                {currentStatus.label}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-muted/20 border-none shadow-none">
                    <CardHeader className="pb-2 pt-4">
                        <CardDescription className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider">
                            <Activity className="h-3 w-3" /> Status da Conta
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                                {accountInfo?.account_review_status === 'APPROVED' ? 'Aprovada pela Meta' : 'Em processamento'}
                            </span>
                            <Badge variant={reviewStatus.color as any} className="text-[10px] font-bold px-2 py-0 h-5">
                                {reviewStatus.label}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Hubs - More Balanced */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* Templates Hub */}
                <Card className="group hover:border-primary/40 transition-all duration-300 shadow-sm border-muted flex flex-col h-full">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold">Mensagens & Templates</CardTitle>
                                <CardDescription className="text-xs">Biblioteca de mensagens aprovadas</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Crie e gerencie modelos de mensagens para notificações, suporte e marketing direto.
                        </p>
                        <Button asChild className="w-full h-10 rounded-lg font-bold text-sm shadow-md shadow-primary/10">
                            <Link href={`/dashboard/settings/whatsapp/${phone.id}/templates`}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Abrir Templates
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Settings Hub */}
                <Card className="group hover:border-primary/40 transition-all duration-300 shadow-sm border-muted flex flex-col h-full">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                <UserCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold">Perfil Comercial</CardTitle>
                                <CardDescription className="text-xs">Identidade visual no WhatsApp</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Configure sua foto, descrição, horários e informações de contato da empresa.
                        </p>
                        <Button asChild variant="outline" className="w-full h-10 rounded-lg font-bold text-sm border-2">
                            <Link href={`/dashboard/settings/whatsapp/${phone.id}/settings`}>
                                <UserCircle className="h-4 w-4 mr-2" />
                                Editar Perfil
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Test Send Hub */}
                <Card className="group hover:border-primary/40 transition-all duration-300 shadow-sm border-muted flex flex-col h-full">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                                <Send className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold">Teste de Envio</CardTitle>
                                <CardDescription className="text-xs">Valide sua conexão enviando uma mensagem</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Envie uma mensagem de teste para qualquer número para garantir que tudo está configurado corretamente.
                        </p>
                        <Button asChild variant="outline" className="w-full h-10 rounded-lg font-bold text-sm border-2">
                            <Link href={`/dashboard/settings/whatsapp/${phone.id}/send-test`}>
                                <Send className="h-4 w-4 mr-2" />
                                Testar Agora
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Sending Capacity - Subtle */}
            <div className="pt-8 mt-4">
                <div className="flex items-center justify-between px-4 opacity-70 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="font-bold text-xs tracking-tight text-foreground">
                                {phone.throughput?.level === 'HIGH' ? 'Tier 2: 10.000 msgs/dia' :
                                    phone.throughput?.level === 'STANDARD' ? 'Tier 1: 1.000 msgs/dia' : 'Tier Ilimitado'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Limite diário de conversas iniciadas pela empresa</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2 py-0 h-5 border-muted-foreground/20">
                        Tier {phone.throughput?.level || 'N/A'}
                    </Badge>
                </div>
            </div>
        </div>
    )
}
