import { FolderKanban } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'

import { ProjectDetailView } from '@/components/dashboard/projects/project-detail'
import { PageContent } from '@/components/dashboard/layout/page-content'
import { PageHeader } from '@/components/dashboard/layout/page-header'
import { PageShell } from '@/components/dashboard/layout/page-shell'
import { getProjectById } from '@/services/projects/project.service'
import { getServerSession } from '@/server/auth/server-session'
import { getCurrentOrganizationId } from '@/server/organization/get-current-organization-id'

type ProjectDetailPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const session = await getServerSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const organizationId = await getCurrentOrganizationId(session.user.id)
  if (!organizationId) {
    redirect('/dashboard')
  }

  const { projectId } = await params
  const project = await getProjectById({
    organizationId,
    projectId,
  })

  if (!project) {
    notFound()
  }

  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        title="Projeto"
        description="Acompanhe canais e dados operacionais isolados por cliente."
        icon={FolderKanban}
      />
      <PageContent>
        <ProjectDetailView project={project} />
      </PageContent>
    </PageShell>
  )
}
