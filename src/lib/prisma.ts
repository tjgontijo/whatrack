import { PrismaClient } from '../../prisma/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { auditService } from '@/lib/audit.service'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const client =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client

// Selective Audit Middleware
const AUDIT_MODELS = new Set([
  'Organization',
  'Member',
  'MetaConnection',
  'WhatsAppConnection',
])

client.$use(async (params, next) => {
  const isAuditModel = params.model && AUDIT_MODELS.has(params.model)
  const isAuditAction = ['create', 'update', 'delete'].includes(params.action)

  if (!isAuditModel || !isAuditAction) {
    return next(params)
  }

  // Capture 'before' state for updates and deletes
  let before = null
  if (['update', 'delete'].includes(params.action)) {
    try {
      before = await (client as any)[params.model!].findUnique({
        where: params.args.where,
      })
    } catch (err) {
      // Ignore if fetch fails
    }
  }

  const result = await next(params)

  // Fire-and-forget audit log
  void auditService.log({
    organizationId: result?.organizationId || result?.id || before?.organizationId || undefined,
    action: `${params.model?.toLowerCase()}.${params.action}`,
    resourceType: params.model!,
    resourceId: result?.id || params.args.where?.id || undefined,
    before: before ?? undefined,
    after: params.action === 'delete' ? null : result,
  })

  return result
})

export const prisma = client
