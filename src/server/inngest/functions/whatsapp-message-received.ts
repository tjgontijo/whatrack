import 'server-only'

import { inngest } from '@/server/inngest/client'
import { runInboundMessageWorkflow } from '@/server/mastra/workflows/inbound-message'

export const whatsappMessageReceivedFunction = inngest.createFunction(
  {
    id: 'whatsapp-message-received',
    triggers: [{ event: 'whatsapp/message.received' }],
  },
  async ({ event, step }) => {
    const debounceMs = Math.min(Math.max(event.data.debounceMs ?? 8000, 1000), 60000)

    await step.sleep('debounce-inbound-buffer', `${debounceMs}ms`)

    return step.run('run-inbound-message-workflow', async () =>
      runInboundMessageWorkflow({
        organizationId: event.data.organizationId,
        projectId: event.data.projectId,
        conversationId: event.data.conversationId,
        messageId: event.data.messageId,
      })
    )
  }
)
