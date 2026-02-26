import { prisma } from '@/lib/db/prisma'
import { metaAdAccountService } from '@/services/meta-ads/ad-account.service'

interface ListMetaAdAccountsParams {
  organizationId: string
  sync: boolean
}

export async function listMetaAdAccounts(params: ListMetaAdAccountsParams) {
  if (params.sync) {
    const connections = await prisma.metaConnection.findMany({
      where: {
        organizationId: params.organizationId,
        status: 'ACTIVE',
      },
      select: { id: true },
    })

    for (const connection of connections) {
      await metaAdAccountService.syncAdAccounts(connection.id)
    }
  }

  return prisma.metaAdAccount.findMany({
    where: { organizationId: params.organizationId },
    orderBy: { adAccountName: 'asc' },
  })
}

interface ToggleMetaAdAccountParams {
  organizationId: string
  routeId: string
  isActive: boolean
}

export async function toggleMetaAdAccount(params: ToggleMetaAdAccountParams) {
  const account = await prisma.metaAdAccount.findFirst({
    where: {
      id: params.routeId,
      organizationId: params.organizationId,
    },
    select: { id: true },
  })

  if (!account) {
    return { error: 'Conta não encontrada' as const, status: 404 as const }
  }

  const updated = await metaAdAccountService.toggleAccount(account.id, params.isActive)
  return { data: updated }
}
