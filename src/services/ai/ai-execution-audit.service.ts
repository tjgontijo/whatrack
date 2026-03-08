import { Agent } from '@mastra/core/agent'
import { Prisma } from '@db/client'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { resolveModel } from './ai-execution.service'
import { recordAiCost } from './ai-cost-tracking.service'
import { logger } from '@/lib/utils/logger'

type AgentSchemaRow = {
  fieldName: string
  fieldType: string
  description: string
  isRequired: boolean
  options: unknown
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

/**
 * Dispatch AI event for non-ticket audits (e.g., Meta Ads account analysis)
 *
 * @param eventType - Event trigger type (e.g., "META_ADS_AUDIT_REQUESTED")
 * @param organizationId - Organization ID
 * @param customContext - Custom data context (e.g., Meta Ads account data)
 * @returns AiInsight record
 */
export async function dispatchAiEventForAudit(
  eventType: string,
  organizationId: string,
  customContext: Record<string, unknown>
): Promise<any> {
  const startTime = performance.now()

  try {
    logger.info(
      `[AI Audit] Starting ${eventType} for org ${organizationId}`
    )

    // 1. Find active agent for this event type
    const agentDef = await prisma.aiAgent.findFirst({
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

    if (!agentDef) {
      throw new Error(`No active agent found for event type: ${eventType}`)
    }

    logger.info(`[AI Audit] Using agent: ${agentDef.name}`)

    // 2. Format context data for the agent
    const contextData = formatAuditContext(customContext)

    // 3. Build prompt with skills
    const dynamicSchema = buildDynamicZodSchema(agentDef.schemaFields)
    const promptParts = [agentDef.leanPrompt.trim()]

    for (const binding of agentDef.skillBindings) {
      const content = binding.skill.content.trim()
      if (content.length > 0) {
        promptParts.push(content)
      }
    }

    const fullPrompt =
      `Analise o contexto fornecido abaixo:\n\n${contextData}\n\n` +
      `Retorne a classificação conforme o schema.`

    logger.info(
      `[AI Audit] Running agent with ${promptParts.length} skill(s)`
    )

    // 4. Run Mastra agent
    const mastraAgent = new Agent({
      name: agentDef.name,
      id: agentDef.id,
      instructions: promptParts.join('\n\n'),
      model: resolveModel(agentDef.model),
    })

    const result = await mastraAgent.generate(fullPrompt, {
      structuredOutput: { schema: dynamicSchema },
    })

    const latencyMs = performance.now() - startTime

    if (!result.object || Object.keys(result.object).length === 0) {
      throw new Error('Agent returned empty result')
    }

    logger.info(
      `[AI Audit] Agent succeeded in ${latencyMs.toFixed(0)}ms`
    )

    // 5. Create AiInsight record
    const insight = await prisma.aiInsight.create({
      data: {
        organizationId,
        eventType,
        agentId: agentDef.id,
        payload: result.object as Prisma.InputJsonValue,
        status: 'SUGGESTION',
      },
    })

    logger.info(`[AI Audit] Created insight: ${insight.id}`)

    // 6. Record cost
    try {
      await recordAiCost({
        organizationId,
        aiInsightId: insight.id,
        feature: 'meta-ads-audit',
        operation: 'account-analysis',
        agentName: agentDef.name,
        eventType,
        modelUsed: agentDef.model,
        inputTokens: result.usage?.inputTokens || 0,
        outputTokens: result.usage?.outputTokens || 0,
        latencyMs: Math.round(latencyMs),
        status: 'success',
      })
      logger.info(`[AI Audit] Recorded cost for insight: ${insight.id}`)
    } catch (costError) {
      logger.warn(
        { err: costError },
        `[AI Audit] Failed to record cost for insight: ${insight.id}`
      )
      // Don't fail the whole operation if cost recording fails
    }

    return insight
  } catch (error) {
    const latencyMs = performance.now() - startTime
    logger.error(
      { err: error },
      `[AI Audit] Failed after ${latencyMs.toFixed(0)}ms for ${eventType}`
    )

    // Record error cost too
    try {
      await recordAiCost({
        organizationId,
        aiInsightId: 'error',
        feature: 'meta-ads-audit',
        operation: 'account-analysis',
        agentName: 'Unknown',
        eventType,
        modelUsed: 'unknown',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Math.round(latencyMs),
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
    } catch (costError) {
      logger.warn(
        { err: costError },
        `[AI Audit] Failed to record error cost for ${eventType}`
      )
    }

    throw error
  }
}

/**
 * Format custom context data into readable format for agent
 */
function formatAuditContext(context: Record<string, unknown>): string {
  const lines: string[] = []

  for (const [key, value] of Object.entries(context)) {
    if (value === null || value === undefined) continue

    if (Array.isArray(value)) {
      lines.push(`[${key.toUpperCase()}] (${value.length} items)`)
      value.slice(0, 5).forEach((item, idx) => {
        lines.push(`  ${idx + 1}. ${JSON.stringify(item, null, 2)}`)
      })
      if (value.length > 5) {
        lines.push(`  ... and ${value.length - 5} more`)
      }
    } else if (typeof value === 'object') {
      lines.push(`[${key.toUpperCase()}]`)
      lines.push(JSON.stringify(value, null, 2))
    } else {
      lines.push(`${key}: ${value}`)
    }
  }

  return lines.join('\n')
}
