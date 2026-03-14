import { prisma } from '@/lib/db/prisma'

interface CreateMetaPixelParams {
  organizationId: string
  pixelId?: string
  capiToken?: string
  name?: string
  projectId?: string
}

interface UpdateMetaPixelParams {
  organizationId: string
  routeId: string
  isActive?: boolean
  name?: string
  pixelId?: string
  capiToken?: string
}

interface DeleteMetaPixelParams {
  organizationId: string
  routeId: string
}

export async function listMetaPixels(organizationId: string, projectId?: string) {
  return prisma.metaPixel.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createMetaPixel(params: CreateMetaPixelParams) {
  const fallbackPixelId = params.pixelId || `temp_${Date.now()}`

  return prisma.metaPixel.create({
    data: {
      organizationId: params.organizationId,
      pixelId: fallbackPixelId,
      capiToken: params.capiToken || '',
      name: params.name,
      ...(typeof params.projectId !== 'undefined' ? { projectId: params.projectId } : {}),
    },
  })
}

export async function updateMetaPixel(params: UpdateMetaPixelParams) {
  const existing = await prisma.metaPixel.findFirst({
    where: {
      id: params.routeId,
      organizationId: params.organizationId,
    },
    select: { id: true },
  })

  if (!existing) {
    return { error: 'Pixel not found' as const, status: 404 as const }
  }

  const data: Record<string, unknown> = {}
  if (typeof params.isActive === 'boolean') data.isActive = params.isActive
  if (typeof params.name !== 'undefined') data.name = params.name
  if (typeof params.pixelId !== 'undefined') data.pixelId = params.pixelId
  if (typeof params.capiToken !== 'undefined') data.capiToken = params.capiToken

  const updated = await prisma.metaPixel.update({
    where: { id: existing.id },
    data,
  })

  return { data: updated }
}

export async function deleteMetaPixel(params: DeleteMetaPixelParams) {
  const existing = await prisma.metaPixel.findFirst({
    where: {
      id: params.routeId,
      organizationId: params.organizationId,
    },
    select: { id: true },
  })

  if (!existing) {
    return { error: 'Pixel not found' as const, status: 404 as const }
  }

  await prisma.metaPixel.delete({
    where: { id: existing.id },
  })

  return { success: true as const }
}
