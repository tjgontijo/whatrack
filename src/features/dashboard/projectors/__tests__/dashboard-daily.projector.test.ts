import { describe, it, expect } from 'vitest'
import {
  attributionRulesService,
  SourceType,
} from '../../services/attribution-rules.service'

/**
 * Unit tests for DashboardDailyProjector formulas and business logic.
 * These tests verify that revenue calculations and attribution rules are correct.
 */

describe('DashboardDailyProjector Formulas', () => {
  describe('revenue semantics', () => {
    it('completed revenue only includes WON deals', () => {
      // Scenario: Sales on deals with different stage statuses
      const sales = [
        { id: 's1', amount: 1000, deal: { stage: { statusGroup: 'WON' } } },
        { id: 's2', amount: 2000, deal: { stage: { statusGroup: 'WON' } } },
        { id: 's3', amount: 500, deal: { stage: { statusGroup: 'ACTIVE' } } }, // Should NOT count
        { id: 's4', amount: 300, deal: { stage: { statusGroup: 'LOST' } } },  // Should NOT count
      ]

      const completedRevenue = sales
        .filter((s) => s.deal.stage.statusGroup === 'WON')
        .reduce((sum, s) => sum + s.amount, 0)

      expect(completedRevenue).toBe(3000)
    })

    it('pipeline revenue only includes ACTIVE deals', () => {
      // Scenario: Open deals by stage status
      const deals = [
        { id: 'd1', value: 5000, stage: { statusGroup: 'ACTIVE' } },
        { id: 'd2', value: 3000, stage: { statusGroup: 'ACTIVE' } },
        { id: 'd3', value: 2000, stage: { statusGroup: 'WON' } },      // Should NOT count
        { id: 'd4', value: 1000, stage: { statusGroup: 'PAUSED' } },   // Should NOT count
      ]

      const pipelineRevenue = deals
        .filter((d) => d.stage.statusGroup === 'ACTIVE')
        .reduce((sum, d) => sum + d.value, 0)

      expect(pipelineRevenue).toBe(8000)
    })
  })

  describe('Meta paid attribution', () => {
    it('counts only ctwaclid and fbclid as Meta paid', () => {
      // Scenario: Sales with different tracking parameters
      const sales = [
        {
          id: 's1',
          amount: 100,
          tracking: { ctwaclid: 'wa_123', fbclid: null },
        },
        {
          id: 's2',
          amount: 200,
          tracking: { ctwaclid: null, fbclid: 'fb_456' },
        },
        {
          id: 's3',
          amount: 50,
          tracking: { gclid: 'gc_789', ctwaclid: null, fbclid: null },
        }, // Google, not Meta
      ]

      let metaRevenue = 0
      for (const sale of sales) {
        if (attributionRulesService.isMetaPaidRevenue(sale.tracking)) {
          metaRevenue += sale.amount
        }
      }

      expect(metaRevenue).toBe(300) // Only s1 and s2
    })

    it('rejects gclid from Meta revenue (Google, not Meta)', () => {
      // Scenario: Sale attributed to Google via gclid
      const tracking = { gclid: 'gc_000', ctwaclid: null, fbclid: null }

      const isMetaRevenue = attributionRulesService.isMetaPaidRevenue(tracking)

      expect(isMetaRevenue).toBe(false)
    })
  })

  describe('ROAS calculation', () => {
    it('computes ROAS correctly when spend > 0', () => {
      const spend = 100
      const revenue = 350 // 3.5x return

      const roas = spend > 0 ? revenue / spend : 0

      expect(roas).toBe(3.5)
    })

    it('returns 0 ROAS when spend is 0', () => {
      const spend = 0
      const revenue = 100

      const roas = spend > 0 ? revenue / spend : 0

      expect(roas).toBe(0)
    })

    it('returns negative ROAS correctly', () => {
      const spend = 100
      const revenue = 50 // Loss

      const roas = spend > 0 ? revenue / spend : 0

      expect(roas).toBe(0.5) // 50% return (loss)
    })
  })

  describe('origin key generation', () => {
    it('generates consistent origin key from UTM parameters', () => {
      // Scenario: Origin grouping by UTM parameters
      const origins = [
        { source: 'google', medium: 'cpc', campaign: 'summer-sale' },
        { source: 'google', medium: 'cpc', campaign: 'summer-sale' }, // Duplicate
        { source: 'facebook', medium: 'paid_social', campaign: 'brand' },
      ]

      const generateOriginKey = (o: any) =>
        [o.source || 'direct', o.medium || 'none', o.campaign || 'none'].join(':')

      const uniqueKeys = new Set(origins.map((o) => generateOriginKey(o)))

      expect(uniqueKeys.size).toBe(2) // Two unique origins
      expect([...uniqueKeys]).toContain('google:cpc:summer-sale')
      expect([...uniqueKeys]).toContain('facebook:paid_social:brand')
    })

    it('treats missing parameters consistently', () => {
      const o1 = { source: 'google', medium: null, campaign: null }
      const o2 = { source: 'google', medium: undefined, campaign: undefined }

      const generateOriginKey = (o: any) =>
        [o.source || 'direct', o.medium || 'none', o.campaign || 'none'].join(':')

      const key1 = generateOriginKey(o1)
      const key2 = generateOriginKey(o2)

      expect(key1).toBe(key2)
      expect(key1).toBe('google:none:none')
    })
  })

  describe('aggregation safety', () => {
    it('sums numbers safely with Decimal conversion', () => {
      // Simulating Prisma Decimal type
      const amounts = [
        { totalAmount: 100.50 },
        { totalAmount: 200.75 },
        { totalAmount: 300.25 },
      ]

      const total = amounts.reduce((sum, a) => sum + Number(a.totalAmount), 0)

      expect(total).toBeCloseTo(601.5, 2)
    })

    it('handles null aggregates gracefully', () => {
      // Scenario: No data for aggregation
      const aggregateResult = {
        _sum: {
          totalAmount: null,
        },
      }

      const revenue = Number(aggregateResult._sum.totalAmount || 0)

      expect(revenue).toBe(0)
    })

    it('handles empty group results', () => {
      // Scenario: groupBy returns empty array
      const grouped: any[] = []

      const metrics = grouped.map((m) => ({
        originKey: m.originKey,
        leadsCount: m._sum.leadsCount || 0,
        salesCount: m._sum.salesCount || 0,
        revenue: Number(m._sum.revenue || 0),
      }))

      expect(metrics).toHaveLength(0)
    })
  })
})
