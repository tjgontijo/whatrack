import { FolderKanban } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { PageContent } from '@/features/dashboard/components/layout/page-content'
import { PageHeader } from '@/features/dashboard/components/layout/page-header'
import { PageShell } from '@/features/dashboard/components/layout/page-shell'
import { ProjectDetailView } from '@/features/projects/components/project-detail'
import { getProjectById } from '@/features/projects/server'
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
    notFound()
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
    <PageShell maxWidth='7xl'>
      <PageHeader
        title='Projeto'
        description='Acompanhe canais e dados operacionais isolados por cliente.'
        icon={FolderKanban}
      />
      <PageContent>
        <ProjectDetailView project={project} />
      </PageContent>
    </PageShell>
  )
}
