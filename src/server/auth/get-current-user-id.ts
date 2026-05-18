import "server-only"
import { getOrSyncUser } from './server'

export async function getCurrentUserId(request?: Request): Promise<string | null> {
  const user = await getOrSyncUser(request)
  return user?.id ?? null
}
