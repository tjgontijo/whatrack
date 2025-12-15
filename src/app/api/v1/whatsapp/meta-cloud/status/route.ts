import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'
import { prisma } from '@/lib/prisma'
import { SubscriptionStatus } from '@prisma/client'

const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.active,
  SubscriptionStatus.trialing,
  SubscriptionStatus.past_due,
]

/**
 * GET /api/v1/whatsapp/meta-cloud/status
 * Returns Meta Cloud add-on status and credential for the organization
 */
export async function GET(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    // Check if organization has Meta Cloud add-on
    const hasAddon = await checkMetaCloudAddon(access.organizationId)

    // Get credential if exists
    const credential = await prisma.metaWhatsAppCredential.findUnique({
      where: { organizationId: access.organizationId },
      select: {
        id: true,
        phoneNumberId: true,
        wabaId: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      hasAddon,
      credential,
    })
  } catch (error) {
    console.error('[api/v1/whatsapp/meta-cloud/status] GET error', error)
    return NextResponse.json({ error: 'Falha ao carregar status' }, { status: 500 })
  }
}

/**
 * Check if organization has Meta Cloud add-on
 *
 * MVP Implementation:
 * - For now, returns true if organization has an active subscription
 * - Future: Will check for specific meta_cloud add-on in subscription or dedicated AddOn table
 */
async function checkMetaCloudAddon(organizationId: string): Promise<boolean> {
  // For MVP: Check if org has active subscription
  // In production, this should check for the specific meta_cloud add-on
  const subscription = await prisma.subscription.findFirst({
    where: {
      billingCustomer: { organizationId },
      status: { in: ACTIVE_SUBSCRIPTION_STATUSES },
    },
    select: {
      id: true,
      plan: {
        select: {
          slug: true,
        },
      },
    },
  })

  if (!subscription) {
    return false
  }

  // MVP: Allow meta cloud for all paid plans
  // In production: Check subscription.addons or dedicated field
  // For testing: returning true to enable UI development
  return subscription.plan.slug !== 'free'
}
