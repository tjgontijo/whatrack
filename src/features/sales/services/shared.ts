import 'server-only'

import { isDateRangePreset, resolveDateRange } from '@/lib/date/date-range'
import type { CreateSaleInput } from '@/features/sales/schemas/sale.schemas'

export function calculateSaleTotal(payload: CreateSaleInput): number {
  if (!payload.items || payload.items.length === 0) {
    return payload.totalAmount || 0
  }

  let calculatedTotal = payload.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  if (payload.discount) {
    calculatedTotal -= payload.discount
  }

  return calculatedTotal
}

export function resolveSalesDateFilter(dateRange?: string) {
  if (!dateRange || !isDateRangePreset(dateRange)) {
    return undefined
  }

  return resolveDateRange(dateRange)
}
