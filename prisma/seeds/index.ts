import { PrismaClient } from '@prisma/client'
import { seedBillingPlans } from './seed-billing'

const prisma = new PrismaClient()

/**
 * Seed simplificado - apenas billing plans
 * 
 * Usuários e organizações devem ser criados pelo fluxo normal de sign-up.
 * Este seed é idempotente e pode ser executado múltiplas vezes.
 */
export async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  try {
    // Seed billing plans (idempotente - usa upsert)
    await seedBillingPlans(prisma)

    console.log('✅ Seed concluído com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
    console.log('🔌 Conexão com o banco de dados encerrada.')
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('❌ Falha na execução do seed')
      console.error(error)
      process.exit(1)
    })
}
