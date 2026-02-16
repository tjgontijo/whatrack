'use client'

import Link from 'next/link'
import { Phone, CheckCircle2, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WhatsAppPhoneNumber } from '@/types/whatsapp'

interface InstanceCardProps {
    phone: WhatsAppPhoneNumber
}

export function InstanceCard({ phone }: InstanceCardProps) {
    const isConnected = phone.status === 'CONNECTED'

    // Tradução amigável do nível de qualidade
    const qualityLabel = {
        GREEN: 'Qualidade Alta',
        YELLOW: 'Qualidade Média',
        RED: 'Qualidade Baixa',
        UNKNOWN: 'Qualidade Desconhecida'
    }[phone.quality_rating] || 'Qualidade Desconhecida'

    const qualityColor = {
        GREEN: 'text-green-600 bg-green-500/10 border-green-200',
        YELLOW: 'text-yellow-600 bg-yellow-500/10 border-yellow-200',
        RED: 'text-red-600 bg-red-500/10 border-red-200',
        UNKNOWN: 'text-slate-600 bg-slate-500/10 border-slate-200'
    }[phone.quality_rating] || 'text-slate-600 bg-slate-500/10 border-slate-200'

    return (
        <Link href={`/dashboard/settings/whatsapp/${phone.id}`} className="block group h-full">
            <Card className="h-full transition-all hover:border-primary/50 hover:shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />

                <CardContent className="p-6 pl-7 h-full flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                                <h3 className="font-bold text-xl tracking-tight text-foreground">
                                    {phone.display_phone_number}
                                </h3>
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                    {phone.verified_name}
                                    {phone.code_verification_status === 'VERIFIED' && (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                                    )}
                                </p>
                            </div>
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isConnected ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                <Phone className="h-5 w-5" />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                            <Badge variant="outline" className={`font-semibold border ${qualityColor}`}>
                                {qualityLabel}
                            </Badge>
                            <Badge variant="outline" className="font-semibold text-muted-foreground">
                                {phone.throughput.level === 'STANDARD' ? 'Limite Padrão' : 'Alto Volume'}
                            </Badge>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t mt-4">
                        <span className="text-xs font-medium text-muted-foreground">
                            {isConnected ? 'Conectado e Operando' : 'Verifique a conexão'}
                        </span>
                        <ArrowRight className="h-4 w-4 text-primary opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
