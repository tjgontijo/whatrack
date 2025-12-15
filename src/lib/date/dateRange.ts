export const DATE_RANGE_PRESETS = [
  'today',
  'yesterday',
  '3d',
  '7d',
  '15d',
  '30d',
  '60d',
  '90d',
  'thisMonth',
  'lastMonth',
] as const

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]

export type DateRange = { gte: Date; lte: Date }

export function isDateRangePreset(value?: string | null): value is DateRangePreset {
  return Boolean(value && DATE_RANGE_PRESETS.includes(value as DateRangePreset))
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

export function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

export function resolveDateRange(preset: DateRangePreset): DateRange {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  if (preset === 'today') {
    return { gte: todayStart, lte: todayEnd }
  }

  if (preset === 'yesterday') {
    const start = new Date(todayStart)
    const end = new Date(todayEnd)
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() - 1)
    return { gte: start, lte: end }
  }

  if (preset.endsWith('d')) {
    const days = Number.parseInt(preset.replace('d', ''), 10)
    const from = new Date(todayStart)
    from.setDate(from.getDate() - (days - 1))
    return { gte: from, lte: todayEnd }
  }

  if (preset === 'thisMonth') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return { gte: monthStart, lte: todayEnd }
  }

  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
  prevMonthEnd.setMilliseconds(prevMonthEnd.getMilliseconds() - 1)
  return { gte: prevMonthStart, lte: prevMonthEnd }
}
