import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

import {
  listProducts,
  createProduct,
  listCategories,
  createCategory,
} from '../service'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    productCategory: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}))

describe('products service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listProducts', () => {
    it('filtra por organização, aplica paginação e converte valores monetários', async () => {
      const mockProduct = {
        id: 'prod-1',
        organizationId: 'org-1',
        name: 'Depilação Premium',
        active: true,
        categoryId: 'cat-1',
        price: new Prisma.Decimal('450.50'),
        cost: new Prisma.Decimal('220.00'),
        createdAt: new Date('2024-01-10T10:00:00Z'),
        updatedAt: new Date('2024-01-12T12:00:00Z'),
        category: {
          id: 'cat-1',
          name: 'Depilação',
        },
      }

      vi.mocked(prisma.product.findMany).mockResolvedValue([mockProduct])
      vi.mocked(prisma.product.count).mockResolvedValue(1)

      const result = await listProducts({
        organizationId: 'org-1',
        search: 'Depilação',
        status: 'active',
        categoryId: 'cat-1',
        page: 2,
        pageSize: 5,
      })

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          name: { contains: 'Depilação', mode: 'insensitive' },
          categoryId: 'cat-1',
          active: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: 5,
        take: 5,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      })

      expect(result).toEqual({
        items: [
          {
            id: 'prod-1',
            name: 'Depilação Premium',
            active: true,
            category: { id: 'cat-1', name: 'Depilação' },
            price: 450.5,
            cost: 220,
            createdAt: '2024-01-10T10:00:00.000Z',
            updatedAt: '2024-01-12T12:00:00.000Z',
          },
        ],
        total: 1,
        page: 2,
        pageSize: 5,
      })
    })

    it('usa página e pageSize padrão quando valores inválidos são fornecidos', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([])
      vi.mocked(prisma.product.count).mockResolvedValue(0)

      await listProducts({
        organizationId: 'org-1',
        page: -1,
        pageSize: 9999,
      })

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        }),
      )
    })
  })

  describe('createProduct', () => {
    it('cria produto com valores normalizados e retorna payload formatado', async () => {
      const created = {
        id: 'prod-new',
        organizationId: 'org-1',
        name: 'Limpeza Premium',
        active: true,
        categoryId: 'cat-2',
        price: new Prisma.Decimal('320.00'),
        cost: new Prisma.Decimal('150.00'),
        createdAt: new Date('2024-02-01T09:00:00Z'),
        updatedAt: new Date('2024-02-01T09:00:00Z'),
        category: {
          id: 'cat-2',
          name: 'Limpeza de Pele',
        },
      }

      vi.mocked(prisma.product.create).mockResolvedValue(created)

      const result = await createProduct({
        organizationId: 'org-1',
        name: 'Limpeza Premium',
        categoryId: 'cat-2',
        price: 320,
        cost: 150,
      })

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          name: 'Limpeza Premium',
          categoryId: 'cat-2',
          price: new Prisma.Decimal(320),
          cost: new Prisma.Decimal(150),
          active: true,
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      })

      expect(result).toEqual({
        id: 'prod-new',
        name: 'Limpeza Premium',
        active: true,
        category: { id: 'cat-2', name: 'Limpeza de Pele' },
        price: 320,
        cost: 150,
        createdAt: '2024-02-01T09:00:00.000Z',
        updatedAt: '2024-02-01T09:00:00.000Z',
      })
    })
  })

  describe('listCategories', () => {
    it('aplica filtros e paginação para categorias', async () => {
      const mockCategory = {
        id: 'cat-1',
        organizationId: 'org-1',
        name: 'Depilação',
        active: true,
        createdAt: new Date('2024-03-10T10:00:00Z'),
        updatedAt: new Date('2024-03-11T10:00:00Z'),
      }

      vi.mocked(prisma.productCategory.findMany).mockResolvedValue([mockCategory])
      vi.mocked(prisma.productCategory.count).mockResolvedValue(1)

      const result = await listCategories({
        organizationId: 'org-1',
        search: 'dep',
        status: 'active',
        page: 1,
        pageSize: 10,
      })

      expect(prisma.productCategory.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          name: { contains: 'dep', mode: 'insensitive' },
          active: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      })

      expect(result).toEqual({
        items: [
          {
            id: 'cat-1',
            name: 'Depilação',
            active: true,
            createdAt: '2024-03-10T10:00:00.000Z',
            updatedAt: '2024-03-11T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      })
    })
  })

  describe('createCategory', () => {
    it('cria categoria e retorna payload básico', async () => {
      const created = {
        id: 'cat-new',
        organizationId: 'org-1',
        name: 'Rejuvenescimento',
        active: true,
        createdAt: new Date('2024-04-01T12:00:00Z'),
        updatedAt: new Date('2024-04-01T12:00:00Z'),
      }

      vi.mocked(prisma.productCategory.create).mockResolvedValue(created)

      const result = await createCategory({
        organizationId: 'org-1',
        name: 'Rejuvenescimento ',
      })

      expect(prisma.productCategory.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          name: 'Rejuvenescimento',
          active: true,
        },
      })

      expect(result).toEqual({
        id: 'cat-new',
        name: 'Rejuvenescimento',
        active: true,
        createdAt: '2024-04-01T12:00:00.000Z',
        updatedAt: '2024-04-01T12:00:00.000Z',
      })
    })
  })
})
