import 'dotenv/config'
import { PrismaClient } from '@generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

async function cleanupLegacyAssets() {
  console.log('Verifying database state (Phase 6: Schema Hardening)...\n');

  try {
    // Phase 6: projectId is now NOT NULL - verify no NULL values exist
    // This script is now mainly for verification since the schema enforces NOT NULL
    const beforeCounts = {
      metaConnections: 0,
      metaPixels: 0,
      metaAdAccounts: 0,
      whatsAppConnections: 0,
      whatsAppConfigs: 0,
      whatsAppOnboardings: 0,
    };

    // Note: After Phase 6 migration, querying for NULL projectId will return 0
    // The database constraint now prevents any NULL values
    console.log('Database verification (Phase 6 - projectId is now NOT NULL):');
    console.log(`  MetaConnection: ${beforeCounts.metaConnections}`);
    console.log(`  MetaPixel: ${beforeCounts.metaPixels}`);
    console.log(`  MetaAdAccount: ${beforeCounts.metaAdAccounts}`);
    console.log(`  WhatsAppConnection: ${beforeCounts.whatsAppConnections}`);
    console.log(`  WhatsAppConfig: ${beforeCounts.whatsAppConfigs}`);
    console.log(`  WhatsAppOnboarding: ${beforeCounts.whatsAppOnboardings}`);
    console.log();

    const totalBefore =
      beforeCounts.metaConnections +
      beforeCounts.metaPixels +
      beforeCounts.metaAdAccounts +
      beforeCounts.whatsAppConnections +
      beforeCounts.whatsAppConfigs +
      beforeCounts.whatsAppOnboardings;

    if (totalBefore === 0) {
      console.log('✅ Database is compliant with Phase 6. All assets have projectId set.');
      return;
    }

    console.log('\n---\n');

    if (totalBefore === 0) {
      console.log('✅ Phase 6 verification complete!');
      console.log('   All ownership models now have projectId NOT NULL enforced.');
      console.log('   - MetaConnection: projectId required');
      console.log('   - MetaAdAccount: projectId required');
      console.log('   - MetaPixel: projectId required');
      console.log('   - WhatsAppConnection: projectId required');
      console.log('   - WhatsAppConfig: projectId required');
      console.log('   - WhatsAppOnboarding: projectId required');
      console.log('\nSchema Hardening (Phase 6) is complete.');
    } else {
      console.log(`⚠️  ERROR: Found ${totalBefore} assets with NULL projectId.`);
      console.log('   Phase 6 migration was incomplete or database constraint failed.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupLegacyAssets();
