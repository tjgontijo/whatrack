import { Prisma } from '@generated/prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  itemCategory: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

const projectScopeMock = vi.hoisted(() => ({
  resolveProjectScope: vi.fn(),
  ensureProjectBelongsToOrganization: vi.fn(),
}))

vi.mock('@/server/project/project-scope', () => projectScopeMock)

import { createItemCategoryService } from './create-item-category.service'
import { deleteItemCategoryService } from './delete-item-category.service'
import { getItemCategoryByIdService } from './get-item-category-by-id.service'
import { listItemCategoriesService } from './list-item-categories.service'
import { updateItemCategoryService } from './update-item-category.service'

describe('item-category.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createItemCategoryService', () => {
    it('creates an item category successfully when no project is associated', async () => {
      projectScopeMock.resolveProjectScope.mockResolvedValueOnce(null)

      const categoryData = {
        id: 'cat-1',
        name: 'New Category',
        active: true,
        projectId: null,
        project: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      prismaMock.itemCategory.create.mockResolvedValueOnce(categoryData)

      const result = await createItemCategoryService({
        organizationId: 'org-1',
        payload: {
          name: 'New Category',
        },
      })

      expect(projectScopeMock.resolveProjectScope).toHaveBeenCalledWith({
        organizationId: 'org-1',
        projectId: undefined,
      })
      expect(prismaMock.itemCategory.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          projectId: null,
          name: 'New Category',
          active: true,
        },
        select: expect.any(Object),
      })
      expect(result).toEqual({
        id: 'cat-1',
        name: 'New Category',
        active: true,
        itemsCount: 0,
        projectId: null,
        projectName: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    })

    it('creates an item category successfully when explicit project belongs to organization', async () => {
      projectScopeMock.resolveProjectScope.mockResolvedValueOnce('project-1')
      projectScopeMock.ensureProjectBelongsToOrganization.mockResolvedValueOnce({
        id: 'project-1',
        name: 'Project 1',
      })

      const categoryData = {
        id: 'cat-1',
        name: 'New Category',
        active: true,
        projectId: 'project-1',
        project: { id: 'project-1', name: 'Project 1' },
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      prismaMock.itemCategory.create.mockResolvedValueOnce(categoryData)

      const result = await createItemCategoryService({
        organizationId: 'org-1',
        payload: {
          name: 'New Category',
          projectId: 'project-1',
        },
      })

      expect(projectScopeMock.resolveProjectScope).toHaveBeenCalledWith({
        organizationId: 'org-1',
        projectId: 'project-1',
      })
      expect(projectScopeMock.ensureProjectBelongsToOrganization).toHaveBeenCalledWith(
        'org-1',
        'project-1'
      )
      expect(prismaMock.itemCategory.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'New Category',
          active: true,
        },
        select: expect.any(Object),
      })
      expect(result).toEqual({
        id: 'cat-1',
        name: 'New Category',
        active: true,
        itemsCount: 0,
        projectId: 'project-1',
        projectName: 'Project 1',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    })

    it('throws an error if project does not belong to organization', async () => {
      projectScopeMock.resolveProjectScope.mockResolvedValueOnce('project-1')
      projectScopeMock.ensureProjectBelongsToOrganization.mockResolvedValueOnce(null)

      await expect(
        createItemCategoryService({
          organizationId: 'org-1',
          payload: {
            name: 'New Category',
            projectId: 'project-1',
          },
        })
      ).rejects.toThrow('Projeto inválido para esta organização')
    })
  })

  describe('deleteItemCategoryService', () => {
    it('returns error 404 when item category does not exist', async () => {
      prismaMock.itemCategory.findFirst.mockResolvedValueOnce(null)

      const result = await deleteItemCategoryService({
        organizationId: 'org-1',
        categoryId: 'cat-1',
      })

      expect(result).toEqual({ error: 'Categoria não encontrada', status: 404 })
    })

    it('deactivates category if it has linked items', async () => {
      prismaMock.itemCategory.findFirst.mockResolvedValueOnce({
        id: 'cat-1',
        _count: { items: 3 },
      })
      prismaMock.itemCategory.update.mockResolvedValueOnce({})

      const result = await deleteItemCategoryService({
        organizationId: 'org-1',
        categoryId: 'cat-1',
      })

      expect(prismaMock.itemCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { active: false },
      })
      expect(result).toEqual({
        success: true,
        message: 'Categoria desativada (há itens vinculados)',
      })
    })

    it('deletes category if it has no linked items', async () => {
      prismaMock.itemCategory.findFirst.mockResolvedValueOnce({
        id: 'cat-1',
        _count: { items: 0 },
      })
      prismaMock.itemCategory.delete.mockResolvedValueOnce({})

      const result = await deleteItemCategoryService({
        organizationId: 'org-1',
        categoryId: 'cat-1',
      })

      expect(prismaMock.itemCategory.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      })
      expect(result).toEqual({ success: true })
    })
  })

  describe('getItemCategoryByIdService', () => {
    it('returns the item category with count details', async () => {
      const categoryData = {
        id: 'cat-1',
        organizationId: 'org-1',
        projectId: 'project-1',
        project: { id: 'project-1', name: 'Project 1' },
        name: 'My Category',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { items: 5 },
      }
      prismaMock.itemCategory.findFirst.mockResolvedValueOnce(categoryData)

      const result = await getItemCategoryByIdService({
        organizationId: 'org-1',
        categoryId: 'cat-1',
      })

      expect(prismaMock.itemCategory.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-1', organizationId: 'org-1' },
        select: expect.any(Object),
      })
      expect(result).toEqual(categoryData)
    })

    it('returns null if category is not found', async () => {
      prismaMock.itemCategory.findFirst.mockResolvedValueOnce(null)

      const result = await getItemCategoryByIdService({
        organizationId: 'org-1',
        categoryId: 'cat-1',
      })

      expect(result).toBeNull()
    })
  })

  describe('listItemCategoriesService', () => {
    it('returns a paginated list of categories mapped correctly', async () => {
      projectScopeMock.resolveProjectScope.mockResolvedValueOnce('project-1')

      const date = new Date()
      const categoryList = [
        {
          id: 'cat-1',
          name: 'Category One',
          active: true,
          projectId: 'project-1',
          project: { id: 'project-1', name: 'Project 1' },
          createdAt: date,
          updatedAt: date,
          _count: { items: 2 },
        },
      ]
      prismaMock.itemCategory.findMany.mockResolvedValueOnce(categoryList)
      prismaMock.itemCategory.count.mockResolvedValueOnce(1)

      const result = await listItemCategoriesService({
        organizationId: 'org-1',
        filters: {
          page: 1,
          pageSize: 10,
          projectId: 'project-1',
          search: 'One',
          status: 'active',
        },
      })

      expect(projectScopeMock.resolveProjectScope).toHaveBeenCalledWith({
        organizationId: 'org-1',
        projectId: 'project-1',
      })
      expect(prismaMock.itemCategory.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          projectId: 'project-1',
          name: { contains: 'One', mode: 'insensitive' },
          active: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
        select: expect.any(Object),
      })
      expect(prismaMock.itemCategory.count).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          projectId: 'project-1',
          name: { contains: 'One', mode: 'insensitive' },
          active: true,
        },
      })
      expect(result).toEqual({
        items: [
          {
            id: 'cat-1',
            name: 'Category One',
            active: true,
            itemsCount: 2,
            projectId: 'project-1',
            projectName: 'Project 1',
            createdAt: date.toISOString(),
            updatedAt: date.toISOString(),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      })
    })
  })

  describe('updateItemCategoryService', () => {
    it('returns error 404 when trying to update non-existing category', async () => {
      prismaMock.itemCategory.findFirst.mockResolvedValueOnce(null)

      const result = await updateItemCategoryService({
        organizationId: 'org-1',
        categoryId: 'cat-1',
        payload: { name: 'New Name' },
      })

      expect(result).toEqual({ error: 'Categoria não encontrada', status: 404 })
    })

    it('updates item category successfully', async () => {
      prismaMock.itemCategory.findFirst.mockResolvedValueOnce({ id: 'cat-1' })
      projectScopeMock.resolveProjectScope.mockResolvedValueOnce('project-1')
      projectScopeMock.ensureProjectBelongsToOrganization.mockResolvedValueOnce({
        id: 'project-1',
        name: 'Project 1',
      })

      const date = new Date()
      const updatedCategory = {
        id: 'cat-1',
        name: 'Updated Name',
        active: true,
        projectId: 'project-1',
        project: { id: 'project-1', name: 'Project 1' },
        createdAt: date,
        updatedAt: date,
        _count: { items: 0 },
      }
      prismaMock.itemCategory.update.mockResolvedValueOnce(updatedCategory)

      const result = await updateItemCategoryService({
        organizationId: 'org-1',
        categoryId: 'cat-1',
        payload: {
          name: 'Updated Name',
          projectId: 'project-1',
          active: true,
        },
      })

      expect(prismaMock.itemCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: {
          name: 'Updated Name',
          active: true,
          projectId: 'project-1',
        },
        select: expect.any(Object),
      })
      expect(result).toEqual({
        id: 'cat-1',
        name: 'Updated Name',
        active: true,
        itemsCount: 0,
        projectId: 'project-1',
        projectName: 'Project 1',
        createdAt: date.toISOString(),
        updatedAt: date.toISOString(),
      })
    })

    it('returns 409 error if name conflicts (unique constraint P2002)', async () => {
      prismaMock.itemCategory.findFirst.mockResolvedValueOnce({ id: 'cat-1' })

      const dbError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.7.0',
      })
      prismaMock.itemCategory.update.mockRejectedValueOnce(dbError)

      const result = await updateItemCategoryService({
        organizationId: 'org-1',
        categoryId: 'cat-1',
        payload: { name: 'Duplicate Name' },
      })

      expect(result).toEqual({ error: 'Já existe uma categoria com este nome', status: 409 })
    })
  })
})
