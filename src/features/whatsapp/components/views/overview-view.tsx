'use client'

import React from 'react'
import { ShieldCheck, Activity, Smartphone } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { whatsappApi } from '../../api/whatsapp'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WhatsAppPhoneNumber } from '../../types'

interface OverviewViewProps {
    phone: WhatsAppPhoneNumber
}

export function OverviewView({ phone }: OverviewViewProps) {
    const { data: accountInfo } = useQuery({
        queryKey: ['whatsapp', 'account'],
        queryFn: () => whatsappApi.getAccountInfo(),
    })

    // Tradução de Status
    const reviewStatus = {
        'APPROVED': { label: 'Aprovado para Uso', color: 'default' },
        'PENDING': { label: 'Em Análise', color: 'secondary' },
        'REJECTED': { label: 'Rejeitado', color: 'destructive' }
    }[accountInfo?.account_review_status || 'PENDING'] || { label: 'Pendente', color: 'secondary' }

    const verificationStatus = accountInfo?.business_verification_status === 'verified'
        ? { label: 'Empresa Verificada', color: 'default', icon: ShieldCheck }
        : { label: 'Não Verificado', color: 'outline', icon: Activity }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full">
            {/* Status Principal */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Saúde da Instância</CardTitle>
                    <CardDescription>Status atual da sua conexão com o WhatsApp Business API</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mt-1">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-sm text-muted-foreground">Status da Conta</p>
                            <div className="flex items-center gap-2">
                                <Badge variant={reviewStatus.color as any} className="font-bold">
                                    {reviewStatus.label}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground pt-1">
                                {accountInfo?.account_review_status === 'APPROVED'
                                    ? 'Sua conta está ativa e sem restrições.'
                                    : 'Aguarde a aprovação da Meta para enviar mensagens.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border">
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 mt-1">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-sm text-muted-foreground">Verificação do Negócio</p>
                            <div className="flex items-center gap-2">
                                <Badge variant={verificationStatus.color as any} className="font-bold">
                                    {verificationStatus.label}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground pt-1">
                                {accountInfo?.business_verification_status === 'verified'
                                    ? 'Sua empresa foi validada pela Meta.'
                                    : 'Complete a verificação no Business Manager para aumentar limites.'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Capacidade de Envio */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Capacidade de Mensagens</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-green-700">
                                <Smartphone className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-bold text-foreground">
                                    {phone.throughput.level === 'STANDARD' ? 'Tier 1 - 1.000 msgs/dia' :
                                        phone.throughput.level === 'HIGH' ? 'Tier 2 - 10.000 msgs/dia' :
                                            'Tier Ilimitado'}
                                </p>
                                <p className="text-xs text-muted-foreground">Limite diário de conversas iniciadas pela empresa</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="font-mono font-bold">
                            {phone.throughput.level}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
