import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { whatsappCampaignImportSchema } from '@/schemas/whatsapp/whatsapp-campaign-schemas'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if (digits.length === 12 && digits.startsWith('55')) return digits
  return digits
}

export async function POST(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const parsed = whatsappCampaignImportSchema.safeParse(await request.json())
  if (!parsed.success) {
    return apiError('Payload inválido', 400, undefined, { details: parsed.error.flatten() })
  }

  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: parsed.data.campaignId, organizationId: access.organizationId },
    include: {
      dispatchGroups: {
        where: { status: 'PENDING' },
        select: { id: true },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!campaign) {
    return apiError('Campanha não encontrada', 404)
  }

  if (campaign.status !== 'DRAFT' && campaign.status !== 'PENDING_APPROVAL') {
    return apiError('Campanha não aceita mais importação', 400)
  }

  const dispatchGroups = campaign.dispatchGroups
  if (dispatchGroups.length === 0) {
    return apiError('Nenhum grupo de envio definido na campanha', 400)
  }

  const importRecord = await prisma.whatsAppCampaignImport.create({
    data: {
      campaignId: campaign.id,
      fileName: 'bulk_import',
      totalRows: parsed.data.rows.length,
    },
  })

  try {
    const seenPhones = new Set<string>()
    const recipients: Array<{
      dispatchGroupId: string
      campaignId: string
      phone: string
      normalizedPhone: string
      leadId: string | null
      variables: object | undefined
      status: string
    }> = []
    let duplicatesRemoved = 0

    for (let i = 0; i < parsed.data.rows.length; i++) {
      const row = parsed.data.rows[i]
      const normalized = normalizePhone(row.phone)

      if (seenPhones.has(normalized)) {
        duplicatesRemoved++
        continue
      }
      seenPhones.add(normalized)

      const groupIndex = i % dispatchGroups.length
      const dispatchGroupId = dispatchGroups[groupIndex].id

      recipients.push({
        dispatchGroupId,
        campaignId: campaign.id,
        phone: row.phone,
        normalizedPhone: normalized,
        leadId: null,
        variables: row.variables ? { body: row.variables } : undefined,
        status: 'PENDING',
      })
    }

    if (recipients.length > 0) {
      await prisma.whatsAppCampaignRecipient.createManyAndReturn({ data: recipients })
    }

    await prisma.whatsAppCampaignImport.update({
      where: { id: importRecord.id },
      data: {
        status: 'COMPLETED',
        processedRows: recipients.length,
      },
    })

    logger.info(
      {
        campaignId: campaign.id,
        importId: importRecord.id,
        imported: recipients.length,
        duplicatesRemoved,
      },
      '[WhatsAppCampaignImport] Bulk import completed'
    )

    return apiSuccess({
      importId: importRecord.id,
      imported: recipients.length,
      excluded: 0,
      duplicatesRemoved,
    })
  } catch (error) {
    await prisma.whatsAppCampaignImport.update({
      where: { id: importRecord.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    return apiError('Erro ao processar importação', 500)
  }
}
