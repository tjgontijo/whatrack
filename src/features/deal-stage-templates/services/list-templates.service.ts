import "server-only"
import { listTemplatesRepository } from '../repositories/list-templates.repository'

export async function listTemplatesService() {
  const templates = await listTemplatesRepository()
  return { data: templates }
}
