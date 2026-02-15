'use client'
import { RefreshCw, Plus, Phone, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import {
    TemplateMainShell,
    TemplateMainHeader,
    DataToolbar,
} from '@/components/dashboard/leads'
import { useIsMobile } from '@/hooks/use-mobile'
import { whatsappApi } from '@/lib/whatsapp/client'
import { useWhatsAppOnboarding } from '@/hooks/whatsapp/use-whatsapp-onboarding'
import { InstanceCard } from '@/components/whatsapp/instance-card'
import { EmbeddedSignupButton } from '@/components/whatsapp/embedded-signup-button'
import type { WhatsAppPhoneNumber } from '@/types/whatsapp'

export default function WhatsAppSettingsPage() {
    const isMobile = useIsMobile()

    // Fetch instances (phone numbers)
    const { data: phoneNumbers, isLoading, error, refetch, isRefetching } = useQuery<WhatsAppPhoneNumber[]>({
        queryKey: ['whatsapp', 'phone-numbers'],
        queryFn: () => whatsappApi.listPhoneNumbers(),
        staleTime: 30_000,
        retry: false,
    })

    const handleRefresh = () => {
        refetch()
    }

    const { status: onboardingStatus, sdkReady, startOnboarding } = useWhatsAppOnboarding(handleRefresh)
    const isOnboarding = onboardingStatus === 'pending' || onboardingStatus === 'checking'

    return (
        <TemplateMainShell className="flex flex-col h-[calc(100vh-2rem)]">
            <TemplateMainHeader
                title="Instâncias WhatsApp"
                subtitle="Gerencie seus números conectados e templates de mensagens"
                actions={
                    <Button
                        variant="default"
                        size="sm"
                        className="h-8 gap-2 font-bold shadow-sm"
                        onClick={startOnboarding}
                        disabled={!sdkReady || isOnboarding}
                    >
                        {isOnboarding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="h-4 w-4" />
                        )}
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
                {isLoading || onboardingStatus === 'checking' ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                        <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
                        <p className="text-sm font-medium text-muted-foreground">
                            {onboardingStatus === 'checking' ? 'Finalizando conexão...' : 'Carregando instâncias...'}
                        </p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto py-12 gap-4">
                        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                            <Phone className="h-6 w-6 text-destructive" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-semibold">Erro ao carregar instâncias</h3>
                            <p className="text-sm text-muted-foreground">{(error as any).message || 'Houve um problema ao conectar com a API da Meta.'}</p>
                        </div>
                        <Button onClick={() => refetch()} variant="outline" size="sm">
                            Tentar novamente
                        </Button>
                    </div>
                ) : !phoneNumbers || phoneNumbers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto py-12">
                        <EmbeddedSignupButton onSuccess={handleRefresh} />
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
