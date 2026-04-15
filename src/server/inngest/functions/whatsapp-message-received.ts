import 'server-only'

import { inngest } from '@/server/inngest/client'
import { logger } from '@/lib/utils/logger'

export const whatsappMessageReceivedFunction = inngest.createFunction(
  {
    id: 'whatsapp-message-received',
    triggers: [{ event: 'whatsapp/message.received' }],
  },
  async ({ event }) => {
    logger.info(
      { eventName: event.name, conversationId: event.data.conversationId },
      '[Inngest] Ignoring whatsapp/message.received after AI cleanup'
    )

    return { skipped: true }
  }
)
