import type { PrismaClient } from '../generated/prisma/client'

export async function seedSystemOrg(prisma: PrismaClient) {
    console.log('🏢 Seeding system organization...')

    const systemOrg = await prisma.organization.upsert({
        where: { slug: 'whatrack' },
        update: {
            name: 'Whatrack',
        },
        create: {
            name: 'WhaTrack',
            slug: 'whatrack',
        },
    })

    console.log(`✅ System organization ensured: ${systemOrg.name} (${systemOrg.id})`)

    return systemOrg
}
