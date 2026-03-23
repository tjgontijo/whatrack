import 'server-only'

import { prisma } from '@/lib/db/prisma'
import type {
  ExecutePromptInput,
  ExecutePromptResult,
} from '@/lib/ai/types/execute-prompt'
import { fail, ok, type Result } from '@/lib/shared/result'
import { logger } from '@/lib/utils/logger'
import { getMastraAgentBySlug } from '@/server/mastra/agents'

export async function executePrompt(
  input: ExecutePromptInput
): Promise<Result<ExecutePromptResult>> {
  const startedAt = Date.now()
  const agent = getMastraAgentBySlug(input.agentSlug)

  if (!agent) {
    return fail(`Unknown AI agent slug: ${input.agentSlug}`)
  }

  try {
    if (input.projectId) {
      const projectConfig = await prisma.aiAgentProjectConfig.findFirst({
        where: {
          projectId: input.projectId,
          agent: {
            slug: input.agentSlug,
          },
        },
        select: {
          enabled: true,
          paused: true,
        },
      })

      if (projectConfig && (!projectConfig.enabled || projectConfig.paused)) {
        return fail(
          `AI agent ${input.agentSlug} is disabled for project ${input.projectId}`
        )
      }
    }

    const output = await agent.generate(input.prompt, {
      maxSteps: input.maxSteps,
      modelSettings: input.modelSettings,
    })

    const durationMs = Date.now() - startedAt

    logger.info(
      {
        organizationId: input.organizationId,
        projectId: input.projectId ?? null,
        leadId: input.leadId,
        ticketId: input.ticketId,
        agentSlug: input.agentSlug,
        durationMs,
        inputTokens: output.usage?.inputTokens,
        outputTokens: output.usage?.outputTokens,
      },
      'AI prompt executed'
    )

    return ok({
      agentSlug: input.agentSlug,
      text: output.text,
      finishReason: output.finishReason,
      modelId: output.response?.modelId,
      inputTokens: output.totalUsage?.inputTokens,
      outputTokens: output.totalUsage?.outputTokens,
      totalTokens: output.totalUsage?.totalTokens,
      durationMs,
      runId: output.runId,
      traceId: output.traceId,
    })
  } catch (error) {
    logger.error(
      {
        organizationId: input.organizationId,
        projectId: input.projectId ?? null,
        agentSlug: input.agentSlug,
        error,
      },
      'AI prompt execution failed'
    )

    return fail(
      error instanceof Error ? error.message : 'Unknown AI prompt execution error'
    )
  }
}
