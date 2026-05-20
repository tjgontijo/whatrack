import 'server-only'

import {
  appendFunnelIntent,
  type FunnelIntent,
  resolvePostAuthPath,
} from '@/lib/funnel/funnel-intent'
import { logger } from '@/lib/utils/logger'

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
    logger.debug({ userId: input.userId, nextParam }, '[resolve-post-auth-path] using nextParam')
    return resolvePostAuthPath(nextParam, input.intent)
  }

  const defaultWorkspacePath = await resolveDefaultWorkspacePath(input.userId)
  if (defaultWorkspacePath) {
    logger.debug(
      { userId: input.userId, defaultWorkspacePath },
      '[resolve-post-auth-path] using defaultWorkspacePath'
    )
    return defaultWorkspacePath
  }

  logger.warn(
    { userId: input.userId, intent: input.intent },
    '[resolve-post-auth-path] no workspace found, falling back to /welcome'
  )

  if (input.intent.intent === 'start-trial') {
    return appendFunnelIntent('/welcome', input.intent)
  }

  return '/welcome'
}
