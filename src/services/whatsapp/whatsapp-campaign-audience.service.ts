import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import type { WhatsAppCampaignPreviewAudienceInput } from '@/schemas/whatsapp/whatsapp-campaign-schemas'

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function formatPhoneForMeta(phone: string): string {
  const digits = normalizePhone(phone)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`.replace(/(\d{2})(\d{5})(\d{4})/, '$1$2$3')
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return digits
  }
  return digits
}

export interface AudiencePreviewResult {
  total: number
  eligible: number
  excluded: ExcludedSummary
  duplicates: number
  breakdown: AudienceBreakdown[]
}

export interface ExcludedSummary {
  total: number
  reasons: Record<string, number>
}

export interface AudienceBreakdown {
  phone: string
  variables?: Array<{ name: string; value: string }>
  source: 'CRM' | 'IMPORT'
  leadId?: string
  eligible: boolean
  exclusionReason?: string
}

export interface AudienceBuildResult {
  success: true
  recipients: Array<{
    phone: string
    normalizedPhone: string
    leadId: string | null
    variables?: Array<{ name: string; value: string }>
    exclusionReason?: string
  }>
  excluded: Array<{
    phone: string
    reason: string
  }>
  duplicatesRemoved: number
}

function classifyExclusion(phone: string, reason: string): { phone: string; reason: string } {
  return { phone, reason }
}

export async function previewAudience(
  organizationId: string,
  input: WhatsAppCampaignPreviewAudienceInput
): Promise<AudiencePreviewResult> {
  const breakdown: AudienceBreakdown[] = []
  const exclusionReasons: Record<string, number> = {}
  let duplicates = 0

  const seenPhones = new Set<string>()

  if (input.audience?.source === 'CRM' || input.audience?.source === 'MIXED') {
    const leadFilters: Record<string, unknown> = {
      organizationId,
      isActive: true,
    }

    if (input.audience.crmFilters?.isActive !== undefined) {
      leadFilters.isActive = input.audience.crmFilters.isActive
    }
    if (input.audience.crmFilters?.source) {
      leadFilters.source = input.audience.crmFilters.source
    }
    if (input.audience.crmFilters?.projectId) {
      leadFilters.projectId = input.audience.crmFilters.projectId
    }
    if (input.audience.crmFilters?.stageId) {
      leadFilters.conversations = {
        some: {
          tickets: {
            some: {
              stageId: input.audience.crmFilters.stageId,
            },
          },
        },
      }
    }

    const leads = await prisma.lead.findMany({
      where: leadFilters,
      select: { id: true, phone: true, waId: true },
    })

    for (const lead of leads) {
      const rawPhone = lead.waId || lead.phone || ''
      if (!rawPhone) {
        const excl = classifyExclusion('', 'NO_PHONE')
        exclusionReasons[excl.reason] = (exclusionReasons[excl.reason] || 0) + 1
        continue
      }

      const normalized = formatPhoneForMeta(rawPhone)
      const key = normalized

      if (seenPhones.has(key)) {
        duplicates++
        continue
      }
      seenPhones.add(key)

      breakdown.push({
        phone: rawPhone,
        source: 'CRM',
        leadId: lead.id,
        eligible: true,
      })
    }
  }

  if (input.audience?.source === 'IMPORT' || input.audience?.source === 'MIXED') {
    const phones = input.audience.importedPhones || []
    const withVars = input.audience.importedVariables || []

    const importedPhones = new Map<string, Array<{ name: string; value: string }>>()
    for (const item of withVars) {
      importedPhones.set(item.phone, item.variables || [])
    }

    for (const phone of phones) {
      const normalized = formatPhoneForMeta(phone)

      if (seenPhones.has(normalized)) {
        duplicates++
        continue
      }
      seenPhones.add(normalized)

      breakdown.push({
        phone,
        source: 'IMPORT',
        variables: importedPhones.get(phone),
        eligible: true,
      })
    }
  }

  const eligible = breakdown.filter((b) => b.eligible).length
  const total = breakdown.length
  const excludedTotal = Object.values(exclusionReasons).reduce((acc, count) => acc + count, 0)

  logger.info(
    { organizationId, projectId: input.projectId, total, eligible, excludedTotal, duplicates },
    '[WhatsAppCampaignAudience] Audience preview'
  )

  return {
    total,
    eligible,
    excluded: { total: excludedTotal, reasons: exclusionReasons },
    duplicates,
    breakdown: breakdown.slice(0, 100),
  }
}

export async function buildAudience(
  organizationId: string,
  projectId: string,
  campaignId: string,
  input: WhatsAppCampaignPreviewAudienceInput['audience']
): Promise<AudienceBuildResult> {
  const seenPhones = new Set<string>()
  const recipients: AudienceBuildResult['recipients'] = []
  const excluded: AudienceBuildResult['excluded'] = []
  let duplicatesRemoved = 0

  if (input?.source === 'CRM' || input?.source === 'MIXED') {
    const leadFilters: Record<string, unknown> = {
      organizationId,
      isActive: true,
    }

    if (input.crmFilters?.isActive !== undefined) {
      leadFilters.isActive = input.crmFilters.isActive
    }
    if (input.crmFilters?.source) {
      leadFilters.source = input.crmFilters.source
    }
    if (input.crmFilters?.projectId) {
      leadFilters.projectId = input.crmFilters.projectId
    }
    if (input.crmFilters?.stageId) {
      leadFilters.conversations = {
        some: {
          tickets: {
            some: {
              stageId: input.crmFilters.stageId,
            },
          },
        },
      }
    }

    const leads = await prisma.lead.findMany({
      where: leadFilters,
      select: { id: true, phone: true, waId: true },
    })

    for (const lead of leads) {
      const rawPhone = lead.waId || lead.phone || ''
      if (!rawPhone) {
        excluded.push({ phone: rawPhone, reason: 'NO_PHONE' })
        continue
      }

      const normalized = formatPhoneForMeta(rawPhone)
      const key = normalized

      if (seenPhones.has(key)) {
        duplicatesRemoved++
        excluded.push({ phone: rawPhone, reason: 'DUPLICATE' })
        continue
      }

      seenPhones.add(key)
      recipients.push({
        phone: rawPhone,
        normalizedPhone: normalized,
        leadId: lead.id,
      })
    }
  }

  if (input?.source === 'IMPORT' || input?.source === 'MIXED') {
    const phones = input.importedPhones || []
    const withVars = input.importedVariables || []

    const importedPhones = new Map<string, Array<{ name: string; value: string }>>()
    for (const item of withVars) {
      importedPhones.set(item.phone, item.variables || [])
    }

    for (const phone of phones) {
      const normalized = formatPhoneForMeta(phone)

      if (seenPhones.has(normalized)) {
        duplicatesRemoved++
        excluded.push({ phone, reason: 'DUPLICATE' })
        continue
      }

      seenPhones.add(normalized)
      recipients.push({
        phone,
        normalizedPhone: normalized,
        leadId: null,
        variables: importedPhones.get(phone),
      })
    }
  }

  logger.info(
    {
      campaignId,
      totalRecipients: recipients.length,
      excluded: excluded.length,
      duplicatesRemoved,
    },
    '[WhatsAppCampaignAudience] Audience built'
  )

  return { success: true, recipients, excluded, duplicatesRemoved }
}
