import 'server-only'

import { appendFunnelIntent, type FunnelIntent, resolvePostAuthPath } from '@/lib/funnel/funnel-intent'

import { resolveDefaultWorkspacePath } from './resolve-default-workspace-path'

function normalizeValue(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export async function resolvePostSignInPath(input: {
  userId: string
  nextParam?: string | null
  intent: FunnelIntent
}): Promise<string> {
  const nextParam = normalizeValue(input.nextParam)

  if (nextParam) {
    return resolvePostAuthPath(nextParam, input.intent)
  }

  const defaultWorkspacePath = await resolveDefaultWorkspacePath(input.userId)
  if (defaultWorkspacePath) {
    return defaultWorkspacePath
  }

  if (input.intent.intent === 'start-trial') {
    return appendFunnelIntent('/welcome', input.intent)
  }

  return '/welcome'
}
