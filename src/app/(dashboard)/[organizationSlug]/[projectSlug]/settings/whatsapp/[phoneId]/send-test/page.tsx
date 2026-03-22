'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { PageShell, PageContent } from '@/components/dashboard/layout'
import { LoadingPage, ErrorState } from '@/components/dashboard/states'
import { whatsappApi } from '@/lib/whatsapp/client'
import { SendTestView } from '@/components/dashboard/whatsapp/settings/send-test-view'
import { Button } from '@/components/ui/button'

import { useRequiredProjectPath, useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'

interface PageProps {
  params: Promise<{ phoneId: string }>
}

export default function SendTestPage({ params }: PageProps) {
  const { phoneId } = React.use(params)
  const { organizationId: orgId, projectId } = useRequiredProjectRouteContext()
  const whatsappSettingsPath = useRequiredProjectPath('/settings/whatsapp')

  const {
    data: phone,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['whatsapp', 'phone', phoneId, orgId],
    queryFn: () => whatsappApi.getPhoneNumberByConfigId(phoneId, orgId),
    select: (data) => (data?.projectId === projectId ? data : null),
  })


  return (
    <PageShell>
      <PageContent>
        {isLoading && <LoadingPage message="Carregando..." />}

        {isError || (!isLoading && !phone) ? (
          <ErrorState
            title="Instância não encontrada"
            message="Não foi possível carregar os dados desta instância."
            action={
              <Button asChild variant="outline">
                <Link href={whatsappSettingsPath}>Voltar para Lista</Link>
              </Button>
            }
          />
        ) : null}

        {!isLoading && phone && (
          <div className="flex flex-col gap-4 p-8">
            <div className="pb-2">
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground -ml-2 gap-2">
                <Link href={`${whatsappSettingsPath}/${phoneId}`}>
                  <ChevronLeft className="h-4 w-4" />
                  Voltar para Visão Geral
                </Link>
              </Button>
            </div>
            <SendTestView phone={phone} />
          </div>
        )}
      </PageContent>
    </PageShell>
  )
}
