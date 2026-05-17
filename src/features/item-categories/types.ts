export type ItemCategoryListItem = {
  id: string
  name: string
  active: boolean
  itemsCount: number
  projectId: string | null
  projectName: string | null
  createdAt: string
  updatedAt: string
}

export type ItemCategoryListResponse = {
  items: ItemCategoryListItem[]
  total: number
  page: number
  pageSize: number
}

export type CategorySummary = {
  id: string
  name: string
  active: boolean
  itemsCount: number
  projectId: string | null
  projectName: string | null
  createdAt: string
  updatedAt: string
}

export type ItemCategoryWithCount = {
  id: string
  organizationId: string
  projectId: string | null
  project: {
    id: string
    name: string
  } | null
  name: string
  active: boolean
  createdAt: Date
  updatedAt: Date
  _count: {
    items: number
  }
}

export type CategoryNotFoundError = { error: 'Categoria não encontrada'; status: 404 }
export type CategoryConflictError = { error: 'Já existe uma categoria com este nome'; status: 409 }
export type DeleteItemCategoryResult =
  | { success: true }
  | { success: true; message: 'Categoria desativada (há itens vinculados)' }
  | CategoryNotFoundError
