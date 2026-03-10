import { describe, expect, it } from 'vitest'

import { buildSalesWhere } from '@/services/dashboard/build-filters'

describe('buildSalesWhere', () => {
  it('includes item category filter when provided', () => {
    const where = buildSalesWhere({
      itemCategory: 'category-1',
    })

    expect(where).toEqual({
      items: {
        some: {
          item: {
            categoryId: 'category-1',
          },
        },
      },
    })
  })

  it('combines item and item category filters when both are provided', () => {
    const where = buildSalesWhere({
      itemCategory: 'category-1',
      item: 'item-1',
    })

    expect(where).toEqual({
      AND: [
        {
          items: {
            some: {
              itemId: 'item-1',
            },
          },
        },
        {
          items: {
            some: {
              item: {
                categoryId: 'category-1',
              },
            },
          },
        },
      ],
    })
  })

  it('applies project filter when projectId is provided', () => {
    const where = buildSalesWhere({
      projectId: 'project-1',
    })

    expect(where).toEqual({
      projectId: 'project-1',
    })
  })
})
