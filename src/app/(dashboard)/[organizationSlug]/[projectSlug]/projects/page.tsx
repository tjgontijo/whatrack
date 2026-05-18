import { RefreshCw } from 'lucide-react'
import { Suspense } from 'react'

import { ProjectList } from '@/features/projects/components/project-list'

export const metadata = {
  title: 'Projetos | WhaTrack',
  description: 'Organize os clientes operacionais da sua agência como projetos dentro do WhaTrack.',
}

function ProjectsPageFallback() {
  return (
    <div className='flex h-[400px] w-full items-center justify-center rounded-xl border border-dashed text-muted-foreground'>
      <RefreshCw className='mr-2 h-4 w-4 animate-spin opacity-50' />
      <span className='font-medium text-sm'>Carregando projetos...</span>
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <div className='flex h-full w-full flex-col rounded-xl bg-muted/5 sm:bg-transparent'>
      <Suspense fallback={<ProjectsPageFallback />}>
        <ProjectList />
      </Suspense>
    </div>
  )
}
