import { whatsappMessageReceivedFunction } from '@/server/inngest/functions/whatsapp-message-received'
import { whatsappCampaignDispatchFunction } from '@/server/inngest/functions/whatsapp-campaign'

export const inngestFunctions = [
  whatsappMessageReceivedFunction,
  whatsappCampaignDispatchFunction,
]
