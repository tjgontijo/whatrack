import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  metaPixel: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

import { updateMetaPixel } from '@/services/meta-ads/meta-pixel.service'

describe('meta-pixel.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when pixel does not belong to organization', async () => {
    prismaMock.metaPixel.findFirst.mockResolvedValueOnce(null)

    const result = await updateMetaPixel({
      organizationId: 'org-1',
      routeId: 'pixel-1',
      name: 'New name',
    })

    expect(result).toEqual({ error: 'Pixel not found', status: 404 })
  })

  it('updates pixel fields when found', async () => {
    prismaMock.metaPixel.findFirst.mockResolvedValueOnce({ id: 'pixel-1' })
    prismaMock.metaPixel.update.mockResolvedValueOnce({ id: 'pixel-1', name: 'Pixel A' })

    const result = await updateMetaPixel({
      organizationId: 'org-1',
      routeId: 'pixel-1',
      name: 'Pixel A',
      isActive: true,
    })

    expect(prismaMock.metaPixel.update).toHaveBeenCalledWith({
      where: { id: 'pixel-1' },
      data: { name: 'Pixel A', isActive: true },
    })
    expect(result).toEqual({ data: { id: 'pixel-1', name: 'Pixel A' } })
  })
})
