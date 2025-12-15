import { BillingProvider, Prisma, type WebhookEvent } from '@prisma/client'
import { prisma as defaultPrisma } from '@/lib/prisma'

/**
 * Webhook event with full details
 */
export type WebhookEventWithDetails = WebhookEvent

/**
 * Data required to create a webhook event
 */
export interface CreateWebhookEventData {
  provider: BillingProvider
  eventId: string
  eventType: string
  payload: Prisma.InputJsonValue
}

/**
 * Prisma client type for dependency injection
 */
type PrismaClient = typeof defaultPrisma

/**
 * WebhookService handles webhook event storage and idempotency.
 * Ensures webhooks are processed exactly once.
 */
export class WebhookService {
  private prisma: PrismaClient

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma
  }

  /**
   * Get webhook event by provider and event ID
   */
  async getByEventId(
    provider: BillingProvider,
    eventId: string
  ): Promise<WebhookEventWithDetails | null> {
    return this.prisma.webhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider,
          eventId,
        },
      },
    })
  }

  /**
   * Check if a webhook event has already been processed
   */
  async isProcessed(provider: BillingProvider, eventId: string): Promise<boolean> {
    const event = await this.getByEventId(provider, eventId)
    return event?.processed ?? false
  }

  /**
   * Store a webhook event (upsert for idempotency)
   */
  async store(data: CreateWebhookEventData): Promise<WebhookEventWithDetails> {
    return this.prisma.webhookEvent.upsert({
      where: {
        provider_eventId: {
          provider: data.provider,
          eventId: data.eventId,
        },
      },
      create: {
        provider: data.provider,
        eventId: data.eventId,
        eventType: data.eventType,
        payload: data.payload,
      },
      update: {
        eventType: data.eventType,
        payload: data.payload,
      },
    })
  }

  /**
   * Mark a webhook event as processed
   */
  async markProcessed(
    provider: BillingProvider,
    eventId: string
  ): Promise<WebhookEventWithDetails> {
    return this.prisma.webhookEvent.update({
      where: {
        provider_eventId: {
          provider,
          eventId,
        },
      },
      data: {
        processed: true,
        processedAt: new Date(),
        error: null,
      },
    })
  }

  /**
   * Mark a webhook event as failed with error
   */
  async markFailed(
    provider: BillingProvider,
    eventId: string,
    error: string
  ): Promise<WebhookEventWithDetails> {
    return this.prisma.webhookEvent.update({
      where: {
        provider_eventId: {
          provider,
          eventId,
        },
      },
      data: {
        error,
      },
    })
  }

  /**
   * Get unprocessed webhook events for retry
   */
  async getUnprocessed(
    provider?: BillingProvider,
    limit: number = 100
  ): Promise<WebhookEventWithDetails[]> {
    return this.prisma.webhookEvent.findMany({
      where: {
        processed: false,
        ...(provider ? { provider } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
  }

  /**
   * Get failed webhook events for investigation
   */
  async getFailed(
    provider?: BillingProvider,
    limit: number = 100
  ): Promise<WebhookEventWithDetails[]> {
    return this.prisma.webhookEvent.findMany({
      where: {
        processed: false,
        error: { not: null },
        ...(provider ? { provider } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }
}
