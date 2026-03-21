'use client'

import React from 'react'

export interface ProjectRouteContextValue {
  organizationId: string
  organizationSlug: string
  organizationName: string
  organizationLogo?: string | null
  projectId: string
  projectSlug: string
  projectName: string
}

const ProjectRouteContext = React.createContext<ProjectRouteContextValue | null>(null)

export function ProjectRouteProvider({
  value,
  children,
}: {
  value: ProjectRouteContextValue
  children: React.ReactNode
}) {
  return <ProjectRouteContext.Provider value={value}>{children}</ProjectRouteContext.Provider>
}

export function useProjectRouteContext() {
  return React.useContext(ProjectRouteContext)
}

export function useRequiredProjectRouteContext() {
  const context = useProjectRouteContext()

  if (!context) {
    throw new Error('ProjectRouteContext is required for workspace-scoped navigation')
  }

  return context
}

function normalizeProjectPathSuffix(path?: string) {
  if (!path || path === '/') {
    return ''
  }

  return path.startsWith('/') ? path : `/${path}`
}

export function buildProjectPath(
  context: Pick<ProjectRouteContextValue, 'organizationSlug' | 'projectSlug'>,
  path?: string
) {
  return `/${context.organizationSlug}/${context.projectSlug}${normalizeProjectPathSuffix(path)}`
}

export function useProjectPath(path?: string, fallbackPath?: string) {
  const context = useProjectRouteContext()

  if (!context) {
    return fallbackPath ?? path ?? '/welcome'
  }

  return buildProjectPath(context, path)
}

export function useRequiredProjectPath(path?: string) {
  const context = useRequiredProjectRouteContext()
  return buildProjectPath(context, path)
}
