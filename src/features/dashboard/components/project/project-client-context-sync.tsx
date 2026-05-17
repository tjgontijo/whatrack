'use client'

import { useLayoutEffect } from 'react'

import { setClientProjectId } from '@/lib/project-client-context'

export function ProjectClientContextSync({ projectId }: { projectId: string }) {
  useLayoutEffect(() => {
    setClientProjectId(projectId)

    return () => {
      setClientProjectId(null)
    }
  }, [projectId])

  return null
}
