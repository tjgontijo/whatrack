import { prisma } from '../src/lib/prisma';

async function main() {
  const logs = await prisma.whatsAppWebhookLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: {
      id: true,
      eventType: true,
      organizationId: true,
      createdAt: true,
      payload: true
    }
  });

  console.log('=== WEBHOOK LOGS ===\n');

  for (const log of logs) {
    console.log(`ID: ${log.id}`);
    console.log(`Event Type: ${log.eventType}`);
    console.log(`Organization ID: ${log.organizationId}`);
    console.log(`Created At: ${log.createdAt}`);
    console.log(`Payload:`);
    console.log(JSON.stringify(log.payload, null, 2));
    console.log('\n---\n');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
