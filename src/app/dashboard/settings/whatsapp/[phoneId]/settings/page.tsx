'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { whatsappApi } from '@/lib/whatsapp/client'
import { ProfileView } from '@/components/whatsapp/settings/profile-view'
import { SuspenseLoader } from '@/components/SuspenseLoader'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
    params: Promise<{ phoneId: string }>
}

export default function InstanceSettingsPage({ params }: PageProps) {
    const { phoneId } = React.use(params)

    const { data: phone, isLoading, isError } = useQuery({
        queryKey: ['whatsapp', 'phone', phoneId],
        queryFn: async () => {
            const numbers = await whatsappApi.listPhoneNumbers()
            return numbers.find((n: any) => n.id === phoneId)
        },
    })

    if (isLoading) return <SuspenseLoader />
    if (isError || !phone) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <p className="text-muted-foreground">Não foi possível carregar os dados desta instância.</p>
                <Button asChild variant="outline">
                    <Link href="/dashboard/settings/whatsapp">Voltar para Lista</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="px-4 py-2">
                <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground">
                    <Link href={`/dashboard/settings/whatsapp/${phoneId}`}>
                        <ChevronLeft className="h-4 w-4" />
                        Voltar para Visão Geral
                    </Link>
                </Button>
            </div>
            <ProfileView phone={phone} />
        </div>
    )
}
