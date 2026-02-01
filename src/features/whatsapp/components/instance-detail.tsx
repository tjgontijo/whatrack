'use client'

import React, { useState } from 'react'
import {
    RefreshCw
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'
import { whatsappApi } from '../api/whatsapp'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import * as Flags from 'country-flag-icons/react/3x2'

import { OverviewView } from '@/features/whatsapp/components/views/overview-view'

interface InstanceDetailProps {
    phoneId: string
}

export function InstanceDetail({ phoneId }: InstanceDetailProps) {
    const isMobile = useIsMobile()
    const router = useRouter()

    const { data: phone, isLoading } = useQuery({
        queryKey: ['whatsapp', 'phone', phoneId],
        queryFn: () => whatsappApi.getPhoneNumberById(phoneId),
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!phone) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                <h2 className="text-xl font-bold">Instância não encontrada</h2>
                <Button variant="outline" onClick={() => router.push('/dashboard/settings/whatsapp')}>
                    Voltar para lista
                </Button>
            </div>
        )
    }

    // Identificar país e formatar número
    const rawNumber = phone.display_phone_number
    const cleanNumber = rawNumber.startsWith('+') ? rawNumber : `+${rawNumber.replace(/\D/g, '')}`
    const parsedPhone = parsePhoneNumberFromString(cleanNumber)

    // Fallback para US se o número começar com 1 (comum em números de teste da Meta)
    const detectedCountry = parsedPhone?.country || (rawNumber.startsWith('1') || rawNumber.startsWith('+1') ? 'US' : null)
    const FlagComponent = detectedCountry ? (Flags as any)[detectedCountry] : null

    return (
        <div className={isMobile ? "p-4 space-y-6" : "p-8 space-y-8"}>
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        {FlagComponent && (
                            <div className="w-7 shadow-sm rounded-sm overflow-hidden border shrink-0">
                                <FlagComponent />
                            </div>
                        )}
                        <h1 className="text-2xl font-black tracking-tighter text-foreground">
                            {parsedPhone?.formatInternational() || rawNumber}
                        </h1>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest bg-muted/50 border-none">
                            {phone.verified_name}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <span className="opacity-50 uppercase text-[9px] font-bold">Phone ID:</span>
                            <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono select-all">
                                {phone.id}
                            </code>
                        </div>
                        {phone.webhook_configuration?.whatsapp_business_account && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                <span className="opacity-50 uppercase text-[9px] font-bold">WABA ID:</span>
                                <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono select-all">
                                    {phone.webhook_configuration.whatsapp_business_account}
                                </code>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <OverviewView phone={phone} />
        </div>
    )
}
