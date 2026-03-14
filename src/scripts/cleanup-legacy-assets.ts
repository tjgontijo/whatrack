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
  console.log('Starting cleanup of legacy assets without projectId...\n');

  try {
    // Count assets WITHOUT projectId before cleanup
    const beforeCounts = {
      metaConnections: await prisma.metaConnection.count({
        where: { projectId: null },
      }),
      metaPixels: await prisma.metaPixel.count({
        where: { projectId: null },
      }),
      metaAdAccounts: await prisma.metaAdAccount.count({
        where: { projectId: null },
      }),
      whatsAppConnections: await prisma.whatsAppConnection.count({
        where: { projectId: null },
      }),
      whatsAppConfigs: await prisma.whatsAppConfig.count({
        where: { projectId: null },
      }),
      whatsAppOnboardings: await prisma.whatsAppOnboarding.count({
        where: { projectId: null },
      }),
    };

    console.log('Assets without projectId (BEFORE cleanup):');
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
      console.log('✅ No legacy assets found. Database is already clean.');
      return;
    }

    // List assets to be deleted
    if (beforeCounts.metaConnections > 0) {
      console.log(`\nMetaConnection records to delete (${beforeCounts.metaConnections}):`);
      const items = await prisma.metaConnection.findMany({
        where: { projectId: null },
        select: {
          id: true,
          organizationId: true,
          fbUserId: true,
          fbUserName: true,
          status: true,
          createdAt: true,
        },
      });
      items.forEach((item) => {
        console.log(
          `  - ID: ${item.id}, Org: ${item.organizationId}, FB User: ${item.fbUserName} (${item.fbUserId})`,
        );
      });
    }

    if (beforeCounts.metaPixels > 0) {
      console.log(`\nMetaPixel records to delete (${beforeCounts.metaPixels}):`);
      const items = await prisma.metaPixel.findMany({
        where: { projectId: null },
        select: {
          id: true,
          organizationId: true,
          pixelId: true,
          name: true,
          createdAt: true,
        },
      });
      items.forEach((item) => {
        console.log(`  - ID: ${item.id}, Org: ${item.organizationId}, Pixel: ${item.pixelId} (${item.name})`);
      });
    }

    if (beforeCounts.metaAdAccounts > 0) {
      console.log(`\nMetaAdAccount records to delete (${beforeCounts.metaAdAccounts}):`);
      const items = await prisma.metaAdAccount.findMany({
        where: { projectId: null },
        select: {
          id: true,
          organizationId: true,
          adAccountId: true,
          adAccountName: true,
          createdAt: true,
        },
      });
      items.forEach((item) => {
        console.log(
          `  - ID: ${item.id}, Org: ${item.organizationId}, Ad Account: ${item.adAccountId} (${item.adAccountName})`,
        );
      });
    }

    if (beforeCounts.whatsAppConnections > 0) {
      console.log(`\nWhatsAppConnection records to delete (${beforeCounts.whatsAppConnections}):`);
      const items = await prisma.whatsAppConnection.findMany({
        where: { projectId: null },
        select: {
          id: true,
          organizationId: true,
          wabaId: true,
          status: true,
          createdAt: true,
        },
      });
      items.forEach((item) => {
        console.log(`  - ID: ${item.id}, Org: ${item.organizationId}, WABA: ${item.wabaId}`);
      });
    }

    if (beforeCounts.whatsAppConfigs > 0) {
      console.log(`\nWhatsAppConfig records to delete (${beforeCounts.whatsAppConfigs}):`);
      const items = await prisma.whatsAppConfig.findMany({
        where: { projectId: null },
        select: {
          id: true,
          organizationId: true,
          displayPhone: true,
          status: true,
          createdAt: true,
        },
      });
      items.forEach((item) => {
        console.log(`  - ID: ${item.id}, Org: ${item.organizationId}, Phone: ${item.displayPhone}`);
      });
    }

    if (beforeCounts.whatsAppOnboardings > 0) {
      console.log(`\nWhatsAppOnboarding records to delete (${beforeCounts.whatsAppOnboardings}):`);
      const items = await prisma.whatsAppOnboarding.findMany({
        where: { projectId: null },
        select: {
          id: true,
          organizationId: true,
          trackingCode: true,
          status: true,
          createdAt: true,
        },
      });
      items.forEach((item) => {
        console.log(`  - ID: ${item.id}, Org: ${item.organizationId}, Tracking: ${item.trackingCode}`);
      });
    }

    console.log('\n---\n');
    console.log(`Total assets to delete: ${totalBefore}`);
    console.log('\nDeleting legacy assets...\n');

    // Delete MetaConnection records (cascades to MetaAdAccount if not referenced elsewhere)
    const deletedMetaConnections = await prisma.metaConnection.deleteMany({
      where: { projectId: null },
    });
    console.log(`✓ Deleted ${deletedMetaConnections.count} MetaConnection records`);

    // Delete MetaPixel records
    const deletedMetaPixels = await prisma.metaPixel.deleteMany({
      where: { projectId: null },
    });
    console.log(`✓ Deleted ${deletedMetaPixels.count} MetaPixel records`);

    // Delete MetaAdAccount records (if any remain)
    const deletedMetaAdAccounts = await prisma.metaAdAccount.deleteMany({
      where: { projectId: null },
    });
    console.log(`✓ Deleted ${deletedMetaAdAccounts.count} MetaAdAccount records`);

    // Delete WhatsAppConnection records (cascades to WhatsAppConfig, WhatsAppHealth)
    const deletedWhatsAppConnections = await prisma.whatsAppConnection.deleteMany({
      where: { projectId: null },
    });
    console.log(`✓ Deleted ${deletedWhatsAppConnections.count} WhatsAppConnection records`);

    // Delete WhatsAppConfig records (if any remain)
    const deletedWhatsAppConfigs = await prisma.whatsAppConfig.deleteMany({
      where: { projectId: null },
    });
    console.log(`✓ Deleted ${deletedWhatsAppConfigs.count} WhatsAppConfig records`);

    // Delete WhatsAppOnboarding records
    const deletedWhatsAppOnboardings = await prisma.whatsAppOnboarding.deleteMany({
      where: { projectId: null },
    });
    console.log(`✓ Deleted ${deletedWhatsAppOnboardings.count} WhatsAppOnboarding records`);

    console.log();

    // Verify cleanup
    const afterCounts = {
      metaConnections: await prisma.metaConnection.count({
        where: { projectId: null },
      }),
      metaPixels: await prisma.metaPixel.count({
        where: { projectId: null },
      }),
      metaAdAccounts: await prisma.metaAdAccount.count({
        where: { projectId: null },
      }),
      whatsAppConnections: await prisma.whatsAppConnection.count({
        where: { projectId: null },
      }),
      whatsAppConfigs: await prisma.whatsAppConfig.count({
        where: { projectId: null },
      }),
      whatsAppOnboardings: await prisma.whatsAppOnboarding.count({
        where: { projectId: null },
      }),
    };

    console.log('Assets without projectId (AFTER cleanup):');
    console.log(`  MetaConnection: ${afterCounts.metaConnections}`);
    console.log(`  MetaPixel: ${afterCounts.metaPixels}`);
    console.log(`  MetaAdAccount: ${afterCounts.metaAdAccounts}`);
    console.log(`  WhatsAppConnection: ${afterCounts.whatsAppConnections}`);
    console.log(`  WhatsAppConfig: ${afterCounts.whatsAppConfigs}`);
    console.log(`  WhatsAppOnboarding: ${afterCounts.whatsAppOnboardings}`);
    console.log();

    const totalAfter =
      afterCounts.metaConnections +
      afterCounts.metaPixels +
      afterCounts.metaAdAccounts +
      afterCounts.whatsAppConnections +
      afterCounts.whatsAppConfigs +
      afterCounts.whatsAppOnboardings;

    if (totalAfter === 0) {
      console.log('✅ Cleanup complete! Database is now clean (0 assets without projectId).');
      console.log(`   Total deleted: ${totalBefore}`);
      console.log('   Ready for Phase 4: Read Path Cutover');
    } else {
      console.log(`⚠️  Cleanup incomplete. Found ${totalAfter} remaining assets without projectId:`);
      if (afterCounts.metaConnections > 0) {
        console.log(`   - MetaConnection: ${afterCounts.metaConnections}`);
      }
      if (afterCounts.metaPixels > 0) {
        console.log(`   - MetaPixel: ${afterCounts.metaPixels}`);
      }
      if (afterCounts.metaAdAccounts > 0) {
        console.log(`   - MetaAdAccount: ${afterCounts.metaAdAccounts}`);
      }
      if (afterCounts.whatsAppConnections > 0) {
        console.log(`   - WhatsAppConnection: ${afterCounts.whatsAppConnections}`);
      }
      if (afterCounts.whatsAppConfigs > 0) {
        console.log(`   - WhatsAppConfig: ${afterCounts.whatsAppConfigs}`);
      }
      if (afterCounts.whatsAppOnboardings > 0) {
        console.log(`   - WhatsAppOnboarding: ${afterCounts.whatsAppOnboardings}`);
      }
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
