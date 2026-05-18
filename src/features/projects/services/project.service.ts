import 'server-only'

import type { Prisma } from '@generated/prisma/client'
import { billingAutoUpgradeService } from '@/features/billing/services/billing-auto-upgrade.service'
import {
  assertProjectCreationAllowed,
  syncOrganizationSubscriptionItems,
} from '@/features/billing/services/billing-subscription.service'
import type {
  ProjectAssociationCounts,
  ProjectCreateInput,
  ProjectDetail,
  ProjectListItem,
  ProjectListQuery,
  ProjectListResponse,
  ProjectUpdateInput,
} from '@/features/projects/schemas/project.schemas'
import { prisma } from '@/lib/db/prisma'

type ProjectSummaryRow = {
  id: string
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
  _count: {
    whatsappConfigs: number
    metaAdAccounts: number
    metaConnections: number
    metaPixels: number
    leads: number
    deals: number
    sales: number
    items: number
    itemCategories: number
  }
}

type ProjectError =
  | { error: 'Projeto não encontrado'; status: 404 }
  | { error: 'Já existe um projeto com este slug'; status: 409 }
  | {
      error: 'Projeto possui dados associados'
      status: 409
      counts: ProjectAssociationCounts
    }

function buildProjectWhere(
  organizationId: string,
  query: ProjectListQuery
): Prisma.ProjectWhereInput {
  const search = query.query?.trim()

  return {
    organizationId,
    ...(search
      ? {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        }
      : {}),
  }
}

function mapProjectCounts(input: ProjectSummaryRow['_count']): ProjectAssociationCounts {
  return {
    whatsappCount: input.whatsappConfigs,
    metaAdsCount: input.metaAdAccounts,
    metaConnectionCount: input.metaConnections,
    metaPixelCount: input.metaPixels,
    leadCount: input.leads,
    dealCount: input.deals,
    saleCount: input.sales,
    itemCount: input.items,
    itemCategoryCount: input.itemCategories,
  }
}

function mapProject(item: ProjectSummaryRow): ProjectListItem {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    counts: mapProjectCounts(item._count),
  }
}

async function ensureUniqueProjectSlug(input: {
  organizationId: string
  slug: string
  excludeProjectId?: string
}) {
  const existing = await prisma.project.findFirst({
    where: {
      organizationId: input.organizationId,
      slug: input.slug.trim(),
      ...(input.excludeProjectId ? { id: { not: input.excludeProjectId } } : {}),
    },
    select: { id: true },
  })

  return !existing
}

export async function listProjects(input: {
  organizationId: string
  query: ProjectListQuery
}): Promise<ProjectListResponse> {
  const where = buildProjectWhere(input.organizationId, input.query)
  const skip = (input.query.page - 1) * input.query.pageSize

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      skip,
      take: input.query.pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            whatsappConfigs: true,
            metaAdAccounts: true,
            metaConnections: true,
            metaPixels: true,
            leads: true,
            deals: true,
            sales: true,
            items: true,
            itemCategories: true,
          },
        },
      },
    }),
    prisma.project.count({ where }),
  ])

  return {
    items: items.map(mapProject),
    total,
    page: input.query.page,
    pageSize: input.query.pageSize,
    totalPages: Math.ceil(total / input.query.pageSize),
  }
}

export async function createProject(input: {
  organizationId: string
  data: ProjectCreateInput
}): Promise<ProjectListItem | Extract<ProjectError, { status: 409 }>> {
  await assertProjectCreationAllowed(input.organizationId)

  const isUnique = await ensureUniqueProjectSlug({
    organizationId: input.organizationId,
    slug: input.data.slug,
  })

  if (!isUnique) {
    return { error: 'Já existe um projeto com este slug', status: 409 }
  }

  const created = await prisma.project.create({
    data: {
      organizationId: input.organizationId,
      name: input.data.name.trim(),
      slug: input.data.slug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          whatsappConfigs: true,
          metaAdAccounts: true,
          metaConnections: true,
          metaPixels: true,
          leads: true,
          deals: true,
          sales: true,
          items: true,
          itemCategories: true,
        },
      },
    },
  })

  await syncOrganizationSubscriptionItems(input.organizationId)

  const projectCount = await prisma.project.count({
    where: { organizationId: input.organizationId },
  })

  const upgradeResult = await billingAutoUpgradeService.performAutoUpgradeIfNeeded(
    input.organizationId,
    projectCount
  )

  // Send notification asynchronously (non-blocking)
  if (upgradeResult.upgraded && upgradeResult.newPlanCode) {
    billingAutoUpgradeService
      .sendUpgradeNotification({
        organizationId: input.organizationId,
        oldPlanName: upgradeResult.oldPlanId ? 'Plano anterior' : 'Desconhecido',
        newPlanName: upgradeResult.newPlanCode,
        upgradeDate: new Date(),
        nextChargeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        nextChargeAmount:
          upgradeResult.proratingResult?.netAmount ||
          new (require('@prisma/client').Prisma.Decimal)(0),
      })
      .catch(() => {
        // Silently fail
      })
  }

  return mapProject(created)
}

export async function getProjectById(input: {
  organizationId: string
  projectId: string
}): Promise<ProjectDetail | null> {
  const project = await prisma.project.findFirst({
    where: {
      id: input.projectId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          whatsappConfigs: true,
          metaAdAccounts: true,
          metaConnections: true,
          metaPixels: true,
          leads: true,
          deals: true,
          sales: true,
          items: true,
          itemCategories: true,
        },
      },
      whatsappConfigs: {
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          phoneId: true,
          displayPhone: true,
          verifiedName: true,
          status: true,
        },
      },
      metaAdAccounts: {
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          adAccountId: true,
          adAccountName: true,
          isActive: true,
        },
      },
    },
  })

  if (!project) {
    return null
  }

  const projectDeals = await prisma.deal.findMany({
    where: {
      organizationId: input.organizationId,
      projectId: input.projectId,
    },
    select: {
      id: true,
    },
  })

  const conversionCount = projectDeals.length
    ? await prisma.metaConversionEvent.count({
        where: {
          organizationId: input.organizationId,
          success: true,
          dealId: {
            in: projectDeals.map((deal) => deal.id),
          },
        },
      })
    : 0

  return {
    ...mapProject(project),
    conversionCount,
    whatsappConfigs: project.whatsappConfigs,
    metaAdAccounts: project.metaAdAccounts,
  }
}

export async function updateProject(input: {
  organizationId: string
  projectId: string
  data: ProjectUpdateInput
}): Promise<ProjectListItem | ProjectError> {
  const existing = await prisma.project.findFirst({
    where: {
      id: input.projectId,
      organizationId: input.organizationId,
    },
    select: { id: true },
  })

  if (!existing) {
    return { error: 'Projeto não encontrado', status: 404 }
  }

  if (input.data.slug?.trim()) {
    const isUnique = await ensureUniqueProjectSlug({
      organizationId: input.organizationId,
      slug: input.data.slug,
      excludeProjectId: input.projectId,
    })

    if (!isUnique) {
      return { error: 'Já existe um projeto com este slug', status: 409 }
    }
  }

  const updated = await prisma.project.update({
    where: { id: input.projectId },
    data: {
      ...(input.data.name ? { name: input.data.name.trim() } : {}),
      ...(input.data.slug ? { slug: input.data.slug.trim() } : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          whatsappConfigs: true,
          metaAdAccounts: true,
          metaConnections: true,
          metaPixels: true,
          leads: true,
          deals: true,
          sales: true,
          items: true,
          itemCategories: true,
        },
      },
    },
  })

  return mapProject(updated)
}

export async function deleteProject(input: {
  organizationId: string
  projectId: string
  force?: boolean
}): Promise<{ success: true } | ProjectError> {
  const project = await prisma.project.findFirst({
    where: {
      id: input.projectId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      _count: {
        select: {
          whatsappConfigs: true,
          metaAdAccounts: true,
          metaConnections: true,
          metaPixels: true,
          leads: true,
          deals: true,
          sales: true,
          items: true,
          itemCategories: true,
        },
      },
    },
  })

  if (!project) {
    return { error: 'Projeto não encontrado', status: 404 }
  }

  const counts = mapProjectCounts(project._count)
  const hasAssociations = Object.values(counts).some((value) => value > 0)

  if (hasAssociations && !input.force) {
    return {
      error: 'Projeto possui dados associados',
      status: 409,
      counts,
    }
  }

  await prisma.$transaction([
    // Phase 6: Integration assets now have CASCADE delete (projectId is NOT NULL)
    // WhatsAppConfig has CASCADE delete, so it will be deleted automatically
    prisma.lead.updateMany({
      where: {
        organizationId: input.organizationId,
        projectId: input.projectId,
      },
      data: { projectId: null },
    }),
    prisma.deal.updateMany({
      where: {
        organizationId: input.organizationId,
        projectId: input.projectId,
      },
      data: { projectId: null },
    }),
    prisma.sale.updateMany({
      where: {
        organizationId: input.organizationId,
        projectId: input.projectId,
      },
      data: { projectId: null },
    }),
    prisma.item.updateMany({
      where: {
        organizationId: input.organizationId,
        projectId: input.projectId,
      },
      data: { projectId: null },
    }),
    prisma.itemCategory.updateMany({
      where: {
        organizationId: input.organizationId,
        projectId: input.projectId,
      },
      data: { projectId: null },
    }),
    prisma.project.delete({
      where: { id: input.projectId },
    }),
  ])

  await syncOrganizationSubscriptionItems(input.organizationId)

  return { success: true }
}
