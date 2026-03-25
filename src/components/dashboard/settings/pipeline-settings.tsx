'use client'

import { Kanban } from 'lucide-react'

import { useOrganization } from '@/hooks/organization/use-organization'
import { useProject } from '@/hooks/project/use-project'
import { PageShell, PageHeader, PageContent } from '@/components/dashboard/layout'
import { PipelineStagesManager } from '@/components/dashboard/pipeline/pipeline-stages-manager'

export function PipelineSettings() {
  const { data: org } = useOrganization()
  const { data: project } = useProject()
  const organizationId = org?.id
  const projectId = project?.id

  return (
    <PageShell maxWidth="3xl">
      <PageHeader title="Pipeline" description="Gerencie as fases do seu funil de tickets" icon={Kanban} />

      <PageContent>
        <div className="mx-auto max-w-xl">
          <PipelineStagesManager organizationId={organizationId} projectId={projectId} />
        </div>
      </PageContent>
    </PageShell>
  )
}
