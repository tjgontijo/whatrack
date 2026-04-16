import { Prisma, PrismaClient } from '@generated/prisma/client'

export async function seedBillingPlanHistory(prisma: PrismaClient) {
  console.log('📜 Seeding billing plan history for existing subscriptions...')

  const subscriptions = await prisma.billingSubscription.findMany({
    include: {
      offer: {
        include: {
          plan: true,
        },
      },
      organization: {
        include: {
          projects: true,
        },
      },
    },
  })

  let createdCount = 0

  for (const subscription of subscriptions) {
    if (!subscription.offer?.plan) {
      continue
    }

    const projectCount = subscription.organization.projects.length
    const plan = subscription.offer.plan

    // Verificar se já existe entrada de histórico
    const existingHistory = await prisma.billingPlanHistory.findFirst({
      where: {
        subscriptionId: subscription.id,
      },
    })

    if (existingHistory) {
      console.log(`  ⏭️  Subscription ${subscription.id} já tem histórico, pulando...`)
      continue
    }

    // Determinar reason baseado no status
    const reason = subscription.isActive ? 'trial_to_paid' : 'trial_to_paid'

    // Criar entrada no histórico
    await prisma.billingPlanHistory.create({
      data: {
        subscriptionId: subscription.id,
        planId: plan.id,
        startedAt: subscription.purchaseDate,
        endedAt: null,
        reason,
        projectCountAtChange: projectCount,
      },
    })

    // Atualizar currentPlanId no subscription
    await prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: {
        currentPlanId: plan.id,
      },
    })

    createdCount++
    console.log(
      `  ✅ Histórico criado para ${subscription.organization.name} (${plan.name}, ${projectCount} projetos)`,
    )
  }

  console.log(
    `✅ Billing plan history seeded successfully! (${createdCount} subscriptions updated)`,
  )
}
