import "server-only"
import { listTemplatesRepository } from '../repositories/list-templates.repository'

export async function listTemplatesService(organizationId?: string, projectId?: string) {
  const templates = await listTemplatesRepository(organizationId, projectId)
  return { data: templates }
}
