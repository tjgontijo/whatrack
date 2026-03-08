import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { dispatchAiEventForAudit } from '@/services/ai/ai-execution-audit.service'
import {
  fetchMetaAdsAccountData,
  formatMetaAdsContext,
} from '@/services/meta-ads/meta-ads-context.service'
import { metaAdsAuditSchema } from '@/schemas/meta-ads/meta-ads-schemas'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

export async function POST(req: Request) {
  try {
    // 1. Validate access
    const access = await validatePermissionAccess(req, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Unauthorized', 401)
    }

    // 2. Parse request
    const parsed = metaAdsAuditSchema.safeParse(await req.json())
    if (!parsed.success) {
      return apiError('Invalid request', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const { accountId } = parsed.data

    logger.info(
      `[Meta Ads Audit] Starting audit for account ${accountId} in org ${access.organizationId}`
    )

    // 3. Check quota (simple: count audits this month)
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const monthlyAuditCount = await prisma.aiInsight.count({
      where: {
        organizationId: access.organizationId,
        eventType: 'META_ADS_AUDIT_REQUESTED',
        createdAt: { gte: monthStart },
      },
    })

    // Get subscription tier
    const subscription = await prisma.billingSubscription.findFirst({
      where: {
        organizationId: access.organizationId,
        status: 'ACTIVE',
      },
    })

    const quotas = {
      starter: 5,
      pro: 50,
      agency: 500,
    }

    const tier = (subscription?.planType || 'starter') as keyof typeof quotas
    const quota = quotas[tier] || 5

    if (monthlyAuditCount >= quota) {
      logger.warn(
        `[Meta Ads Audit] Quota exceeded for org ${access.organizationId} (${monthlyAuditCount}/${quota})`
      )
      return apiError('Quota exceeded', 429, {
        remaining: 0,
        monthlyUsage: monthlyAuditCount,
        monthlyQuota: quota,
        overageCost: 0.5,
      })
    }

    // 4. Fetch Meta Ads account data
    logger.info(`[Meta Ads Audit] Fetching account data for ${accountId}`)
    const accountData = await fetchMetaAdsAccountData(
      accountId,
      access.organizationId
    )

    // 5. Format context
    const auditContext = formatMetaAdsContext(accountData)

    // 6. Dispatch audit
    logger.info(
      `[Meta Ads Audit] Dispatching agent for ${accountId}`
    )
    const insight = await dispatchAiEventForAudit(
      'META_ADS_AUDIT_REQUESTED',
      access.organizationId,
      auditContext
    )

    logger.info(
      `[Meta Ads Audit] Audit completed, insight: ${insight.id}`
    )

    // 7. Return result
    return apiSuccess({
      insightId: insight.id,
      ...insight.payload,
      quotaStatus: {
        remaining: quota - (monthlyAuditCount + 1),
        monthlyUsage: monthlyAuditCount + 1,
        monthlyQuota: quota,
      },
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    logger.error(
      { err: detail },
      '[Meta Ads Audit] Error processing request'
    )

    if (detail.includes('No active agent found')) {
      return apiError('Meta Ads Analyst agent not configured', 503)
    }

    return apiError('Audit failed', 500, detail)
  }
}
