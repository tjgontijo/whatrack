import { describe, expect, it } from 'vitest'

import {
  campaignsQuerySchema,
  insightsQuerySchema,
  metaAdAccountsQuerySchema,
  metaAdAccountToggleBodySchema,
  metaCopilotAnalyzeRequestSchema,
  metaPixelUpdateBodySchema,
} from '@/schemas/meta-ads/meta-ads-schemas'

describe('meta-ads-schemas', () => {
  it('rejects legacy organizationId in campaigns query', () => {
    const result = campaignsQuerySchema.safeParse({
      days: '7',
      organizationId: 'org-1',
    })

    expect(result.success).toBe(false)
  })

  it('rejects legacy organizationId in insights query', () => {
    const result = insightsQuerySchema.safeParse({
      days: '7',
      organizationId: 'org-1',
    })

    expect(result.success).toBe(false)
  })

  it('rejects legacy organizationId in copilot analyze payload', () => {
    const result = metaCopilotAnalyzeRequestSchema.safeParse({
      organizationId: 'org-1',
      campaignId: 'cmp-1',
      accountId: 'acc-1',
      campaignName: 'Campaign A',
      days: 14,
    })

    expect(result.success).toBe(false)
  })

  it('parses sync query without falling back to query-string org scope', () => {
    const result = metaAdAccountsQuerySchema.safeParse({
      sync: 'true',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ sync: true })
  })

  it('requires at least one field in pixel updates', () => {
    const result = metaPixelUpdateBodySchema.safeParse({})

    expect(result.success).toBe(false)
  })

  it('accepts project assignment in ad account updates', () => {
    const result = metaAdAccountToggleBodySchema.safeParse({
      projectId: 'project-1',
    })

    expect(result.success).toBe(true)
  })

  it('rejects empty ad account update payloads', () => {
    const result = metaAdAccountToggleBodySchema.safeParse({})

    expect(result.success).toBe(false)
  })
})
