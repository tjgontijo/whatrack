import { describe, expect, it } from 'vitest'

import { AI_INSIGHTS_QUERY_KEY, buildAiInsightsQueryKey, readAiInsightPayload } from '@/lib/ai/insights'

describe('ai insight helpers', () => {
  it('builds a shared query key for suggestion lists by organization', () => {
    expect(AI_INSIGHTS_QUERY_KEY).toEqual(['ai-insights'])
    expect(
      buildAiInsightsQueryKey({
        organizationId: 'org-1',
      })
    ).toEqual(['ai-insights', { organizationId: 'org-1', status: 'SUGGESTION' }])
  })

  it('reads only supported payload fields and normalizes deal value', () => {
    expect(
      readAiInsightPayload({
        reasoning: 'Cliente pediu fechamento imediato',
        itemName: 'Plano Pro',
        dealValue: '199.90',
        intent: 'SALE',
        ignored: true,
      })
    ).toEqual({
      reasoning: 'Cliente pediu fechamento imediato',
      itemName: 'Plano Pro',
      dealValue: 199.9,
      intent: 'SALE',
    })

    expect(readAiInsightPayload(null)).toEqual({
      reasoning: null,
      itemName: null,
      dealValue: null,
      intent: null,
    })
  })
})
