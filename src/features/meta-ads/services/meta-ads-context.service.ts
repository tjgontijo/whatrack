import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

interface MetaAdsAccountData {
  accountId: string
  accountName: string
  accountStatus: string
  spend30d?: number
  roas?: number
  pixelStatus?: string
  capiStatus?: string
  campaigns?: Array<{
    id: string
    name: string
    status: string
    spend?: number
    roas?: number
    objective?: string
    learningStatus?: string
  }>
  audiences?: Array<{
    name: string
    size: number
    type: string
  }>
  creatives?: Array<{
    id: string
    format: string
    status: string
  }>
}

/**
 * Format Meta Ads account data into context object for audit
 */
export function formatMetaAdsContext(
  accountData: MetaAdsAccountData
): Record<string, unknown> {
  const context: Record<string, unknown> = {
    account_id: accountData.accountId,
    account_name: accountData.accountName,
    account_status: accountData.accountStatus,
  }

  if (accountData.spend30d !== undefined) {
    context.spend_30d = accountData.spend30d
  }

  if (accountData.roas !== undefined) {
    context.roas = accountData.roas
  }

  if (accountData.pixelStatus) {
    context.pixel_status = accountData.pixelStatus
  }

  if (accountData.capiStatus) {
    context.capi_status = accountData.capiStatus
  }

  if (accountData.campaigns && accountData.campaigns.length > 0) {
    context.campaigns = accountData.campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      spend: c.spend,
      roas: c.roas,
      objective: c.objective,
      learning_status: c.learningStatus,
    }))
  }

  if (accountData.audiences && accountData.audiences.length > 0) {
    context.audiences = accountData.audiences.map((a) => ({
      name: a.name,
      size: a.size,
      type: a.type,
    }))
  }

  if (accountData.creatives && accountData.creatives.length > 0) {
    const formatCounts = {
      image: 0,
      video: 0,
      carousel: 0,
      other: 0,
    }

    accountData.creatives.forEach((c) => {
      const format = c.format?.toLowerCase() || 'other'
      if (format in formatCounts) {
        formatCounts[format as keyof typeof formatCounts]++
      } else {
        formatCounts.other++
      }
    })

    context.creative_formats = formatCounts
    context.total_creatives = accountData.creatives.length
  }

  return context
}

/**
 * Fetch Meta Ads account data from integration
 *
 * TODO: Implement actual Meta Ads API calls once integration is finalized
 * For now, returns mock data structure
 */
export async function fetchMetaAdsAccountData(
  accountId: string,
  organizationId: string
): Promise<MetaAdsAccountData> {
  try {
    // TODO: Fetch from Meta Ads API via existing connection
    // This is a placeholder structure

    logger.info(
      `[Meta Ads] Fetching account data for ${accountId} in org ${organizationId}`
    )

    // Placeholder: would fetch from Meta API
    const accountData: MetaAdsAccountData = {
      accountId,
      accountName: 'Account Name',
      accountStatus: 'ACTIVE',
      spend30d: 5000,
      roas: 2.3,
      pixelStatus: 'active',
      capiStatus: 'configured',
      campaigns: [
        {
          id: '1',
          name: 'Campaign 1',
          status: 'ACTIVE',
          spend: 2000,
          roas: 2.5,
          objective: 'CONVERSIONS',
          learningStatus: 'ACTIVE',
        },
      ],
      audiences: [
        {
          name: 'Custom Audience 1',
          size: 5000,
          type: 'CUSTOM_AUDIENCE',
        },
      ],
      creatives: [
        {
          id: 'c1',
          format: 'image',
          status: 'ACTIVE',
        },
      ],
    }

    return accountData
  } catch (error) {
    logger.error(
      { err: error },
      `[Meta Ads] Failed to fetch account data for ${accountId}`
    )
    throw error
  }
}
