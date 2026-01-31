'use client'

import React from 'react'
import { RefreshCw, Plus, Phone } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import {
    TemplateMainShell,
    TemplateMainHeader,
    DataToolbar,
} from '@/components/dashboard/leads'
import { useIsMobile } from '@/hooks/use-mobile'
import { whatsappApi } from './api/whatsapp'
import { InstanceCard } from './components/instance-card'
import type { WhatsAppPhoneNumber } from './types'

export default function WhatsAppPage() {
    const isMobile = useIsMobile()

    // Fetch instances (phone numbers)
    const { data: phoneNumbers, isLoading, refetch, isRefetching } = useQuery<WhatsAppPhoneNumber[]>({
        queryKey: ['whatsapp', 'phone-numbers'],
        queryFn: () => whatsappApi.listPhoneNumbers(),
        staleTime: 30_000,
    })

    const handleRefresh = () => {
        refetch()
    }

    return (
        <TemplateMainShell className="flex flex-col h-[calc(100vh-2rem)]">
            <TemplateMainHeader
                title="Instâncias WhatsApp"
                subtitle="Gerencie seus números conectados e templates de mensagens"
                actions={
                    <Button variant="default" size="sm" className="h-8 gap-2 font-bold shadow-sm">
                        <Plus className="h-4 w-4" />
                        {!isMobile && 'Nova Instância'}
                    </Button>
                }
            />

            <div className="border-b border-border bg-background/50 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/50">
                <DataToolbar
                    searchValue=""
                    onSearchChange={() => { }}
                    searchPlaceholder="Buscar instância..."
                    actions={
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-2 text-xs font-semibold"
                            onClick={handleRefresh}
                            disabled={isRefetching}
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                            <span>{!isMobile && 'Atualizar'}</span>
                        </Button>
                    }
                />
            </div>

            <div className={isMobile
                ? "flex-1 overflow-y-scroll bg-muted/5 p-4 scrollbar-hide"
                : "flex-1 overflow-y-auto bg-muted/5 p-8"
            }>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                        <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
                        <p className="text-sm font-medium text-muted-foreground">Carregando instâncias...</p>
                    </div>
                ) : !phoneNumbers || phoneNumbers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-4">
                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                            <Phone className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold">Nenhuma instância encontrada</h3>
                            <p className="text-sm text-muted-foreground">
                                Você ainda não possui números de telefone configurados na sua conta WhatsApp Cloud API.
                            </p>
                        </div>
                        <Button variant="outline" className="font-bold">
                            Configurar Meta API
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {phoneNumbers.map((phone) => (
                            <InstanceCard key={phone.id} phone={phone} />
                        ))}
                    </div>
                )}
            </div>
        </TemplateMainShell>
    )
}
