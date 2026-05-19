import { Kanban } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { PageContent, PageHeader, PageShell } from '@/features/dashboard/components/layout'
import { DealStagesManager } from '@/features/deal-stages/components/deal-stages-manager'
import { getServerSession } from '@/server/auth/server-session'
import { resolveProjectContext } from '@/server/project/resolve-project-context'

export const metadata = { title: 'Funil de Negociações — Configurações' }

type PipelinePageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}

export default async function PipelinePage({ params }: PipelinePageProps) {
  const { organizationSlug, projectSlug } = await params
  const session = await getServerSession()
  
  if (!session?.user) {
    redirect('/sign-in')
  }

  const context = await resolveProjectContext({
    organizationSlug,
    projectSlug,
    userId: session.user.id,
  })

  if (!context) {
    return notFound()
  }

  return (
    <PageShell maxWidth='3xl'>
      <PageHeader
        title='Funil de Negociações'
        description='Gerencie as fases do seu funil comercial e configure automações de eventos Meta CAPI.'
        icon={Kanban}
      />

      <PageContent>
        <div className='mx-auto max-w-xl'>
          <DealStagesManager organizationId={context.organizationId} projectId={context.projectId} />
        </div>
      </PageContent>
    </PageShell>
  )
}
