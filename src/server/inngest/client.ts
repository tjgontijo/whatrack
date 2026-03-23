import 'server-only'

import { Inngest } from 'inngest'
import { env } from '@/lib/env/env'
import { logger } from '@/lib/utils/logger'
import type { AiInngestEventPayload } from '@/server/inngest/events'

export const inngest = new Inngest({
  id: env.INNGEST_APP_ID,
  eventKey: env.INNGEST_EVENT_KEY,
  baseUrl: env.INNGEST_BASE_URL,
  logger,
})

export async function sendInngestEvent(event: AiInngestEventPayload) {
  return inngest.send(event as any)
}
