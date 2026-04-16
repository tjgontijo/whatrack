type MetaQueryValue = string | number | boolean | null | undefined

type MetaApiRequestOptions = {
  method?: 'GET' | 'POST'
  params?: Record<string, MetaQueryValue>
  body?: unknown
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data: unknown
  ) {
    super(message)
    this.name = 'MetaApiError'
  }
}

function requireMetaApiVersion(): string {
  const value = process.env.META_API_VERSION
  if (!value) throw new Error('[MetaApi] META_API_VERSION environment variable is required')
  return value
}

function buildMetaUrl(path: string, params?: Record<string, MetaQueryValue>) {
  const normalizedPath = path.replace(/^\/+/, '')
  const url = new URL(`https://graph.facebook.com/${requireMetaApiVersion()}/${normalizedPath}`)

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === null || typeof value === 'undefined') continue
    url.searchParams.set(key, String(value))
  }

  return url
}

function getMetaErrorMessage(data: unknown, fallback: string) {
  if (typeof data !== 'object' || data === null) return fallback

  const metaError = (data as { error?: { message?: string } }).error
  return metaError?.message ?? fallback
}

export async function metaApiRequest<T>(
  path: string,
  options: MetaApiRequestOptions = {}
): Promise<{ data: T; headers: Headers }> {
  const { method = 'GET', params, body } = options
  const response = await fetch(buildMetaUrl(path, params), {
    method,
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: typeof body === 'undefined' ? undefined : JSON.stringify(body),
  })

  const contentType = response.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    throw new MetaApiError(
      getMetaErrorMessage(data, `Meta API request failed with status ${response.status}`),
      response.status,
      data
    )
  }

  return { data: data as T, headers: response.headers }
}

export function getMetaApiErrorMessage(error: unknown, fallback = 'Erro desconhecido') {
  if (error instanceof MetaApiError) {
    return getMetaErrorMessage(error.data, error.message)
  }

  if (error instanceof Error) return error.message
  return fallback
}
