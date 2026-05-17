import 'server-only'

import type {
  CategoryConflictError,
  CategoryNotFoundError,
  CategorySummary,
  DeleteItemCategoryResult,
  ItemCategoryListItem,
  ItemCategoryListResponse,
  ItemCategoryWithCount,
} from '@/features/item-categories'
import {
  createItemCategoryService,
  deleteItemCategoryService,
  getItemCategoryByIdService,
  listItemCategoriesService,
  updateItemCategoryService,
} from '@/features/item-categories/server'

export type ListItemCategoriesParams = {
  organizationId: string
  projectId?: string | null
  search?: string
  status?: 'active' | 'inactive'
  page?: number
  pageSize?: number
}

export type CreateItemCategoryParams = {
  organizationId: string
  projectId?: string | null
  name: string
}

export async function listItemCategories(
  params: ListItemCategoriesParams
): Promise<ItemCategoryListResponse> {
  return listItemCategoriesService({
    organizationId: params.organizationId,
    filters: params,
  })
}

export async function createItemCategory(
  params: CreateItemCategoryParams
): Promise<ItemCategoryListItem> {
  return createItemCategoryService({
    organizationId: params.organizationId,
    payload: params,
  })
}

export async function getItemCategoryById(input: {
  organizationId: string
  categoryId: string
}): Promise<ItemCategoryWithCount | null> {
  return getItemCategoryByIdService(input)
}

export async function updateItemCategory(input: {
  organizationId: string
  categoryId: string
  name?: string
  active?: boolean
  projectId?: string | null
}): Promise<CategorySummary | CategoryNotFoundError | CategoryConflictError> {
  return updateItemCategoryService({
    organizationId: input.organizationId,
    categoryId: input.categoryId,
    payload: input,
  })
}

export async function deleteItemCategory(input: {
  organizationId: string
  categoryId: string
}): Promise<DeleteItemCategoryResult> {
  return deleteItemCategoryService(input)
}
