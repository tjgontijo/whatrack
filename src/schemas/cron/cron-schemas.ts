import { z } from 'zod'

// Cron triggers accept an empty JSON body from n8n.
export const cronTriggerBodySchema = z.object({}).passthrough()
