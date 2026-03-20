import { resolveInternalPath } from '@/lib/utils/internal-path'

export const FUNNEL_QUERY_KEYS = ['intent', 'segment', 'source', 'campaign'] as const

export type FunnelQueryKey = (typeof FUNNEL_QUERY_KEYS)[number]

export type FunnelIntent = Partial<Record<FunnelQueryKey, string>>

type SearchParamReader = Pick<URLSearchParams, 'get'>

function normalizeValue(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export function readFunnelIntent(source: SearchParamReader): FunnelIntent {
  return FUNNEL_QUERY_KEYS.reduce<FunnelIntent>((acc, key) => {
    const value = normalizeValue(source.get(key))
    if (value) {
      acc[key] = value
    }
    return acc
  }, {})
}

export function buildFunnelQueryString(intent: FunnelIntent): string {
  const searchParams = new URLSearchParams()

  for (const key of FUNNEL_QUERY_KEYS) {
    const value = normalizeValue(intent[key])
    if (value) {
      searchParams.set(key, value)
    }
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export function appendFunnelIntent(pathname: string, intent: FunnelIntent): string {
  return `${pathname}${buildFunnelQueryString(intent)}`
}

export function resolvePostAuthPath(nextParam: string | null, intent: FunnelIntent): string {
  const nextPath = normalizeValue(nextParam)
  if (nextPath) {
    if (nextPath === '/app') {
      return appendFunnelIntent('/welcome', intent)
    }

    return resolveInternalPath(nextPath, '/welcome')
  }

  if (intent.intent === 'start-trial') {
    return appendFunnelIntent('/welcome', intent)
  }

  return '/welcome'
}
