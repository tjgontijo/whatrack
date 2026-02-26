import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  item: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

import { deleteItem, listItems, toggleItemActive } from '@/services/items/item.service'

describe('item.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('soft deletes item when it is referenced by sale items', async () => {
    prismaMock.item.findFirst.mockResolvedValueOnce({
      id: 'item-1',
      _count: { saleItems: 3 },
    })
    prismaMock.item.update.mockResolvedValueOnce({})

    const result = await deleteItem({
      organizationId: 'org-1',
      itemId: 'item-1',
    })

    expect(prismaMock.item.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { active: false },
    })
    expect(result).toEqual({
      success: true,
      message: 'Item desativado (está sendo usado em vendas)',
    })
  })

  it('toggles active flag for item', async () => {
    prismaMock.item.findFirst.mockResolvedValueOnce({
      id: 'item-1',
      active: true,
    })
    prismaMock.item.update.mockResolvedValueOnce({
      id: 'item-1',
      organizationId: 'org-1',
      categoryId: null,
      name: 'Produto',
      active: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    })

    const result = await toggleItemActive({
      organizationId: 'org-1',
      itemId: 'item-1',
    })

    expect(prismaMock.item.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { active: false } })
    )
    expect('error' in result).toBe(false)
  })

  it('applies category and status filters when listing items', async () => {
    prismaMock.item.findMany.mockResolvedValueOnce([
      {
        id: 'item-1',
        name: 'Produto',
        active: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        category: { id: 'cat-1', name: 'Categoria A' },
      },
    ])
    prismaMock.item.count.mockResolvedValueOnce(1)

    const response = await listItems({
      organizationId: 'org-1',
      categoryId: 'cat-1',
      status: 'active',
      page: 1,
      pageSize: 20,
    })

    expect(prismaMock.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          categoryId: 'cat-1',
          active: true,
        }),
      })
    )
    expect(response.total).toBe(1)
    expect(response.items[0]?.category?.id).toBe('cat-1')
  })
})
