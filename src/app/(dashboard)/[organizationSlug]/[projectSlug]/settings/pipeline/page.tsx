import { Kanban } from 'lucide-react'
import { PageContent, PageHeader, PageShell } from '@/features/dashboard/components/layout'
import { PipelineStagesManager } from '@/features/dashboard/components/pipeline/pipeline-stages-manager'
import { getOrganizationBySlug } from '@/features/organizations/services/organization.service'
import { getProjectBySlug } from '@/features/projects/services/project.service'
import { getServerSession } from '@/server/auth/server-session'

export const metadata = { title: 'Funil de Negociações — Configurações' }

type PipelinePageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}

export default async function PipelinePage({ params }: PipelinePageProps) {
  const { organizationSlug, projectSlug } = await params
  const session = await getServerSession()
  
  if (!session) return null

  const organization = await getOrganizationBySlug(organizationSlug)
  const project = await getProjectBySlug(organization.id, projectSlug)

  return (
    <PageShell maxWidth='3xl'>
      <PageHeader
        title='Funil de Negociações'
        description='Gerencie as fases do seu funil comercial e configure automações de eventos Meta CAPI.'
        icon={Kanban}
      />

      <PageContent>
        <div className='mx-auto max-w-xl'>
          <PipelineStagesManager organizationId={organization.id} projectId={project.id} />
        </div>
      </PageContent>
    </PageShell>
  )
}
