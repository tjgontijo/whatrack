import { getRedis } from '@/lib/db/redis'
import { CACHE_KEYS, CACHE_TTL } from '@/lib/db/cache-keys'

/**
 * Schedules a ticket for AI analysis after IDLE_SEC seconds of inactivity.
 *
 * Uses Redis SETEX as a debounce: every new message resets the timer.
 * The key expires when the idle window passes, making it visible to the job poller.
 *
 * Called by message.handler on every inbound message (fire-and-forget).
 */
export async function scheduleAiClassification(
  ticketId: string,
  organizationId: string,
): Promise<void> {
  const redis = getRedis()
  const key = CACHE_KEYS.ai.classifierPending(ticketId)

  // Value stores the orgId so the job poller knows which org to dispatch to
  // SETEX resets the TTL on every call — natural debounce
  await redis.setex(key, CACHE_TTL.AI_CLASSIFIER_IDLE_SEC, organizationId)
}

/**
 * Drains all tickets whose idle window has expired and returns them for processing.
 *
 * Strategy: scan for keys matching ai:classifier:pending:* that are about to expire
 * (TTL <= 0 means they already expired and Redis deleted them — we can't scan those).
 *
 * Instead, the job endpoint uses a Sorted Set as a secondary index:
 * - On schedule: ZADD ai:classifier:queue <triggerAt timestamp> <ticketId:orgId>
 * - On drain: ZRANGEBYSCORE ai:classifier:queue 0 <now>, then ZREM processed ones
 *
 * This avoids a full KEYS scan and works correctly across multiple serverless instances.
 */

const QUEUE_KEY = 'ai:classifier:queue'

export async function enqueueForClassification(
  ticketId: string,
  organizationId: string,
): Promise<void> {
  const redis = getRedis()
  const triggerAt = Date.now() + CACHE_TTL.AI_CLASSIFIER_IDLE_SEC * 1000
  const member = `${ticketId}:${organizationId}`

  // ZADD NX: only add if not already present (don't reset score on every message)
  // We want the FIRST message to set the trigger time, subsequent ones reset via XX + GT
  // XX GT: update score only if new score > existing (i.e. push the trigger further on activity)
  await redis.zadd(QUEUE_KEY, 'XX', 'GT', triggerAt, member)

  // If the key didn't exist yet (NX path), add it unconditionally
  await redis.zadd(QUEUE_KEY, 'NX', triggerAt, member)
}

/**
 * Dequeues all entries whose triggerAt <= now (idle window has passed).
 * Returns an array of { ticketId, organizationId } ready for dispatchAiEvent.
 *
 * Atomically removes the returned members so concurrent job runs don't double-process.
 */
export async function drainDueClassifications(
  limit = 20,
): Promise<Array<{ ticketId: string; organizationId: string }>> {
  const redis = getRedis()
  const now = Date.now()

  // Fetch members whose score (triggerAt) is in the past
  const members = await redis.zrangebyscore(QUEUE_KEY, 0, now, 'LIMIT', 0, limit)

  if (members.length === 0) return []

  // Remove them atomically to prevent double-processing
  await redis.zrem(QUEUE_KEY, ...members)

  return members.map((member) => {
    const colonIndex = member.indexOf(':')
    return {
      ticketId: member.slice(0, colonIndex),
      organizationId: member.slice(colonIndex + 1),
    }
  })
}
