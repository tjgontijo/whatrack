export type ItemListItem = {
  id: string
  name: string
  active: boolean
  category: {
    id: string
    name: string
  } | null
  projectId: string | null
  projectName: string | null
  createdAt: string
  updatedAt: string
}

export type ItemListResponse = {
  items: ItemListItem[]
  total: number
  page: number
  pageSize: number
}

export type ItemSummary = {
  id: string
  organizationId: string
  categoryId: string | null
  name: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export type ItemWithCategoryAndCount = ItemSummary & {
  category: {
    id: string
    organizationId: string
    name: string
    active: boolean
    createdAt: Date
    updatedAt: Date
  } | null
  projectId: string | null
  project: {
    id: string
    name: string
  } | null
  _count: {
    saleItems: number
  }
}

export type NotFoundError = { error: 'Item não encontrado'; status: 404 }
export type DeleteItemResult =
  | { success: true }
  | { success: true; message: 'Item desativado (está sendo usado em vendas)' }
  | NotFoundError
