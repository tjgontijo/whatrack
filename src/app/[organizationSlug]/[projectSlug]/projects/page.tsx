import { Suspense } from 'react'
import { RefreshCw } from 'lucide-react'

import { ProjectList } from '@/components/dashboard/projects/project-list'

export const metadata = {
  title: 'Projetos | WhaTrack',
  description: 'Organize os clientes operacionais da sua agência como projetos dentro do WhaTrack.',
}

function ProjectsPageFallback() {
  return (
    <div className="text-muted-foreground flex h-[400px] w-full items-center justify-center rounded-xl border border-dashed">
      <RefreshCw className="mr-2 h-4 w-4 animate-spin opacity-50" />
      <span className="text-sm font-medium">Carregando projetos...</span>
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <div className="bg-muted/5 flex h-full w-full flex-col rounded-xl sm:bg-transparent">
      <Suspense fallback={<ProjectsPageFallback />}>
        <ProjectList />
      </Suspense>
    </div>
  )
}
