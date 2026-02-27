import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { seedLookupTables } from './seed_lookup_tables'
import { seedTicketStages } from './seed_ticket_stages'
import { seedAgentSaleDetector } from './seed_agent_sale_detector'
import { seedAgentLeadQualifier } from './seed_agent_lead_qualifier'
import { seedAgentConversationSummarizer } from './seed_agent_conversation_summarizer'
import { seedSharedCoreSkills } from './seed_skills_shared_core'

interface PgTableRow {
  tablename: string
}

interface PgSequenceRow {
  sequencename: string
}

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

async function truncateAllTables() {
  console.log('🗑️  Limpando todas as tabelas...')

  try {
    const tables = await prisma.$queryRaw<PgTableRow[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `

    for (const { tablename } of tables) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "${tablename}" DISABLE TRIGGER ALL`)
      } catch {
        // ignore
      }
    }

    for (const { tablename } of tables) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`)
      } catch {
        // ignore
      }
    }

    for (const { tablename } of tables) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "${tablename}" ENABLE TRIGGER ALL`)
      } catch {
        // ignore
      }
    }

    const sequences = await prisma.$queryRaw<PgSequenceRow[]>`
      SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    `

    for (const { sequencename } of sequences) {
      try {
        await prisma.$executeRawUnsafe(`ALTER SEQUENCE "${sequencename}" RESTART WITH 1`)
      } catch {
        // ignore
      }
    }

    console.log('✅ Todas as tabelas foram limpas com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao limpar tabelas:', error)
    throw error
  }
}

/**
 * Seed de infraestrutura.
 *
 * Usuários e organizações devem ser criados pelo fluxo normal de sign-up.
 * Este seed é idempotente e pode ser executado múltiplas vezes.
 */
export async function runSeed() {
  console.log('🌱 Iniciando seed do banco de dados...')

  try {
    if (process.env.TRUNCATE_DB === '1') {
      await truncateAllTables()
    }

    await seedLookupTables(prisma)
    await seedTicketStages(prisma)

    // AI Agents — seeded per organization
    const organizations = await prisma.organization.findMany()
    for (const org of organizations) {
      await seedAgentSaleDetector(prisma, org.id)
      await seedAgentLeadQualifier(prisma, org.id)
      await seedAgentConversationSummarizer(prisma, org.id)
      await seedSharedCoreSkills(prisma, org.id)
    }

    console.log('✅ Seed concluído com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
    console.log('🔌 Conexão com o banco de dados encerrada.')
  }
}
