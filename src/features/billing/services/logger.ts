import { logger } from '@/lib/utils/logger'

type BillingLogLevel = 'info' | 'warn' | 'error'

export function billingLog(level: BillingLogLevel, message: string, context?: Record<string, unknown>) {
  logger[level]({ context }, `[billing] ${message}`)
}
