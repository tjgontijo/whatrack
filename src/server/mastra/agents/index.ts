import { Agent } from '@mastra/core/agent'

const DEFAULT_MODEL = 'openai/gpt-4o-mini'

export const mastraAgents = {
  whatsappInbound: new Agent({
    id: 'whatsapp-inbound',
    name: 'whatsapp-inbound',
    instructions:
      'You support inbound WhatsApp interactions for the WhaTrack platform.',
    model: DEFAULT_MODEL,
  }),
  whatsappCadence: new Agent({
    id: 'whatsapp-cadence',
    name: 'whatsapp-cadence',
    instructions:
      'You support proactive WhatsApp cadence execution for the WhaTrack platform.',
    model: DEFAULT_MODEL,
  }),
  audienceIntelligence: new Agent({
    id: 'audience-intelligence',
    name: 'audience-intelligence',
    instructions:
      'You analyze audience behavior and summarize segment-level insights.',
    model: DEFAULT_MODEL,
  }),
  crmIntelligence: new Agent({
    id: 'crm-intelligence',
    name: 'crm-intelligence',
    instructions:
      'You analyze CRM state, lead quality, and next-best actions.',
    model: DEFAULT_MODEL,
  }),
  campaignIntelligence: new Agent({
    id: 'campaign-intelligence',
    name: 'campaign-intelligence',
    instructions:
      'You analyze campaign performance and identify operational insights.',
    model: DEFAULT_MODEL,
  }),
} as const

const MASTRA_AGENT_NAME_BY_SLUG = {
  'whatsapp-inbound': 'whatsappInbound',
  'whatsapp-cadence': 'whatsappCadence',
  'audience-intelligence': 'audienceIntelligence',
  'crm-intelligence': 'crmIntelligence',
  'campaign-intelligence': 'campaignIntelligence',
} as const

type MastraAgentName = keyof typeof mastraAgents

export function getMastraAgentNameBySlug(slug: string): MastraAgentName | null {
  return (
    MASTRA_AGENT_NAME_BY_SLUG[
      slug as keyof typeof MASTRA_AGENT_NAME_BY_SLUG
    ] ?? null
  )
}

export function getMastraAgentBySlug(slug: string) {
  const agentName = getMastraAgentNameBySlug(slug)

  return agentName ? mastraAgents[agentName] : null
}
