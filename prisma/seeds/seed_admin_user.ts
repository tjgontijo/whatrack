import type { PrismaClient } from '@generated/prisma/client'
import { auth } from '../../src/lib/auth/auth'

export async function seedAdminUser(prisma: PrismaClient) {
  console.log('👤 Seeding admin user...')

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME
  const adminCpf = process.env.ADMIN_CPF

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

    // Ensure the user has the 'owner' role (the hook in auth.ts should handle this if OWNER_EMAIL matches)
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'owner' },
    })

    // 1. Ensure system organization exists and user is a member
    const systemOrg = await prisma.organization.findUnique({
      where: { slug: 'system' },
    })

    if (systemOrg) {
      await prisma.member.upsert({
        where: {
          organizationId_userId: {
            organizationId: systemOrg.id,
            userId: user.id,
          },
        },
        update: { role: 'owner' },
        create: {
          organizationId: systemOrg.id,
          userId: user.id,
          role: 'owner',
          createdAt: new Date(),
        },
      })
      console.log(`✅ User added as owner of System organization`)
    }

    // 2. Create personal organization for the admin
    const personalSlug = adminName.toLowerCase().replace(/\s+/g, '-')
    const personalOrg = await prisma.organization.upsert({
      where: { slug: personalSlug },
      update: {},
      create: {
        name: adminName,
        slug: personalSlug,
      },
    })
    console.log(`✅ Personal organization created: ${personalOrg.name} (${personalOrg.slug})`)

    // Add user as owner of personal organization
    await prisma.member.upsert({
      where: {
        organizationId_userId: {
          organizationId: personalOrg.id,
          userId: user.id,
        },
      },
      update: { role: 'owner' },
      create: {
        organizationId: personalOrg.id,
        userId: user.id,
        role: 'owner',
        createdAt: new Date(),
      },
    })

    // Create personal organization profile with CPF
    if (adminCpf) {
      await prisma.organizationProfile.upsert({
        where: { organizationId: personalOrg.id },
        update: { cpf: adminCpf },
        create: {
          organizationId: personalOrg.id,
          cpf: adminCpf,
          onboardingStatus: 'completed',
        },
      })
      console.log(`✅ Personal organization profile updated with CPF: ${adminCpf}`)
    }

    // 3. Create default project for the personal organization
    const defaultProject = await prisma.project.upsert({
      where: {
        organizationId_slug: {
          organizationId: personalOrg.id,
          slug: 'default',
        },
      },
      update: {},
      create: {
        organizationId: personalOrg.id,
        name: 'Default Project',
        slug: 'default',
      },
    })
    console.log(`✅ Default project created for ${personalOrg.name}`)

    return user
  } catch (error) {
    console.error('❌ Error seeding admin user:', error)
    throw error
  }
}
