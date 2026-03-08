const INTERNAL_PATH_BASE_URL = 'https://whatrack.local'

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
  return sanitizeInternalPath(value) ?? fallbackPath
}
