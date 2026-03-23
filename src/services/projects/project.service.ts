import { Prisma } from '@generated/prisma/client'

import { prisma } from '@/lib/db/prisma'
import { ensureAiProjectDefaults } from '@/lib/ai/services/ai-project-defaults.service'
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
  slug: string
  createdAt: Date
  updatedAt: Date
  _count: {
    whatsappConfigs: number
    metaAdAccounts: number
    metaConnections: number
    metaPixels: number
    leads: number
    tickets: number
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
          tickets: true,
          sales: true,
          items: true,
          itemCategories: true,
        },
      },
    },
  })

  await syncOrganizationSubscriptionItems(input.organizationId)
  const aiDefaults = await ensureAiProjectDefaults(created.id, input.organizationId)

  if (!aiDefaults.success) {
    throw new Error(aiDefaults.error)
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

  const projectTickets = await prisma.ticket.findMany({
    where: {
      organizationId: input.organizationId,
      projectId: input.projectId,
    },
    select: {
      id: true,
    },
  })

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
          metaConnections: true,
          metaPixels: true,
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
    // Phase 6: Integration assets now have CASCADE delete (projectId is NOT NULL)
    // WhatsAppConfig has CASCADE delete, so it will be deleted automatically
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
