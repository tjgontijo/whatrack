import { describe, expect, it } from 'vitest'
import { Prisma } from '@/lib/db/client'
import { billingProratingService } from '../billing-prorating.service'

describe('BillingProratingService', () => {
  describe('calculateProrating', () => {
    it('should calculate prorating for 15 days remaining', () => {
      const cycleStart = new Date('2026-04-01')
      const upgradeDate = new Date('2026-04-16')
      const cycleEnd = new Date('2026-05-01')

      const result = billingProratingService.calculateProrating({
        oldPlanAmount: new Prisma.Decimal('97.00'),
        newPlanAmount: new Prisma.Decimal('197.00'),
        cycleStartDate: cycleStart,
        upgradeDate,
        cycleEndDate: cycleEnd,
      })

      expect(result.daysRemaining).toBe(15)
      expect(result.creditAmount.toFixed(2)).toBe('48.50')
      expect(result.chargeAmount.toFixed(2)).toBe('98.50')
      expect(result.netAmount.toFixed(2)).toBe('50.00')
    })

    it('should handle upgrade on last day', () => {
      const cycleStart = new Date('2026-04-01')
      const upgradeDate = new Date('2026-04-30')
      const cycleEnd = new Date('2026-05-01')

      const result = billingProratingService.calculateProrating({
        oldPlanAmount: new Prisma.Decimal('97.00'),
        newPlanAmount: new Prisma.Decimal('197.00'),
        cycleStartDate: cycleStart,
        upgradeDate,
        cycleEndDate: cycleEnd,
      })

      expect(result.daysRemaining).toBe(1)
      expect(result.creditAmount.toFixed(2)).toBe('3.23')
      expect(result.chargeAmount.toFixed(2)).toBe('6.57')
    })

    it('should handle upgrade on first day', () => {
      const cycleStart = new Date('2026-04-01')
      const upgradeDate = new Date('2026-04-01')
      const cycleEnd = new Date('2026-05-01')

      const result = billingProratingService.calculateProrating({
        oldPlanAmount: new Prisma.Decimal('97.00'),
        newPlanAmount: new Prisma.Decimal('197.00'),
        cycleStartDate: cycleStart,
        upgradeDate,
        cycleEndDate: cycleEnd,
      })

      expect(result.daysRemaining).toBe(30)
    })

    it('should handle negative days remaining', () => {
      const cycleStart = new Date('2026-04-01')
      const upgradeDate = new Date('2026-05-01')
      const cycleEnd = new Date('2026-05-01')

      const result = billingProratingService.calculateProrating({
        oldPlanAmount: new Prisma.Decimal('97.00'),
        newPlanAmount: new Prisma.Decimal('197.00'),
        cycleStartDate: cycleStart,
        upgradeDate,
        cycleEndDate: cycleEnd,
      })

      expect(result.daysRemaining).toBe(0)
      expect(result.creditAmount.toString()).toBe('0')
      expect(result.netAmount.toFixed(2)).toBe('197.00')
    })

    it('should handle decimal precision correctly', () => {
      const cycleStart = new Date('2026-04-01')
      const upgradeDate = new Date('2026-04-11')
      const cycleEnd = new Date('2026-05-01')

      const result = billingProratingService.calculateProrating({
        oldPlanAmount: new Prisma.Decimal('150.00'),
        newPlanAmount: new Prisma.Decimal('250.00'),
        cycleStartDate: cycleStart,
        upgradeDate,
        cycleEndDate: cycleEnd,
      })

      // 20 days remaining, 30 day cycle
      // Old: 150/30 = 5/day, 20 * 5 = 100
      // New: 250/30 = 8.33/day, 20 * 8.33 = 166.67
      // Net: 66.67

      expect(result.creditAmount.toFixed(2)).toBe('100.00')
      expect(result.chargeAmount.toFixed(2)).toBe('166.67')
      expect(result.netAmount.toFixed(2)).toBe('66.67')
    })
  })
})
