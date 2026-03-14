import { randomUUID } from 'crypto'

import { getRedis } from '@/lib/db/redis'

const OAUTH_STATE_TTL_SECONDS = 600

interface MetaOAuthStatePayload {
  organizationId: string
  userId: string
  projectId?: string
}

export async function createMetaOAuthState(payload: MetaOAuthStatePayload): Promise<string> {
  const stateToken = randomUUID()
  const redis = getRedis()

  await redis.setex(
    `oauth_state:${stateToken}`,
    OAUTH_STATE_TTL_SECONDS,
    JSON.stringify({ organizationId: payload.organizationId, userId: payload.userId })
  )

  return stateToken
}

export async function consumeMetaOAuthState(stateToken: string): Promise<MetaOAuthStatePayload | null> {
  const redis = getRedis()
  const stateKey = `oauth_state:${stateToken}`
  const stateRaw = await redis.get(stateKey)

  if (!stateRaw) {
    return null
  }

  await redis.del(stateKey)

  try {
    const parsed = JSON.parse(stateRaw) as MetaOAuthStatePayload
    if (!parsed.organizationId || !parsed.userId) {
      return null
    }

    // projectId is optional and may be included
    return {
      organizationId: parsed.organizationId,
      userId: parsed.userId,
      projectId: parsed.projectId,
    }
  } catch {
    return null
  }
}
