import 'server-only'

import { Prisma } from '@/lib/db/client'
import { prisma } from '@/lib/db/prisma'
import { longMemorySchema } from '@/lib/ai/schemas/long-memory'
import type {
  LeadAiContextUpdate,
  LeadContextForPrompt,
} from '@/lib/ai/types/lead-ai-context'
import { fail, ok, type Result } from '@/lib/shared/result'

function omitUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>
}

async function resolveLeadScope(leadId: string) {
  return prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      organizationId: true,
      projectId: true,
      name: true,
      mail: true,
      phone: true,
      waId: true,
      pushName: true,
    },
  })
}

export async function ensureContext(leadId: string) {
  const lead = await resolveLeadScope(leadId)

  if (!lead) {
    return fail(`Lead ${leadId} not found`)
  }

  const context = await prisma.leadAiContext.upsert({
    where: { leadId },
    update: {
      organizationId: lead.organizationId,
      projectId: lead.projectId,
    },
    create: {
      leadId,
      organizationId: lead.organizationId,
      projectId: lead.projectId,
    },
  })

  return ok(context)
}

export async function updateContext(
  leadId: string,
  data: LeadAiContextUpdate
): Promise<Result<Awaited<ReturnType<typeof prisma.leadAiContext.update>>>> {
  const ensured = await ensureContext(leadId)

  if (!ensured.success) {
    return ensured
  }

  const lead = await resolveLeadScope(leadId)

  if (!lead) {
    return fail(`Lead ${leadId} not found`)
  }

  const payload = omitUndefined({
    organizationId: lead.organizationId,
    projectId: lead.projectId,
    profileSummary: data.profileSummary,
    detectedLanguage: data.detectedLanguage,
    sentimentTrend: data.sentimentTrend,
    lifecycleStage: data.lifecycleStage,
    aiScore: data.aiScore,
    aiScoreReason: data.aiScoreReason,
    aiScoreUpdatedAt: data.aiScoreUpdatedAt,
    suggestedNextAction: data.suggestedNextAction,
    suggestedNextActionAt: data.suggestedNextActionAt,
  }) as Prisma.LeadAiContextUncheckedUpdateInput

  if (data.longMemory !== undefined) {
    payload.longMemory =
      data.longMemory === null
        ? Prisma.JsonNull
        : (longMemorySchema.parse(data.longMemory) as unknown as Prisma.InputJsonValue)
  }

  const context = await prisma.leadAiContext.update({
    where: { leadId },
    data: payload,
  })

  return ok(context)
}

export async function updateLongMemory(leadId: string, memory: unknown) {
  const parsed = longMemorySchema.parse(memory)

  return updateContext(leadId, {
    longMemory: parsed as unknown as Prisma.InputJsonValue,
  })
}

export async function getContextForPrompt(
  leadId: string
): Promise<Result<LeadContextForPrompt>> {
  const lead = await resolveLeadScope(leadId)

  if (!lead) {
    return fail(`Lead ${leadId} not found`)
  }

  const ensured = await ensureContext(leadId)

  if (!ensured.success) {
    return ensured
  }

  return ok({
    lead: {
      id: lead.id,
      organizationId: lead.organizationId,
      projectId: lead.projectId,
      name: lead.name,
      mail: lead.mail,
      phone: lead.phone,
      waId: lead.waId,
      pushName: lead.pushName,
    },
    context: {
      id: ensured.data.id,
      profileSummary: ensured.data.profileSummary,
      detectedLanguage: ensured.data.detectedLanguage,
      sentimentTrend: ensured.data.sentimentTrend,
      lifecycleStage: ensured.data.lifecycleStage,
      aiScore: ensured.data.aiScore,
      aiScoreReason: ensured.data.aiScoreReason,
      suggestedNextAction: ensured.data.suggestedNextAction,
      longMemory:
        ensured.data.longMemory === null
          ? null
          : longMemorySchema.parse(ensured.data.longMemory),
    },
  })
}

export const leadAiContextService = {
  ensureContext,
  updateContext,
  updateLongMemory,
  getContextForPrompt,
}
