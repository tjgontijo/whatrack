'use client'

import React, { useState } from 'react'
import {
    LayoutDashboard,
    User,
    FileText,
    Send,
    History,
    RefreshCw
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
    TemplateMainShell,
    TemplateMainHeader,
} from '@/components/dashboard/leads'
import { useIsMobile } from '@/hooks/use-mobile'
import { whatsappApi } from '../api/whatsapp'
import { Button } from '@/components/ui/button'

import { OverviewView } from './views/overview-view'
import { ProfileView } from './views/profile-view'
import { TemplatesView } from './views/templates-view'
import { SendTestView } from './views/send-test-view'
import { HistoryView } from './views/history-view'

interface InstanceDetailProps {
    phoneId: string
}

type SubView = 'overview' | 'profile' | 'templates' | 'send' | 'history'

const SUB_VIEW_OPTIONS = [
    { value: 'overview' as const, label: 'Visão Geral', icon: LayoutDashboard },
    { value: 'profile' as const, label: 'Perfil', icon: User },
    { value: 'templates' as const, label: 'Templates', icon: FileText },
    { value: 'send' as const, label: 'Enviar Teste', icon: Send },
    { value: 'history' as const, label: 'Logs', icon: History },
]

export function InstanceDetail({ phoneId }: InstanceDetailProps) {
    const isMobile = useIsMobile()
    const router = useRouter()
    const [currentSubView, setCurrentSubView] = useState<SubView>('overview')

    const { data: phone, isLoading } = useQuery({
        queryKey: ['whatsapp', 'phone', phoneId],
        queryFn: () => whatsappApi.getPhoneNumberById(phoneId),
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!phone) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <h2 className="text-xl font-bold">Instância não encontrada</h2>
                <Button onClick={() => router.push('/dashboard/settings/whatsapp')}>
                    Voltar para lista
                </Button>
            </div>
        )
    }

    return (
        <TemplateMainShell className="flex flex-col h-[calc(100vh-2rem)]">
            <TemplateMainHeader
            // Título e Subtítulo removidos para evitar redundância com o Breadcrumb global
            >
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2 -ml-1 border-t md:border-t-0 mt-2 md:mt-0">
                    {SUB_VIEW_OPTIONS.map((option) => {
                        const Icon = option.icon
                        const isActive = currentSubView === option.value
                        return (
                            <button
                                key={option.value}
                                onClick={() => setCurrentSubView(option.value)}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${isActive
                                    ? 'bg-primary/10 text-primary font-bold'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {option.label}
                            </button>
                        )
                    })}
                </div>
            </TemplateMainHeader>

            <div className={isMobile
                ? "flex-1 overflow-y-scroll bg-muted/5 p-4 scrollbar-hide"
                : "flex-1 overflow-y-auto bg-muted/5 p-6"
            }>
                <div className="w-full h-full">
                    {currentSubView === 'overview' && <OverviewView phone={phone} />}
                    {currentSubView === 'profile' && <ProfileView phone={phone} />}
                    {currentSubView === 'templates' && <TemplatesView phone={phone} />}
                    {currentSubView === 'send' && <SendTestView phone={phone} />}
                    {currentSubView === 'history' && <HistoryView phone={phone} />}
                </div>
            </div>
        </TemplateMainShell>
    )
}
