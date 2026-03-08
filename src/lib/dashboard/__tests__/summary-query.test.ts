import { describe, expect, it } from 'vitest'

import { buildDashboardSummaryQuery } from '@/lib/dashboard/summary-query'

describe('buildDashboardSummaryQuery', () => {
  it('includes item category and item filters in the query string', () => {
    const query = buildDashboardSummaryQuery({
      period: '7d',
      trafficSource: 'google',
      trafficType: 'paid',
      itemCategory: 'cat-1',
      item: 'item-1',
    })

    expect(query).toContain('period=7d')
    expect(query).toContain('trafficSource=google')
    expect(query).toContain('trafficType=paid')
    expect(query).toContain('itemCategory=cat-1')
    expect(query).toContain('item=item-1')
  })
})
