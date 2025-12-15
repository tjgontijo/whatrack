import { TemplateCategory, TemplateStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getMetaCloudConfig } from '@/services/whatsapp/meta-cloud/config'
import type { ListTemplatesParams } from './types'

const CATEGORY_MAP: Record<string, TemplateCategory | undefined> = {
  MARKETING: TemplateCategory.MARKETING,
  UTILITY: TemplateCategory.UTILITY,
  AUTHENTICATION: TemplateCategory.AUTHENTICATION,
}

const STATUS_MAP: Record<string, TemplateStatus | undefined> = {
  APPROVED: TemplateStatus.APPROVED,
  PENDING: TemplateStatus.PENDING,
  REJECTED: TemplateStatus.REJECTED,
  PAUSED: TemplateStatus.PAUSED,
}

export async function listTemplates(params: ListTemplatesParams) {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20))
  const where: Prisma.WhatsAppTemplateWhereInput = {
    organizationId: params.organizationId,
    ...(params.category ? { category: params.category } : {}),
    ...(params.status ? { status: params.status } : {}),
  }

  const [items, total] = await prisma.$transaction([
    prisma.whatsAppTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.whatsAppTemplate.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function syncTemplates(organizationId: string) {
  const credential = await prisma.metaWhatsAppCredential.findUnique({
    where: { organizationId },
  })

  if (!credential) {
    throw new Error('Meta credential not configured')
  }

  const { graphApiUrl } = getMetaCloudConfig()
  const response = await fetch(
    `${graphApiUrl}/${credential.wabaId}/message_templates`,
    {
      headers: {
        Authorization: `Bearer ${credential.accessToken}`,
      },
    }
  )

  const data = await response.json()
  if (!response.ok) {
    const message = data?.error?.message || 'Failed to fetch templates'
    throw new Error(message)
  }

  const templates: Array<{
    id: string
    name: string
    language: string
    category: string
    status: string
    components: unknown
  }> = data?.data ?? []

  for (const tpl of templates) {
    const category = CATEGORY_MAP[tpl.category?.toUpperCase?.() || '']
    const status = STATUS_MAP[tpl.status?.toUpperCase?.() || '']

    if (!category || !status) continue

    await prisma.whatsAppTemplate.upsert({
      where: {
        organizationId_templateId: {
          organizationId,
          templateId: tpl.id,
        },
      },
      create: {
        organizationId,
        templateId: tpl.id,
        name: tpl.name,
        language: tpl.language,
        category,
        status,
        components: tpl.components ?? {},
        syncedAt: new Date(),
      },
      update: {
        name: tpl.name,
        language: tpl.language,
        category,
        status,
        components: tpl.components ?? {},
        syncedAt: new Date(),
      },
    })
  }

  return listTemplates({ organizationId, page: 1, pageSize: 50 })
}
