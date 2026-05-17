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

export const ProjectRouteContext = React.createContext<ProjectRouteContextValue | null>(null)

export function ProjectRouteProvider({
  value,
  children,
}: {
  value: ProjectRouteContextValue
  children: React.ReactNode
}) {
  return <ProjectRouteContext.Provider value={value}>{children}</ProjectRouteContext.Provider>
}
