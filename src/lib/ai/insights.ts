import type { AiInsightPayload } from '@/types/ai/ai-insight'

const DEFAULT_STATUS = 'SUGGESTION'

export const AI_INSIGHTS_QUERY_KEY = ['ai-insights'] as const

export function buildAiInsightsQueryKey(params: {
  organizationId?: string | null
  status?: string
}) {
  return [
    ...AI_INSIGHTS_QUERY_KEY,
    {
      organizationId: params.organizationId ?? null,
      status: params.status ?? DEFAULT_STATUS,
    },
  ] as const
}

export function readAiInsightPayload(payload: unknown): Required<AiInsightPayload> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      reasoning: null,
      itemName: null,
      dealValue: null,
      intent: null,
    }
  }

  const data = payload as Record<string, unknown>

  return {
    reasoning: typeof data.reasoning === 'string' ? data.reasoning : null,
    itemName: typeof data.itemName === 'string' ? data.itemName : null,
    dealValue:
      typeof data.dealValue === 'number'
        ? data.dealValue
        : typeof data.dealValue === 'string' && data.dealValue.trim().length > 0
          ? Number(data.dealValue)
          : null,
    intent: typeof data.intent === 'string' ? data.intent : null,
  }
}
