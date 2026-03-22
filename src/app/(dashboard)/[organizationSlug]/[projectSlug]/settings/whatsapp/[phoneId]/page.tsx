import { Suspense } from 'react'
import { PageShell, PageContent } from '@/components/dashboard/layout'
import { LoadingPage } from '@/components/dashboard/states'
import { InstanceDetail } from '@/components/dashboard/whatsapp/instance-detail'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

interface PageProps {
  params: Promise<{ phoneId: string; organizationSlug: string }>
}

export default async function InstancePage({ params }: PageProps) {
  const { phoneId, organizationSlug } = await params
  const access = await requireWorkspacePageAccess({
    permissions: 'manage:integrations',
    organizationSlug,
  })

  return (
    <PageShell>
      <PageContent>
        <Suspense fallback={<LoadingPage message="Carregando instância..." />}>
          <InstanceDetail phoneId={phoneId} organizationId={access.organizationId} />
        </Suspense>
      </PageContent>
    </PageShell>
  )
}
