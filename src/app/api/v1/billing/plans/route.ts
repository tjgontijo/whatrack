import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        isActive: true,
      },
      include: {
        prices: {
          where: {
            isActive: true,
            currency: 'BRL',
            provider: 'asaas',
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })

    // Transform to the format expected by PlansComparison
    const items = plans.map((plan) => {
      const monthlyPrice = plan.prices.find((p) => p.interval === 'monthly')
      const yearlyPrice = plan.prices.find((p) => p.interval === 'yearly')

      return {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        priceMonthlyCents: monthlyPrice?.amountCents ?? 0,
        priceYearlyCents: yearlyPrice?.amountCents ?? 0,
        maxMetaProfiles: plan.maxMetaProfiles,
        maxMetaAdAccounts: plan.maxMetaAdAccounts,
        maxWhatsappInstances: plan.maxWhatsappInstances,
        maxMembers: plan.maxMembers,
        isRecommended: plan.slug === 'pro',
      }
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('[API] Error fetching plans:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar planos' },
      { status: 500 }
    )
  }
}
