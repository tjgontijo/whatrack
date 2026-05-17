import { prisma } from '@/lib/db/prisma'

export class BillingAuditService {
  static async log(input: {
    organizationId?: string | null
    userId?: string | null
    action: string
    entity: string
    entityId: string
    asaasEventId?: string
    asaasPaymentId?: string
    previousState?: unknown
    newState?: unknown
    metadata?: unknown
  }) {
    return prisma.billingAuditLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        asaasEventId: input.asaasEventId,
        asaasPaymentId: input.asaasPaymentId,
        previousState: input.previousState as any,
        newState: input.newState as any,
        metadata: input.metadata as any,
      },
    })
  }

  static async isDuplicate(asaasEventId: string) {
    const existing = await prisma.billingAuditLog.findUnique({
      where: { asaasEventId },
      select: { id: true },
    })

    return Boolean(existing)
  }
}
