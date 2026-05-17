import type { ProjectRouteContextValue } from '@/features/projects/contexts/project-route.context'

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
