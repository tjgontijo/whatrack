/**
 * Server-only strict env reader.
 * Throws immediately when a required environment variable is missing/empty.
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim().length === 0) {
    throw new Error(`[env] Missing required environment variable: ${name}`)
  }
  return value
}
