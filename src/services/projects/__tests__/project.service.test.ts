import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  billingSubscription: {
    findUnique: vi.fn(),
  },
  project: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  whatsAppConfig: {
    updateMany: vi.fn(),
  },
  metaAdAccount: {
    updateMany: vi.fn(),
  },
  lead: {
    updateMany: vi.fn(),
  },
  ticket: {
    updateMany: vi.fn(),
  },
  sale: {
    updateMany: vi.fn(),
  },
  item: {
    updateMany: vi.fn(),
  },
  itemCategory: {
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
} from '@/services/projects/project.service'
import { archiveProject } from '@/services/projects/project-archive.service'

describe('project.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation(async (operations: unknown[]) => operations)
    prismaMock.billingSubscription.findUnique.mockResolvedValue(null)
  })

  it('lists projects with mapped counts and pagination', async () => {
    prismaMock.project.findMany.mockResolvedValueOnce([
      {
        id: 'project_1',
        name: 'Cliente Acme',
        createdAt: new Date('2026-03-09T10:00:00.000Z'),
        updatedAt: new Date('2026-03-09T11:00:00.000Z'),
        _count: {
          whatsappConfigs: 1,
          metaAdAccounts: 2,
          leads: 12,
          tickets: 4,
          sales: 3,
          items: 6,
          itemCategories: 2,
        },
      },
    ])
    prismaMock.project.count.mockResolvedValueOnce(1)

    const result = await listProjects({
      organizationId: 'org_1',
      query: {
        page: 1,
        pageSize: 10,
        query: 'acme',
      },
    })

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
        where: {
          organizationId: 'org_1',
          name: {
            contains: 'acme',
            mode: 'insensitive',
          },
        },
      }),
    )
    expect(result.items[0]).toMatchObject({
      id: 'project_1',
      name: 'Cliente Acme',
      counts: {
        whatsappCount: 1,
        metaAdsCount: 2,
        leadCount: 12,
        ticketCount: 4,
        saleCount: 3,
        itemCount: 6,
        itemCategoryCount: 2,
      },
    })
  })

  it('creates a project when the name is unique', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null)
    prismaMock.project.create.mockResolvedValueOnce({
      id: 'project_1',
      name: 'Cliente Novo',
      createdAt: new Date('2026-03-09T10:00:00.000Z'),
      updatedAt: new Date('2026-03-09T10:00:00.000Z'),
      _count: {
        whatsappConfigs: 0,
        metaAdAccounts: 0,
        leads: 0,
        tickets: 0,
        sales: 0,
        items: 0,
        itemCategories: 0,
      },
    })

    const result = await createProject({
      organizationId: 'org_1',
      data: { name: 'Cliente Novo' },
    })

    expect(prismaMock.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          organizationId: 'org_1',
          name: 'Cliente Novo',
        },
      }),
    )
    expect(result).toMatchObject({
      id: 'project_1',
      name: 'Cliente Novo',
    })
  })

  it('rejects delete without force when the project has associations', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'project_1',
      _count: {
        whatsappConfigs: 1,
        metaAdAccounts: 0,
        leads: 0,
        tickets: 0,
        sales: 0,
        items: 0,
        itemCategories: 0,
      },
    })

    const result = await deleteProject({
      organizationId: 'org_1',
      projectId: 'project_1',
      force: false,
    })

    expect(result).toEqual({
      error: 'Projeto possui dados associados',
      status: 409,
      counts: {
        whatsappCount: 1,
        metaAdsCount: 0,
        leadCount: 0,
        ticketCount: 0,
        saleCount: 0,
        itemCount: 0,
        itemCategoryCount: 0,
      },
    })
  })

  it('forces delete by nullifying projectId on related records before deleting', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'project_1',
      _count: {
        whatsappConfigs: 1,
        metaAdAccounts: 1,
        leads: 2,
        tickets: 1,
        sales: 1,
        items: 3,
        itemCategories: 1,
      },
    })

    const result = await deleteProject({
      organizationId: 'org_1',
      projectId: 'project_1',
      force: true,
    })

    expect(prismaMock.$transaction).toHaveBeenCalledOnce()
    expect(prismaMock.project.delete).toHaveBeenCalledWith({
      where: { id: 'project_1' },
    })
    expect(result).toEqual({ success: true })
  })

  it('rejects project rename when another project already has the target name', async () => {
    prismaMock.project.findFirst
      .mockResolvedValueOnce({ id: 'project_1' })
      .mockResolvedValueOnce({ id: 'project_2' })

    const result = await updateProject({
      organizationId: 'org_1',
      projectId: 'project_1',
      data: { name: 'Cliente Existente' },
    })

    expect(result).toEqual({
      error: 'Já existe um projeto com este nome',
      status: 409,
    })
  })
})

describe('project-archive.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('archives a project by marking it as archived with timestamp', async () => {
    const now = new Date()
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'project_1',
      isArchived: false,
    })
    prismaMock.project.update.mockResolvedValue({
      id: 'project_1',
      isArchived: true,
      archivedAt: now,
    })

    const result = await archiveProject({
      organizationId: 'org_1',
      projectId: 'project_1',
    })

    expect(prismaMock.project.update).toHaveBeenCalledWith({
      where: { id: 'project_1' },
      data: expect.objectContaining({
        isArchived: true,
        archivedAt: expect.any(Date),
      }),
    })
    expect(result).toEqual({ success: true })
  })

  it('rejects archive if project not found', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null)

    const result = await archiveProject({
      organizationId: 'org_1',
      projectId: 'project_1',
    })

    expect(result).toEqual({
      error: 'Projeto não encontrado',
      status: 404,
    })
    expect(prismaMock.project.update).not.toHaveBeenCalled()
  })

  it('rejects archive if project is already archived', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'project_1',
      isArchived: true,
    })

    const result = await archiveProject({
      organizationId: 'org_1',
      projectId: 'project_1',
    })

    expect(result).toEqual({
      error: 'Projeto já foi arquivado',
      status: 409,
    })
    expect(prismaMock.project.update).not.toHaveBeenCalled()
  })
})
