import {
  type BillingProvider,
  type Invoice,
  type InvoiceItem,
  PaymentStatus,
  type Payment,
  type Subscription,
} from '@prisma/client'
import { prisma as defaultPrisma } from '@/lib/prisma'

/**
 * Invoice with items
 */
export type InvoiceWithItems = Invoice & {
  items: InvoiceItem[]
  payments?: Payment[]
}

/**
 * Invoice with items and subscription
 */
export type InvoiceWithRelations = Invoice & {
  items: InvoiceItem[]
  subscription?: Subscription | null
}

/**
 * Invoice item data for creation
 */
export interface CreateInvoiceItemData {
  description: string
  quantity: number
  unitCents: number
  totalCents: number
}

/**
 * Data required to create an invoice
 */
export interface CreateInvoiceData {
  billingCustomerId: string
  subscriptionId?: string
  provider: BillingProvider
  externalId?: string
  subtotalCents: number
  discountCents?: number
  taxCents?: number
  totalCents: number
  currency?: string
  status?: PaymentStatus
  dueDate?: Date
  description?: string
  items: CreateInvoiceItemData[]
}

/**
 * Prisma client type for dependency injection
 */
type PrismaClient = typeof defaultPrisma

/**
 * InvoiceService handles invoice database operations.
 * Manages CRUD operations for invoices and their items.
 */
export class InvoiceService {
  private prisma: PrismaClient

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma
  }

  /**
   * Get invoice by ID with items and payments
   */
  async getById(id: string): Promise<InvoiceWithItems | null> {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true, payments: true },
    })
  }

  /**
   * Get invoice by provider and external ID
   */
  async getByExternalId(
    provider: BillingProvider,
    externalId: string
  ): Promise<InvoiceWithItems | null> {
    return this.prisma.invoice.findFirst({
      where: { provider, externalId },
      include: { items: true },
    })
  }

  /**
   * List invoices for a subscription
   */
  async listBySubscription(subscriptionId: string): Promise<InvoiceWithItems[]> {
    return this.prisma.invoice.findMany({
      where: { subscriptionId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * List invoices for a billing customer
   */
  async listByBillingCustomer(billingCustomerId: string): Promise<InvoiceWithRelations[]> {
    return this.prisma.invoice.findMany({
      where: { billingCustomerId },
      include: { items: true, subscription: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Create a new invoice with items
   */
  async create(data: CreateInvoiceData): Promise<InvoiceWithItems> {
    const { items, ...invoiceData } = data

    return this.prisma.invoice.create({
      data: {
        ...invoiceData,
        items: {
          create: items,
        },
      },
      include: { items: true },
    })
  }

  /**
   * Update invoice status
   */
  async updateStatus(id: string, status: PaymentStatus): Promise<InvoiceWithItems> {
    const updateData: { status: PaymentStatus; paidAt?: Date } = { status }

    // Set paidAt when marking as succeeded
    if (status === PaymentStatus.succeeded) {
      updateData.paidAt = new Date()
    }

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { items: true },
    })
  }

  /**
   * Mark invoice as paid with specific timestamp
   */
  async markAsPaid(id: string, paidAt: Date): Promise<InvoiceWithItems> {
    return this.prisma.invoice.update({
      where: { id },
      data: { status: PaymentStatus.succeeded, paidAt },
      include: { items: true },
    })
  }

  /**
   * Update invoice external ID
   */
  async updateExternalId(id: string, externalId: string): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data: { externalId },
    })
  }
}
