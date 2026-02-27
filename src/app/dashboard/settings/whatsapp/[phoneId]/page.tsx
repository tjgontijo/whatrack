'use client'

import React, { Suspense } from 'react'
import { PageShell, PageContent } from '@/components/dashboard/layout'
import { LoadingPage } from '@/components/dashboard/states'
import { InstanceDetail } from '@/components/dashboard/whatsapp/instance-detail'

interface PageProps {
  params: Promise<{ phoneId: string }>
}

export default function InstancePage({ params }: PageProps) {
  const resolvedParams = React.use(params)

  return (
    <PageShell>
      <PageContent>
        <Suspense fallback={<LoadingPage message="Carregando instância..." />}>
          <InstanceDetail phoneId={resolvedParams.phoneId} />
        </Suspense>
      </PageContent>
    </PageShell>
  )
}
