import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

/**
 * GET /api/v1/whatsapp/instances
 *
 * Returns list of WhatsApp instances (phone numbers) connected to the organization.
 * Used by the inbox instance selector to filter conversations by instance.
 *
 * Response:
 * {
 *   "items": [
 *     {
 *       "id": "uuid",
 *       "displayPhone": "+55 11 91234-5678",
 *       "verifiedName": "Empresa LTDA",
 *       "status": "connected",
 *       "wabaId": "123456",
 *       "lastWebhookAt": "2024-02-16T10:30:00Z"
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Validate user authentication and organization access
    const access = await validateFullAccess(request)

    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json(
        { error: access.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch all connected instances for the organization
    const instances = await prisma.whatsAppConfig.findMany({
      where: {
        organizationId: access.organizationId,
        status: 'connected',
      },
      select: {
        id: true,
        displayPhone: true,
        verifiedName: true,
        status: true,
        wabaId: true,
        lastWebhookAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json(
      {
        items: instances.map((instance) => ({
          id: instance.id,
          displayPhone: instance.displayPhone || 'Número não disponível',
          verifiedName: instance.verifiedName || 'Sem nome verificado',
          status: instance.status,
          wabaId: instance.wabaId,
          lastWebhookAt: instance.lastWebhookAt?.toISOString() || null,
        })),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[WhatsApp Instances] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch instances' },
      { status: 500 }
    )
  }
}
