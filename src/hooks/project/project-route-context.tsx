'use client'

import React from 'react'

export interface ProjectRouteContextValue {
  organizationId: string
  organizationSlug: string
  organizationName: string
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
