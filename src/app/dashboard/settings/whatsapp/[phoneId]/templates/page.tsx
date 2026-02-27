'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { PageShell, PageContent } from '@/components/dashboard/layout'
import { LoadingPage, ErrorState } from '@/components/dashboard/states'
import { whatsappApi } from '@/lib/whatsapp/client'
import { TemplatesView } from '@/components/dashboard/whatsapp/settings/templates-view'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ phoneId: string }>
}

export default function InstanceTemplatesPage({ params }: PageProps) {
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
      <PageContent className="flex h-full flex-col">
        {isLoading && <LoadingPage message="Carregando templates..." />}

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

        {!isLoading && phone && <TemplatesView phone={phone} />}
      </PageContent>
    </PageShell>
  )
}
