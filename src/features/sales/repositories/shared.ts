import 'server-only'

import type { Prisma } from '@generated/prisma/client'

export const saleItemSelect = {
  id: true,
  organizationId: true,
  saleId: true,
  itemId: true,
  name: true,
  quantity: true,
  unitPrice: true,
  total: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SaleItemSelect

export const saleWithItemsSelect = {
  id: true,
  organizationId: true,
  totalAmount: true,
  profit: true,
  discount: true,
  status: true,
  notes: true,
  createdBy: true,
  updatedBy: true,
  statusChangedAt: true,
  ticketId: true,
  createdAt: true,
  updatedAt: true,
  items: { select: saleItemSelect },
} satisfies Prisma.SaleSelect
