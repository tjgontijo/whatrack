import { prisma } from '../lib/db/prisma'

async function main() {
  console.log('--- Checking WhatsApp Connections ---')
  const connections = await prisma.whatsAppConnection.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  console.log(JSON.stringify(connections, null, 2))

  console.log('\n--- Checking WhatsApp Configs ---')
  const configs = await prisma.whatsAppConfig.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
        project: { select: { name: true, organizationId: true } }
    }
  })
  console.log(JSON.stringify(configs, null, 2))

  console.log('\n--- Checking Recent Onboarding ---')
  const onboarding = await prisma.whatsAppOnboarding.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  })
  console.log(JSON.stringify(onboarding, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
