import { prisma } from '@/lib/prisma'

export type ProductFilterOption = {
  label: string
  value: string
}

export type ProductFilters = {
  categories: ProductFilterOption[]
  productsByCategory: Record<string, ProductFilterOption[]>
}

export async function buildProductFilters(organizationId: string): Promise<ProductFilters> {
  const categories = await prisma.productCategory.findMany({
    where: { active: true, organizationId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      products: {
        where: { active: true, organizationId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      },
    },
  })

  const categoryOptions: ProductFilterOption[] = [{ label: 'Qualquer', value: 'any' }]
  const productsByCategory: Record<string, ProductFilterOption[]> = {
    any: [{ label: 'Qualquer', value: 'any' }],
  }

  for (const category of categories) {
    categoryOptions.push({ label: category.name, value: category.id })

    const productOptions: ProductFilterOption[] = [{ label: 'Qualquer', value: 'any' }]
    for (const product of category.products) {
      productOptions.push({ label: product.name, value: product.id })
    }

    productsByCategory[category.id] = productOptions
  }

  return { categories: categoryOptions, productsByCategory }
}
