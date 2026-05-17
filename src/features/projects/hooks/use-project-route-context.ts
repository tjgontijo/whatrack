'use client'

import React from 'react'

import { ProjectRouteContext } from '@/features/projects/contexts/project-route.context'
import { buildProjectPath } from '@/features/projects/utils/build-project-path'

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
