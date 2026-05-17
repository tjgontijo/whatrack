import { requireEnv } from '@/lib/env/require-env'

/**
 * Server-only helper for email/template branding.
 * Do not import this in client components.
 */
export function resolveAppName(): string {
  return requireEnv('APP_NAME')
}
