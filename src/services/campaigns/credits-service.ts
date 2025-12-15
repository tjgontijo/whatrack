import { CreditTransactionType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function getCredits(organizationId: string) {
  return prisma.campaignCredits.upsert({
    where: { organizationId },
    update: {},
    create: { organizationId },
  })
}

export async function getCreditsWithBalance(organizationId: string) {
  return getCredits(organizationId)
}

export async function getTransactions(params: {
  organizationId: string
  page?: number
  pageSize?: number
}) {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20))

  const credits = await getCredits(params.organizationId)

  const [items, total] = await prisma.$transaction([
    prisma.campaignCreditTransaction.findMany({
      where: { creditsId: credits.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.campaignCreditTransaction.count({
      where: { creditsId: credits.id },
    }),
  ])

  return { items, total, page, pageSize }
}

export async function addCredits(params: {
  organizationId: string
  amountCents: number
  description?: string
  paymentId?: string
}) {
  if (params.amountCents <= 0) {
    throw new Error('Amount must be positive')
  }

  const credits = await getCredits(params.organizationId)

  return prisma.$transaction([
    prisma.campaignCredits.update({
      where: { id: credits.id },
      data: { balance: { increment: params.amountCents } },
    }),
    prisma.campaignCreditTransaction.create({
      data: {
        creditsId: credits.id,
        type: CreditTransactionType.PURCHASE,
        amount: params.amountCents,
        description: params.description ?? 'Compra de créditos',
        paymentId: params.paymentId,
      },
    }),
  ])
}

export async function debitCredits(params: {
  organizationId: string
  amountCents: number
  campaignId?: string
}) {
  if (params.amountCents <= 0) {
    throw new Error('Amount must be positive')
  }

  const credits = await getCredits(params.organizationId)

  if (credits.balance < params.amountCents) {
    throw new Error('Insufficient credits')
  }

  return prisma.$transaction([
    prisma.campaignCredits.update({
      where: { id: credits.id },
      data: { balance: { decrement: params.amountCents } },
    }),
    prisma.campaignCreditTransaction.create({
      data: {
        creditsId: credits.id,
        type: CreditTransactionType.CAMPAIGN_USE,
        amount: -params.amountCents,
        description: 'Uso em campanha',
        campaignId: params.campaignId,
      },
    }),
  ])
}
