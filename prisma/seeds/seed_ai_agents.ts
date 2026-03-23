import { PrismaClient, Prisma } from '@generated/prisma/client'

const SYSTEM_AI_AGENTS: Array<{
  slug: string
  name: string
  description: string
  type: string
  channel: string
  defaultConfig: Prisma.InputJsonValue
}> = [
  {
    slug: 'whatsapp-inbound',
    name: 'WhatsApp Inbound',
    description: 'Reactive agent for inbound WhatsApp conversations.',
    type: 'reactive',
    channel: 'whatsapp',
    defaultConfig: {
      model: 'openai/gpt-4o-mini',
      temperature: 0.2,
    },
  },
  {
    slug: 'whatsapp-cadence',
    name: 'WhatsApp Cadence',
    description: 'Proactive agent for WhatsApp follow-up cadences.',
    type: 'proactive',
    channel: 'whatsapp',
    defaultConfig: {
      model: 'openai/gpt-4o-mini',
      temperature: 0.3,
    },
  },
  {
    slug: 'audience-intelligence',
    name: 'Audience Intelligence',
    description: 'Analytical agent for segment and audience insights.',
    type: 'analytical',
    channel: 'internal',
    defaultConfig: {
      model: 'openai/gpt-4o-mini',
      temperature: 0.1,
    },
  },
  {
    slug: 'crm-intelligence',
    name: 'CRM Intelligence',
    description: 'Analytical agent for CRM scoring and workflow support.',
    type: 'analytical',
    channel: 'internal',
    defaultConfig: {
      model: 'openai/gpt-4o-mini',
      temperature: 0.1,
    },
  },
  {
    slug: 'campaign-intelligence',
    name: 'Campaign Intelligence',
    description: 'Analytical agent for campaign performance insights.',
    type: 'analytical',
    channel: 'multi',
    defaultConfig: {
      model: 'openai/gpt-4o-mini',
      temperature: 0.1,
    },
  },
]

export async function seedAiAgents(prisma: PrismaClient) {
  for (const agent of SYSTEM_AI_AGENTS) {
    await prisma.aiAgent.upsert({
      where: {
        slug: agent.slug,
      },
      update: {
        name: agent.name,
        description: agent.description,
        type: agent.type,
        channel: agent.channel,
        isSystem: true,
        defaultConfig: agent.defaultConfig,
      },
      create: {
        slug: agent.slug,
        name: agent.name,
        description: agent.description,
        type: agent.type,
        channel: agent.channel,
        isSystem: true,
        defaultConfig: agent.defaultConfig,
      },
    })
  }
}
