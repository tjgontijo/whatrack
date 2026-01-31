import type { PrismaClient } from '../generated/prisma/client'

const trackingIdentifierTypes = [
  { key: 'gclid', name: 'Google Click ID', platformKey: 'google' },
  { key: 'gbraid', name: 'Google App Attribution (Android)', platformKey: 'google' },
  { key: 'wbraid', name: 'Google App Attribution (iOS)', platformKey: 'google' },
  { key: 'fbclid', name: 'Facebook Click ID', platformKey: 'meta' },
  { key: 'ctwa_clid', name: 'Click to WhatsApp ID', platformKey: 'meta' },
  { key: 'msclkid', name: 'Microsoft Click ID', platformKey: 'microsoft' },
  { key: 'ttclid', name: 'TikTok Click ID', platformKey: 'tiktok' },
  { key: 'twclid', name: 'Twitter/X Click ID', platformKey: 'twitter' },
  { key: 'li_fat_id', name: 'LinkedIn First-Party Ad Tracking', platformKey: 'linkedin' },
  { key: 'sccid', name: 'Snapchat Click ID', platformKey: 'snapchat' },
  { key: 'epik', name: 'Pinterest Click ID', platformKey: 'pinterest' },
]

export async function seedTrackingIdentifierTypes(prisma: PrismaClient) {
  console.log('Seeding tracking identifier types...')

  for (const type of trackingIdentifierTypes) {
    const platform = await prisma.adPlatform.findUnique({
      where: { key: type.platformKey },
    })

    await prisma.trackingIdentifierType.upsert({
      where: { key: type.key },
      update: {
        name: type.name,
        platformId: platform?.id ?? null,
      },
      create: {
        key: type.key,
        name: type.name,
        platformId: platform?.id ?? null,
        active: true,
      },
    })
  }

  console.log(`Seeded ${trackingIdentifierTypes.length} identifier types`)
}
