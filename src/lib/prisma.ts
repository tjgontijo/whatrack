import { PrismaClient } from '../../prisma/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { auditService } from '@/lib/audit.service'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

// Selective Audit Models
const AUDIT_MODELS = new Set([
  'Organization',
  'Member',
  'MetaConnection',
  'WhatsAppConnection',
])

const prismaClientSingleton = () => {
  const baseClient = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  })

  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const isAuditModel = model && AUDIT_MODELS.has(model)
          const isAuditAction = ['create', 'update', 'delete'].includes(operation as string)

          if (!isAuditModel || !isAuditAction) {
            return query(args)
          }

          // Capture 'before' state for updates and deletes
          let before: any = null
          if (['update', 'delete'].includes(operation as string)) {
            try {
              before = await (baseClient as any)[model!].findUnique({
                where: (args as any).where,
              })
            } catch (err) {
              // Ignore if fetch fails
            }
          }

          const result = await query(args)

          // Fire-and-forget audit log
          void auditService.log({
            organizationId: (result as any)?.organizationId || (result as any)?.id || before?.organizationId || undefined,
            action: `${model?.toLowerCase()}.${operation}`,
            resourceType: model!,
            resourceId: (result as any)?.id || (args as any).where?.id || undefined,
            before: before ?? undefined,
            after: operation === 'delete' ? undefined : result,
          })

          return result
        },
      },
    },
  })
}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

// We cast the extended client back to PrismaClient so that callers retain full
// `include` type inference. The audit middleware still runs at runtime because
// the underlying object is still the extended client.
export const prisma = (
  globalForPrisma.prisma ?? prismaClientSingleton()
) as unknown as PrismaClient

if (process.env.NODE_ENV !== 'production') {
  // Store the extended instance in global to avoid re-initialising
  ; (globalForPrisma as any).prisma = prisma
}
