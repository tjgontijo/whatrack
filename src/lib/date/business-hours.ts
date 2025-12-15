/**
 * Business Hours Utility
 * Checks if current time is within business hours and calculates next business hour
 */

interface BusinessHoursConfig {
  businessHoursOnly: boolean
  businessStartHour: number
  businessEndHour: number
  businessDays: number[]
}

/**
 * Check if current time is within business hours
 */
export function isBusinessHours(config: BusinessHoursConfig): boolean {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()

  if (!config.businessDays.includes(day)) {
    return false
  }

  if (hour < config.businessStartHour || hour >= config.businessEndHour) {
    return false
  }

  return true
}

/**
 * Get the next business hour timestamp
 * Used to reschedule messages that fall outside business hours
 */
export function getNextBusinessHour(config: BusinessHoursConfig): Date {
  const now = new Date()
  const next = new Date(now)

  // Check if today is a business day and we haven't passed start hour
  if (config.businessDays.includes(next.getDay())) {
    const currentHour = next.getHours()

    // If before business hours today, return start of business today
    if (currentHour < config.businessStartHour) {
      next.setHours(config.businessStartHour, 0, 0, 0)
      return next
    }

    // If during business hours, return now (shouldn't reach here normally)
    if (currentHour < config.businessEndHour) {
      return next
    }
  }

  // Find next business day
  do {
    next.setDate(next.getDate() + 1)
  } while (!config.businessDays.includes(next.getDay()))

  // Set to business start hour
  next.setHours(config.businessStartHour, 0, 0, 0)

  return next
}

/**
 * Calculate if a scheduled time falls within business hours
 */
export function isWithinBusinessHours(
  scheduledAt: Date,
  config: BusinessHoursConfig
): boolean {
  const hour = scheduledAt.getHours()
  const day = scheduledAt.getDay()

  if (!config.businessDays.includes(day)) {
    return false
  }

  if (hour < config.businessStartHour || hour >= config.businessEndHour) {
    return false
  }

  return true
}

/**
 * Adjust a scheduled time to the next business hour if it falls outside
 */
export function adjustToBusinessHours(
  scheduledAt: Date,
  config: BusinessHoursConfig
): Date {
  if (isWithinBusinessHours(scheduledAt, config)) {
    return scheduledAt
  }

  const adjusted = new Date(scheduledAt)
  const hour = adjusted.getHours()
  const day = adjusted.getDay()

  // If on a business day but outside hours
  if (config.businessDays.includes(day)) {
    if (hour < config.businessStartHour) {
      adjusted.setHours(config.businessStartHour, 0, 0, 0)
      return adjusted
    }
    // If after business hours, move to next business day
  }

  // Find next business day
  do {
    adjusted.setDate(adjusted.getDate() + 1)
  } while (!config.businessDays.includes(adjusted.getDay()))

  adjusted.setHours(config.businessStartHour, 0, 0, 0)

  return adjusted
}
