import type { PrismaClient } from '../generated/prisma/client'

const adPlatforms = [
  { key: 'google', name: 'Google Ads' },
  { key: 'meta', name: 'Meta Ads' },
  { key: 'tiktok', name: 'TikTok Ads' },
  { key: 'microsoft', name: 'Microsoft Ads' },
  { key: 'linkedin', name: 'LinkedIn Ads' },
  { key: 'twitter', name: 'X (Twitter) Ads' },
  { key: 'snapchat', name: 'Snapchat Ads' },
  { key: 'pinterest', name: 'Pinterest Ads' },
  { key: 'kwai', name: 'Kwai Ads' },
  { key: 'taboola', name: 'Taboola' },
  { key: 'outbrain', name: 'Outbrain' },
]

export async function seedAdPlatforms(prisma: PrismaClient) {
  console.log('Seeding ad platforms...')

  for (const platform of adPlatforms) {
    await prisma.adPlatform.upsert({
      where: { key: platform.key },
      update: { name: platform.name },
      create: {
        key: platform.key,
        name: platform.name,
        active: true,
      },
    })
  }

  console.log(`Seeded ${adPlatforms.length} platforms`)
}
