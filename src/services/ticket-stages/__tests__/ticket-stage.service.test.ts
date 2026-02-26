import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  ticketStage: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  ticket: {
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

import {
  deleteTicketStage,
  reorderTicketStages,
  updateTicketStage,
} from '@/services/ticket-stages/ticket-stage.service'

describe('ticket-stage.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('unsets previous default stage when setting a new default', async () => {
    prismaMock.ticketStage.findFirst.mockResolvedValueOnce({ id: 'stage-1', name: 'Novo' })
    prismaMock.ticketStage.update.mockResolvedValueOnce({
      id: 'stage-1',
      name: 'Novo',
      color: '#000000',
      order: 0,
      isDefault: true,
      isClosed: false,
      _count: { tickets: 10 },
    })

    const result = await updateTicketStage({
      organizationId: 'org-1',
      stageId: 'stage-1',
      isDefault: true,
    })

    expect(prismaMock.ticketStage.updateMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', id: { not: 'stage-1' } },
      data: { isDefault: false },
    })
    expect('error' in result).toBe(false)
  })

  it('reorders stages when all ids belong to organization', async () => {
    prismaMock.ticketStage.findMany.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
    prismaMock.ticketStage.update.mockResolvedValue({})
    prismaMock.$transaction.mockResolvedValueOnce([])

    const result = await reorderTicketStages({
      organizationId: 'org-1',
      orderedIds: ['a', 'b'],
    })

    expect(result).toEqual({ success: true })
    expect(prismaMock.$transaction).toHaveBeenCalledOnce()
  })

  it('reassigns tickets to default stage before deleting a stage', async () => {
    prismaMock.ticketStage.findFirst
      .mockResolvedValueOnce({ id: 'stage-del', isDefault: false })
      .mockResolvedValueOnce({ id: 'stage-default' })
    prismaMock.ticketStage.count.mockResolvedValueOnce(3)
    prismaMock.ticket.updateMany.mockResolvedValueOnce({ count: 4 })
    prismaMock.ticketStage.delete.mockResolvedValueOnce({})

    const result = await deleteTicketStage({
      organizationId: 'org-1',
      stageId: 'stage-del',
    })

    expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith({
      where: { stageId: 'stage-del', organizationId: 'org-1' },
      data: { stageId: 'stage-default' },
    })
    expect(prismaMock.ticketStage.delete).toHaveBeenCalledWith({ where: { id: 'stage-del' } })
    expect(result).toEqual({ success: true })
  })
})
