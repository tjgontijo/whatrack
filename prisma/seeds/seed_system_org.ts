import type { PrismaClient } from '@generated/prisma/client'

export async function seedSystemOrg(prisma: PrismaClient) {
    console.log('🏢 Seeding system organization...')

    const systemOrg = await prisma.organization.upsert({
        where: { slug: 'system' },
        update: {
            name: 'System',
        },
        create: {
            name: 'System',
            slug: 'system',
        },
    })

    console.log(`✅ System organization ensured: ${systemOrg.name} (${systemOrg.id})`)

    return systemOrg
}
