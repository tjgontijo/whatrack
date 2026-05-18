import { env } from '@/lib/env/env'

/**
 * Server-only helper for email/template branding.
 * Do not import this in client components.
 */
export function resolveAppName(): string {
  return env.APP_NAME
}
