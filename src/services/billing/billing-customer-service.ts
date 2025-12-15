import {
  Prisma,
  type BillingProvider,
  type BillingCustomer,
  type BillingCustomerExternal,
  type PaymentMethodStored,
} from '@prisma/client'
import { prisma as defaultPrisma } from '@/lib/prisma'

/**
 * BillingCustomer with external IDs
 */
export type BillingCustomerWithExternals = BillingCustomer & {
  externalCustomers: BillingCustomerExternal[]
  paymentMethods?: PaymentMethodStored[]
}

/**
 * Data required to create a billing customer
 */
export interface CreateBillingCustomerData {
  organizationId: string
  email: string
  name?: string | null
  taxId?: string | null
  phone?: string | null
  address?: Prisma.InputJsonValue
}

/**
 * Data for updating a billing customer
 */
export interface UpdateBillingCustomerData {
  email?: string
  name?: string | null
  taxId?: string | null
  phone?: string | null
  address?: Prisma.InputJsonValue | typeof Prisma.JsonNull
}

/**
 * Prisma client type for dependency injection
 */
type PrismaClient = typeof defaultPrisma

/**
 * BillingCustomerService handles billing customer management.
 * Manages customer records and their external provider IDs.
 */
export class BillingCustomerService {
  private prisma: PrismaClient

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma
  }

  /**
   * Get billing customer by ID
   */
  async getById(id: string): Promise<BillingCustomerWithExternals | null> {
    return this.prisma.billingCustomer.findUnique({
      where: { id },
      include: { externalCustomers: true, paymentMethods: true },
    })
  }

  /**
   * Get billing customer by organization ID
   */
  async getByOrganizationId(organizationId: string): Promise<BillingCustomerWithExternals | null> {
    return this.prisma.billingCustomer.findUnique({
      where: { organizationId },
      include: { externalCustomers: true, paymentMethods: true },
    })
  }

  /**
   * Get billing customer by provider's external ID
   */
  async getByExternalId(
    provider: BillingProvider,
    externalId: string
  ): Promise<BillingCustomerWithExternals | null> {
    const external = await this.prisma.billingCustomerExternal.findFirst({
      where: { provider, externalId },
      include: { billingCustomer: { include: { externalCustomers: true } } },
    })

    return external?.billingCustomer ?? null
  }

  /**
   * Create a new billing customer
   */
  async create(data: CreateBillingCustomerData): Promise<BillingCustomerWithExternals> {
    const result = await this.prisma.billingCustomer.create({
      data,
      include: { externalCustomers: true },
    })
    return result as BillingCustomerWithExternals
  }

  /**
   * Update billing customer data
   */
  async update(
    id: string,
    data: UpdateBillingCustomerData
  ): Promise<BillingCustomerWithExternals> {
    const result = await this.prisma.billingCustomer.update({
      where: { id },
      data,
      include: { externalCustomers: true },
    })
    return result as BillingCustomerWithExternals
  }

  /**
   * Add external customer ID for a provider
   */
  async addExternalId(
    billingCustomerId: string,
    provider: BillingProvider,
    externalId: string
  ): Promise<BillingCustomerExternal> {
    return this.prisma.billingCustomerExternal.create({
      data: {
        billingCustomerId,
        provider,
        externalId,
      },
    })
  }

  /**
   * Upsert external customer ID for a provider
   */
  async upsertExternalId(
    billingCustomerId: string,
    provider: BillingProvider,
    externalId: string
  ): Promise<BillingCustomerExternal> {
    return this.prisma.billingCustomerExternal.upsert({
      where: {
        billingCustomerId_provider: {
          billingCustomerId,
          provider,
        },
      },
      update: { externalId },
      create: {
        billingCustomerId,
        provider,
        externalId,
      },
    })
  }

  /**
   * Get external ID for a specific provider
   */
  async getExternalIdForProvider(
    billingCustomerId: string,
    provider: BillingProvider
  ): Promise<string | null> {
    const customer = await this.prisma.billingCustomer.findUnique({
      where: { id: billingCustomerId },
      include: { externalCustomers: true },
    })

    if (!customer) return null

    const external = customer.externalCustomers.find((e) => e.provider === provider)
    return external?.externalId ?? null
  }
}
