'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { whatsappApi } from '@/lib/whatsapp/client'
import { TemplatesView } from '@/components/whatsapp/settings/templates-view'
import { SuspenseLoader } from '@/components/SuspenseLoader'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
    params: Promise<{ phoneId: string }>
}

export default function InstanceTemplatesPage({ params }: PageProps) {
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
        <div className="flex flex-col h-full">
            <TemplatesView phone={phone} />
        </div>
    )
}
