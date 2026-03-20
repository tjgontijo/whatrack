const INTERNAL_PATH_BASE_URL = 'https://whatrack.local'
const LEGACY_WORKSPACE_PREFIX = '/dashboard'
const LEGACY_APP_ENTRY_PATH = '/app'

export function sanitizeInternalPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return null
  }

  try {
    const url = new URL(value, INTERNAL_PATH_BASE_URL)

    if (url.origin !== INTERNAL_PATH_BASE_URL) {
      return null
    }

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function resolveInternalPath(
  value: string | null | undefined,
  fallbackPath: string
): string {
  const sanitizedPath = sanitizeInternalPath(value)

  if (!sanitizedPath) {
    return fallbackPath
  }

  if (sanitizedPath === LEGACY_APP_ENTRY_PATH || sanitizedPath.startsWith(LEGACY_WORKSPACE_PREFIX)) {
    const url = new URL(sanitizedPath, INTERNAL_PATH_BASE_URL)
    return `/welcome${url.search}${url.hash}`
  }

  return sanitizedPath
}
