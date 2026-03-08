import { Agent } from '@mastra/core/agent'
import { Prisma } from '@db/client'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { publishToCentrifugo } from '@/lib/centrifugo/server'
import { groq } from '@ai-sdk/groq'
import { openai } from '@ai-sdk/openai'
import { logger } from '@/lib/utils/logger'

type AgentSchemaRow = {
  fieldName: string
  fieldType: string
  description: string
  isRequired: boolean
  options: unknown
}

// Values considered "no signal" — suppress insight creation to keep DB clean.
// Each agent may have a different field name for this concept.
const NEUTRAL_VALUES = new Set(['NEUTRAL', 'COLD', 'SUPPORT'])

function isNeutralResult(data: Record<string, unknown>): boolean {
  for (const value of Object.values(data)) {
    if (typeof value === 'string' && NEUTRAL_VALUES.has(value)) return true
  }
  return false
}

export function resolveModel(modelId: string) {
  if (modelId.startsWith('openai/')) {
    return openai(modelId.replace('openai/', ''))
  }
  // Default: Groq
  return groq(modelId)
}

function buildDynamicZodSchema(fields: AgentSchemaRow[]) {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const field of fields) {
    let zodType: z.ZodTypeAny

    switch (field.fieldType) {
      case 'STRING':
        zodType = z.string()
        break
      case 'NUMBER':
        zodType = z.number()
        break
      case 'BOOLEAN':
        zodType = z.boolean()
        break
      case 'ARRAY':
        zodType = z.array(z.string())
        break
      case 'ENUM':
        if (Array.isArray(field.options) && field.options.length > 0) {
          zodType = z.enum(field.options as [string, ...string[]])
        } else {
          zodType = z.string()
        }
        break
      default:
        zodType = z.string()
    }

    if (field.description) {
      zodType = zodType.describe(field.description)
    }

    if (!field.isRequired) {
      zodType = zodType.nullable().optional()
    }

    shape[field.fieldName] = zodType
  }

  return z.object(shape)
}

// Messages to fetch per agent type.
// Summarizer needs more context; classifiers only need recent exchanges.
const MESSAGE_WINDOW: Record<string, number> = {
  TICKET_CLOSED: 30,   // Summarizer needs the full picture
  CONVERSATION_IDLE_3M: 15, // Classifiers only need recent exchanges
}

const DEFAULT_MESSAGE_WINDOW = 15

export async function dispatchAiEvent(
  eventType: string,
  ticketId: string,
  organizationId: string
): Promise<number> {
  try {
    const agents = await prisma.aiAgent.findMany({
      where: {
        organizationId,
        isActive: true,
        triggers: { some: { eventType } },
      },
      select: {
        id: true,
        name: true,
        leanPrompt: true,
        model: true,
        schemaFields: {
          select: {
            fieldName: true,
            fieldType: true,
            description: true,
            isRequired: true,
            options: true,
          },
        },
        skillBindings: {
          where: {
            isActive: true,
            skill: { isActive: true },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            skill: {
              select: {
                content: true,
              },
            },
          },
        },
      },
    })

    if (agents.length === 0) return 0

    const messageLimit = MESSAGE_WINDOW[eventType] ?? DEFAULT_MESSAGE_WINDOW

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        organizationId: true,
        conversation: {
          select: {
            messages: {
              select: {
                direction: true,
                body: true,
              },
              orderBy: { timestamp: 'desc' },
              take: messageLimit,
            },
          },
        },
      },
    })

    if (!ticket || ticket.conversation.messages.length === 0) return 0

    const history = ticket.conversation.messages
      .reverse()
      .map((m) => `[${m.direction === 'INBOUND' ? 'Cliente' : 'Atendente'}]: ${m.body || '[Mídia]'}`)
      .join('\n')

    let executedCount = 0

    for (const agentDef of agents) {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      const recentInsight = await prisma.aiInsight.findFirst({
        where: {
          ticketId,
          agentId: agentDef.id,
          createdAt: { gte: twoHoursAgo },
        },
      })

      if (recentInsight) {
        logger.info(`[AI] Agent "${agentDef.name}" ran recently on ticket ${ticketId} — skipping`)
        continue
      }

      logger.info(`[AI] Running "${agentDef.name}" on ticket ${ticketId} (${messageLimit} msgs)`)

      const dynamicSchema = buildDynamicZodSchema(agentDef.schemaFields)
      const promptParts = [agentDef.leanPrompt.trim()]
      for (const binding of agentDef.skillBindings) {
        const content = binding.skill.content.trim()
        if (content.length > 0) {
          promptParts.push(content)
        }
      }

      const mastraAgent = new Agent({
        name: agentDef.name,
        id: agentDef.id,
        instructions: promptParts.join('\n\n'),
        model: resolveModel(agentDef.model),
      })

      const fullPrompt =
        `Analise o histórico de atendimento abaixo e retorne a classificação conforme o schema.\n\n` +
        `[HISTÓRICO — ${history.split('\n').length} mensagens]\n${history}`

      try {
        const result = await mastraAgent.generate(fullPrompt, {
          structuredOutput: { schema: dynamicSchema },
        })

        const data = result.object as Record<string, unknown> | undefined

        if (!data || Object.keys(data).length === 0) continue

        if (isNeutralResult(data)) {
          logger.info(`[AI] "${agentDef.name}" returned neutral signal — skipping`)
          continue
        }

        const insight = await prisma.aiInsight.create({
          data: {
            organizationId: ticket.organizationId,
            ticketId: ticket.id,
            agentId: agentDef.id,
            payload: data as Prisma.InputJsonValue,
            status: 'SUGGESTION',
          },
        })

        await publishToCentrifugo(`org:${ticket.organizationId}:ai_insights`, {
          type: 'insight_created',
          insightId: insight.id,
          ticketId: ticket.id,
          agentName: agentDef.name,
          data: insight,
        })

        executedCount++
      } catch (err) {
        logger.error({ err: err }, `[AI] "${agentDef.name}" failed on ticket ${ticketId}`)
      }
    }

    return executedCount
  } catch (error) {
    logger.error({ err: error }, `[AI] dispatchAiEvent error — event=${eventType} ticket=${ticketId}`)
    return 0
  }
}
