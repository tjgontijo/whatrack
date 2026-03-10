import { FolderKanban } from 'lucide-react'
import { redirect } from 'next/navigation'

import { ProjectList } from '@/components/dashboard/projects/project-list'
import { PageContent } from '@/components/dashboard/layout/page-content'
import { PageHeader } from '@/components/dashboard/layout/page-header'
import { PageShell } from '@/components/dashboard/layout/page-shell'
import { projectListQuerySchema } from '@/schemas/projects/project-schemas'
import { listProjects } from '@/services/projects/project.service'
import { getServerSession } from '@/server/auth/server-session'
import { getCurrentOrganizationId } from '@/server/organization/get-current-organization-id'

type ProjectsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function normalizeSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  return Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  )
}

export const metadata = {
  title: 'Projetos | WhaTrack',
  description: 'Organize os clientes operacionais da sua agência como projetos dentro do WhaTrack.',
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const session = await getServerSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const organizationId = await getCurrentOrganizationId(session.user.id)
  if (!organizationId) {
    redirect('/dashboard')
  }

  const rawSearchParams = normalizeSearchParams((await searchParams) ?? {})
  const filters = projectListQuerySchema.parse(rawSearchParams)
  const data = await listProjects({
    organizationId,
    query: filters,
  })

  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        title="Projetos"
        description="Cada projeto representa um cliente operacional da sua agência, com seus próprios canais e dados."
        icon={FolderKanban}
      />

      <PageContent>
        <ProjectList data={data} filters={filters} />
      </PageContent>
    </PageShell>
  )
}
