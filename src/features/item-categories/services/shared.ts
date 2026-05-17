import 'server-only'

import type { ItemCategoryListItem } from '@/features/item-categories/types'

const MIN_PAGE_SIZE = 1
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

export function normalizePage(input?: number) {
  if (!input || Number.isNaN(input) || input < 1) return 1
  return Math.floor(input)
}

export function normalizePageSize(input?: number) {
  if (!input || Number.isNaN(input)) return DEFAULT_PAGE_SIZE
  const value = Math.floor(input)
  if (value < MIN_PAGE_SIZE || value > MAX_PAGE_SIZE) {
    return DEFAULT_PAGE_SIZE
  }
  return value
}

export function toItemCategoryListItem(item: {
  id: string
  name: string
  active: boolean
  projectId: string | null
  project: { id: string; name: string } | null
  createdAt: Date
  updatedAt: Date
  _count?: { items: number }
}): ItemCategoryListItem {
  return {
    id: item.id,
    name: item.name,
    active: item.active,
    itemsCount: item._count?.items ?? 0,
    projectId: item.projectId,
    projectName: item.project?.name ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}
