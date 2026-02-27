'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { PageShell, PageContent } from '@/components/dashboard/layout'
import { LoadingPage, ErrorState } from '@/components/dashboard/states'
import { whatsappApi } from '@/lib/whatsapp/client'
import { ProfileView } from '@/components/dashboard/whatsapp/settings/profile-view'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ phoneId: string }>
}

export default function InstanceSettingsPage({ params }: PageProps) {
  const { phoneId } = React.use(params)

  const {
    data: phone,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['whatsapp', 'phone', phoneId],
    queryFn: async () => {
      const numbers = await whatsappApi.listPhoneNumbers()
      return numbers.find((n: any) => n.id === phoneId)
    },
  })

  return (
    <PageShell>
      <PageContent>
        {isLoading && <LoadingPage message="Carregando configurações..." />}

        {isError || (!isLoading && !phone) ? (
          <ErrorState
            title="Instância não encontrada"
            message="Não foi possível carregar os dados desta instância."
            action={
              <Button asChild variant="outline">
                <Link href="/dashboard/settings/whatsapp">Voltar para Lista</Link>
              </Button>
            }
          />
        ) : null}

        {!isLoading && phone && (
          <div className="flex flex-col gap-4">
            <div className="px-4 py-2">
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground -ml-2 gap-2">
                <Link href={`/dashboard/settings/whatsapp/${phoneId}`}>
                  <ChevronLeft className="h-4 w-4" />
                  Voltar para Visão Geral
                </Link>
              </Button>
            </div>
            <ProfileView phone={phone} />
          </div>
        )}
      </PageContent>
    </PageShell>
  )
}
