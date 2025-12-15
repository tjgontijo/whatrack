import { PrismaClient } from '@prisma/client'

function getPrismaUrl() {
  return process.env.DATABASE_URL ?? ''
}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: getPrismaUrl(),
      },
    },
  })

if (process.env.NODE_ENV === 'production') {
  console.log('[prisma] Inicializado em produção')
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
