import { prisma } from '@/lib/db/prisma'
import { metaAdAccountService } from '@/services/meta-ads/ad-account.service'

interface ListMetaAdAccountsParams {
  organizationId: string
  projectId?: string
  sync: boolean
}

interface ToggleMetaAdAccountParams {
  organizationId: string
  routeId: string
  isActive?: boolean
  projectId?: string | null
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

  if (typeof params.projectId !== 'undefined' && params.projectId !== null) {
    const project = await prisma.project.findFirst({
      where: {
        id: params.projectId,
        organizationId: params.organizationId,
      },
      select: { id: true },
    })

    if (!project) {
      return { error: 'Projeto não encontrado' as const, status: 404 as const }
    }
  }

  const updated = await metaAdAccountService.toggleAccount(account.id, {
    isActive: params.isActive,
    projectId: params.projectId,
  })

  return { data: updated }
}

export async function listMetaAdAccounts(params: ListMetaAdAccountsParams) {
  if (params.sync) {
    const connections = await prisma.metaConnection.findMany({
      where: {
        organizationId: params.organizationId,
        ...(params.projectId ? { projectId: params.projectId } : {}),
        status: 'ACTIVE',
      },
      select: { id: true },
    })

    for (const connection of connections) {
      await metaAdAccountService.syncAdAccounts(connection.id)
    }
  }

  const accounts = await prisma.metaAdAccount.findMany({
    where: {
      organizationId: params.organizationId,
      ...(params.projectId ? { projectId: params.projectId } : {}),
    },
    orderBy: { adAccountName: 'asc' },
    select: {
      id: true,
      adAccountId: true,
      adAccountName: true,
      isActive: true,
      projectId: true,
      project: {
        select: {
          name: true,
        },
      },
    },
  })

  return accounts.map((account) => ({
    id: account.id,
    adAccountId: account.adAccountId,
    adAccountName: account.adAccountName,
    isActive: account.isActive,
    projectId: account.projectId,
    projectName: account.project?.name ?? null,
  }))
}
