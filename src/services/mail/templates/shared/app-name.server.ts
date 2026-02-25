import 'server-only'

import { requireEnv } from '@/lib/env/require-env.server'

/**
 * Server-only helper for email/template branding.
 * Do not import this in client components.
 */
export function resolveAppName(): string {
  return requireEnv('APP_NAME')
}
