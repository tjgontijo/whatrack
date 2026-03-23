import 'server-only'

import { Mastra } from '@mastra/core/mastra'
import { PostgresStore } from '@mastra/pg'
import { env } from '@/lib/env/env'
import { mastraAgents } from '@/server/mastra/agents'

export const mastraStorage = new PostgresStore({
  id: 'whatrack-mastra',
  connectionString: env.DATABASE_URL,
})

export const mastra = new Mastra({
  agents: mastraAgents,
  storage: mastraStorage,
})
