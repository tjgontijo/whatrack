import { Prisma } from '@generated/prisma/client'

import { prisma } from '@/lib/db/prisma'
import {
  assertProjectCreationAllowed,
  syncOrganizationSubscriptionItems,
} from '@/services/billing/billing-subscription.service'
import type {
  ProjectAssociationCounts,
  ProjectCreateInput,
  ProjectDetail,
  ProjectListItem,
  ProjectListQuery,
  ProjectListResponse,
  ProjectUpdateInput,
} from '@/schemas/projects/project-schemas'

type ProjectSummaryRow = {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  _count: {
    whatsappConfigs: number
    metaAdAccounts: number
    leads: number
    tickets: number
    sales: number
    items: number
    itemCategories: number
  }
}

type ProjectError =
  | { error: 'Projeto não encontrado'; status: 404 }
  | { error: 'Já existe um projeto com este nome'; status: 409 }
  | {
      error: 'Projeto possui dados associados'
      status: 409
      counts: ProjectAssociationCounts
    }

function buildProjectWhere(
  organizationId: string,
  query: ProjectListQuery,
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
    leadCount: input.leads,
    ticketCount: input.tickets,
    saleCount: input.sales,
    itemCount: input.items,
    itemCategoryCount: input.itemCategories,
  }
}

function mapProject(item: ProjectSummaryRow): ProjectListItem {
  return {
    id: item.id,
    name: item.name,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    counts: mapProjectCounts(item._count),
  }
}

async function ensureUniqueProjectName(input: {
  organizationId: string
  name: string
  excludeProjectId?: string
}) {
  const existing = await prisma.project.findFirst({
    where: {
      organizationId: input.organizationId,
      name: input.name.trim(),
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
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            whatsappConfigs: true,
            metaAdAccounts: true,
            leads: true,
            tickets: true,
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

  const isUnique = await ensureUniqueProjectName({
    organizationId: input.organizationId,
    name: input.data.name,
  })

  if (!isUnique) {
    return { error: 'Já existe um projeto com este nome', status: 409 }
  }

  const created = await prisma.project.create({
    data: {
      organizationId: input.organizationId,
      name: input.data.name.trim(),
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          whatsappConfigs: true,
          metaAdAccounts: true,
          leads: true,
          tickets: true,
          sales: true,
          items: true,
          itemCategories: true,
        },
      },
    },
  })

  await syncOrganizationSubscriptionItems(input.organizationId)

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
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          whatsappConfigs: true,
          metaAdAccounts: true,
          leads: true,
          tickets: true,
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

  const [projectTickets, aiCreditsAgg] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        organizationId: input.organizationId,
        projectId: input.projectId,
      },
      select: {
        id: true,
      },
    }),
    prisma.aiInsightCost.aggregate({
      where: {
        organizationId: input.organizationId,
        status: 'success',
        insight: {
          ticket: {
            projectId: input.projectId,
          },
        },
      },
      _sum: {
        totalTokens: true,
      },
    }),
  ])

  const conversionCount = projectTickets.length
    ? await prisma.metaConversionEvent.count({
        where: {
          organizationId: input.organizationId,
          success: true,
          ticketId: {
            in: projectTickets.map((ticket) => ticket.id),
          },
        },
      })
    : 0

  return {
    ...mapProject(project),
    conversionCount,
    aiCreditsUsed: aiCreditsAgg._sum.totalTokens ?? 0,
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

  if (input.data.name?.trim()) {
    const isUnique = await ensureUniqueProjectName({
      organizationId: input.organizationId,
      name: input.data.name,
      excludeProjectId: input.projectId,
    })

    if (!isUnique) {
      return { error: 'Já existe um projeto com este nome', status: 409 }
    }
  }

  const updated = await prisma.project.update({
    where: { id: input.projectId },
    data: {
      ...(input.data.name ? { name: input.data.name.trim() } : {}),
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          whatsappConfigs: true,
          metaAdAccounts: true,
          leads: true,
          tickets: true,
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
          leads: true,
          tickets: true,
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
    prisma.whatsAppConfig.updateMany({
      where: {
        organizationId: input.organizationId,
        projectId: input.projectId,
      },
      data: { projectId: null },
    }),
    prisma.metaAdAccount.updateMany({
      where: {
        organizationId: input.organizationId,
        projectId: input.projectId,
      },
      data: { projectId: null },
    }),
    prisma.lead.updateMany({
      where: {
        organizationId: input.organizationId,
        projectId: input.projectId,
      },
      data: { projectId: null },
    }),
    prisma.ticket.updateMany({
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
