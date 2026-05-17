import 'server-only'

import type {
  DeleteItemResult,
  ItemListResponse,
  ItemSummary,
  ItemWithCategoryAndCount,
  NotFoundError,
} from '@/features/items'
import {
  createItemService,
  deleteItemService,
  getItemByIdService,
  listItemsService,
  toggleItemActiveService,
  updateItemService,
} from '@/features/items/server'

export type ListItemsParams = {
  organizationId: string
  projectId?: string | null
  search?: string
  status?: 'active' | 'inactive'
  categoryId?: string
  page?: number
  pageSize?: number
}

export type CreateItemParams = {
  organizationId: string
  projectId?: string | null
  name: string
  categoryId?: string | null
}

export async function listItems(params: ListItemsParams): Promise<ItemListResponse> {
  return listItemsService({ organizationId: params.organizationId, filters: params })
}

export async function createItem(params: CreateItemParams) {
  return createItemService({ organizationId: params.organizationId, payload: params })
}

export async function getItemById(input: {
  organizationId: string
  itemId: string
}): Promise<ItemWithCategoryAndCount | null> {
  return getItemByIdService(input)
}

export async function updateItem(input: {
  organizationId: string
  itemId: string
  name?: string
  categoryId?: string | null
  active?: boolean
  projectId?: string | null
}): Promise<ItemSummary | NotFoundError> {
  return updateItemService({
    organizationId: input.organizationId,
    itemId: input.itemId,
    payload: input,
  })
}

export async function deleteItem(input: {
  organizationId: string
  itemId: string
}): Promise<DeleteItemResult> {
  return deleteItemService(input)
}

export async function toggleItemActive(input: {
  organizationId: string
  itemId: string
}): Promise<ItemSummary | NotFoundError> {
  return toggleItemActiveService(input)
}
