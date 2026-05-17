import { prisma } from './prisma'

/**
 * In-memory cache para lookup tables (LeadSource, TicketStatus, MessageDirection).
 * Evita N queries repetidas no handler.
 * Thread-safe para single-process Node.
 */
class LookupCache {
  private leadSources: Map<string, string> = new Map()
  private ticketStatuses: Map<string, string> = new Map()
  private messageDirections: Map<string, string> = new Map()

  async getLeadSourceId(name: string): Promise<string> {
    if (this.leadSources.has(name)) {
      return this.leadSources.get(name)!
    }
    const source = await prisma.leadSource.findUnique({ where: { name } })
    if (!source) throw new Error(`LeadSource "${name}" not found in database`)
    this.leadSources.set(name, source.id)
    return source.id
  }

  async getTicketStatusId(name: string): Promise<string> {
    if (this.ticketStatuses.has(name)) {
      return this.ticketStatuses.get(name)!
    }
    const status = await prisma.ticketStatus.findUnique({ where: { name } })
    if (!status) throw new Error(`TicketStatus "${name}" not found in database`)
    this.ticketStatuses.set(name, status.id)
    return status.id
  }

  async getMessageDirectionId(name: string): Promise<string> {
    if (this.messageDirections.has(name)) {
      return this.messageDirections.get(name)!
    }
    const direction = await prisma.messageDirection.findUnique({ where: { name } })
    if (!direction) throw new Error(`MessageDirection "${name}" not found in database`)
    this.messageDirections.set(name, direction.id)
    return direction.id
  }
}

export const lookupCache = new LookupCache()
