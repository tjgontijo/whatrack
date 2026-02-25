import { prisma } from '@/lib/db/prisma'

export type ItemFilterOption = {
  label: string
  value: string
}

export type ItemFilters = {
  categories: ItemFilterOption[]
  itemsByCategory: Record<string, ItemFilterOption[]>
}

export async function buildItemFilters(organizationId: string): Promise<ItemFilters> {
  const categories = await prisma.itemCategory.findMany({
    where: { active: true, organizationId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      items: {
        where: { active: true, organizationId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      },
    },
  })

  const categoryOptions: ItemFilterOption[] = [{ label: 'Qualquer', value: 'any' }]
  const itemsByCategory: Record<string, ItemFilterOption[]> = {
    any: [{ label: 'Qualquer', value: 'any' }],
  }

  for (const category of categories) {
    categoryOptions.push({ label: category.name, value: category.id })

    const itemOptions: ItemFilterOption[] = [{ label: 'Qualquer', value: 'any' }]
    for (const item of category.items) {
      itemOptions.push({ label: item.name, value: item.id })
    }

    itemsByCategory[category.id] = itemOptions
  }

  return { categories: categoryOptions, itemsByCategory }
}
