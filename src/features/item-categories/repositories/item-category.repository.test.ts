import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { createItemCategoryRepository } from './create-item-category.repository'
import { deleteItemCategoryRepository } from './delete-item-category.repository'
import { getItemCategoryByIdRepository } from './get-item-category-by-id.repository'
import { listItemCategoriesRepository } from './list-item-categories.repository'
import { updateItemCategoryRepository } from './update-item-category.repository'

describe('item-category.repository (Integration)', () => {
  let orgId: string
  let projectId: string

  beforeEach(async () => {
    // Setup test fixtures
    const org = await prisma.organization.create({
      data: {
        name: 'Integration Test Org',
        slug: `test-org-${Math.random().toString(36).substring(2, 9)}`,
      },
    })
    orgId = org.id

    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        name: 'Integration Test Project',
        slug: `test-project-${Math.random().toString(36).substring(2, 9)}`,
      },
    })
    projectId = project.id
  })

  afterEach(async () => {
    // Cleanup - Cascade delete will clean up projects and item categories
    if (orgId) {
      try {
        await prisma.organization.delete({
          where: { id: orgId },
        })
      } catch (error) {
        console.error('Failed to cleanup organization:', error)
      }
    }
  })

  it('creates, gets, lists, updates, and deletes an item category in the database', async () => {
    // 1. Create Category
    const created = await createItemCategoryRepository({
      organizationId: orgId,
      projectId: projectId,
      name: 'Electronics ', // with trailing space to test trim
    })

    expect(created.id).toBeDefined()
    expect(created.name).toBe('Electronics') // Should be trimmed
    expect(created.active).toBe(true)
    expect(created.projectId).toBe(projectId)
    expect(created.project?.name).toBe('Integration Test Project')

    // 2. Get Category By ID
    const fetched = await getItemCategoryByIdRepository({
      organizationId: orgId,
      categoryId: created.id,
    })

    expect(fetched).not.toBeNull()
    expect(fetched?.name).toBe('Electronics')

    // 3. List Categories
    const listResult = await listItemCategoriesRepository({
      organizationId: orgId,
      projectId: projectId,
      page: 1,
      pageSize: 10,
    })

    expect(listResult.total).toBe(1)
    expect(listResult.items).toHaveLength(1)
    expect(listResult.items[0].id).toBe(created.id)

    // 4. Update Category
    const updated = await updateItemCategoryRepository({
      categoryId: created.id,
      name: 'Smartphones',
      active: false,
    })

    expect(updated.name).toBe('Smartphones')
    expect(updated.active).toBe(false)

    // 5. Delete Category
    await deleteItemCategoryRepository(created.id)

    // Verify it is gone
    const fetchedAfterDelete = await getItemCategoryByIdRepository({
      organizationId: orgId,
      categoryId: created.id,
    })
    expect(fetchedAfterDelete).toBeNull()
  })

  it('enforces unique constraint on category name per organization', async () => {
    await createItemCategoryRepository({
      organizationId: orgId,
      name: 'Duplicate Category',
    })

    // Attempting to create another category with the same name should fail
    await expect(
      createItemCategoryRepository({
        organizationId: orgId,
        name: 'Duplicate Category',
      })
    ).rejects.toThrow()
  })
})
