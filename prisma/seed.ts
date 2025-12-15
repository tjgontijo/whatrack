import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Forçar uso de DIRECT_URL durante o seed para evitar problemas de pool
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

async function truncateAllTables() {
  console.log('🗑️  Limpando todas as tabelas...');
  
  try {
    // Obter todas as tabelas
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    // Desabilitar constraints
    for (const { tablename } of tables) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${tablename}" DISABLE TRIGGER ALL`
        );
      } catch (e) {
        // Ignorar erro se tabela não existir
      }
    }

    // Fazer truncate em todas as tabelas
    for (const { tablename } of tables) {
      try {
        await prisma.$executeRawUnsafe(
          `TRUNCATE TABLE "${tablename}" CASCADE`
        );
      } catch (e) {
        // Ignorar erro se tabela não existir
      }
    }

    // Reabilitar constraints
    for (const { tablename } of tables) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${tablename}" ENABLE TRIGGER ALL`
        );
      } catch (e) {
        // Ignorar erro se tabela não existir
      }
    }

    // Reset sequences
    const sequences = await prisma.$queryRaw<Array<{ sequencename: string }>>`
      SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    `;

    for (const { sequencename } of sequences) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER SEQUENCE "${sequencename}" RESTART WITH 1`
        );
      } catch (e) {
        // Ignorar erro se sequence não existir
      }
    }

    console.log('✅ Todas as tabelas foram limpas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao limpar tabelas:', error);
    throw error;
  }
}

// Executar a função main via import dinâmico após ajustar env
(async () => {
  try {
    // Limpar todas as tabelas primeiro
    await truncateAllTables();

    // Depois executar o seed
    const { main } = await import('./seeds/index');
    await main();
    console.log('✅ Seed executado com sucesso!');
  } catch (e) {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
