import type { PrismaClient } from '@generated/prisma/client'
import { auth } from '../../src/lib/auth/auth'

export async function seedAdminUser(prisma: PrismaClient) {
  console.log('👤 Seeding admin user...')

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME

  if (!adminEmail || !adminPassword || !adminName) {
    console.warn('⚠️ Missing admin environment variables (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME). Skipping admin user seed.')
    return
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingUser) {
    console.log(`ℹ️ User ${adminEmail} already exists. Skipping creation...`)
    return existingUser
  }

  try {
    // Create user via better-auth to handle hashing
    const result = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      },
    })

    if (!result || !result.user) {
      throw new Error('Failed to create admin user via auth.api')
    }

    const user = result.user
    console.log(`✅ Admin user created: ${adminEmail} (${user.id})`)

    // Ensure the user has the 'owner' role
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'owner' },
    })

    return user
  } catch (error) {
    console.error('❌ Error seeding admin user:', error)
    throw error
  }
}
