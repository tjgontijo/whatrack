import { Prisma } from '@generated/prisma/client'

export interface ProratingResult {
  creditAmount: Prisma.Decimal
  chargeAmount: Prisma.Decimal
  netAmount: Prisma.Decimal
  daysRemaining: number
}

export class BillingProratingService {
  calculateProrating(input: {
    oldPlanAmount: Prisma.Decimal
    newPlanAmount: Prisma.Decimal
    cycleStartDate: Date
    upgradeDate: Date
    cycleEndDate: Date
  }): ProratingResult {
    const { oldPlanAmount, newPlanAmount, cycleStartDate, upgradeDate, cycleEndDate } = input

    const daysRemaining = this.calculateDaysRemaining(upgradeDate, cycleEndDate)
    const totalDaysInCycle = this.calculateDaysRemaining(cycleStartDate, cycleEndDate)

    if (daysRemaining <= 0 || totalDaysInCycle <= 0) {
      return {
        creditAmount: new Prisma.Decimal(0),
        chargeAmount: newPlanAmount,
        netAmount: newPlanAmount,
        daysRemaining: 0,
      }
    }

    const dailyRateOld = oldPlanAmount.dividedBy(totalDaysInCycle)
    const dailyRateNew = newPlanAmount.dividedBy(totalDaysInCycle)

    const creditAmount = dailyRateOld.times(daysRemaining).toDecimalPlaces(2)
    const chargeAmount = dailyRateNew.times(daysRemaining).toDecimalPlaces(2)
    const netAmount = chargeAmount.minus(creditAmount).toDecimalPlaces(2)

    return {
      creditAmount,
      chargeAmount,
      netAmount,
      daysRemaining,
    }
  }

  private calculateDaysRemaining(fromDate: Date, toDate: Date): number {
    const from = new Date(fromDate)
    const to = new Date(toDate)

    from.setHours(0, 0, 0, 0)
    to.setHours(0, 0, 0, 0)

    const diffTime = Math.abs(to.getTime() - from.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    return diffDays
  }
}

export const billingProratingService = new BillingProratingService()
