import { prisma } from '@/lib/db/prisma'
import { auditService } from '@/services/audit/audit.service'

export async function listMetaConnections(organizationId: string, projectId: string) {
  return prisma.metaConnection.findMany({
    where: { organizationId, projectId },
    select: {
      id: true,
      fbUserId: true,
      fbUserName: true,
      status: true,
      updatedAt: true,
    },
  })
}

interface DeleteMetaConnectionParams {
  organizationId: string
  userId: string
  connectionId: string
}

export async function deleteMetaConnection(params: DeleteMetaConnectionParams) {
  const connection = await prisma.metaConnection.findUnique({
    where: { id: params.connectionId },
    select: { organizationId: true, fbUserId: true, fbUserName: true, status: true },
  })

  if (!connection || connection.organizationId !== params.organizationId) {
    return { error: 'Connection not found' as const, status: 404 as const }
  }

  await prisma.metaConnection.delete({ where: { id: params.connectionId } })

  void auditService.log({
    organizationId: connection.organizationId,
    userId: params.userId,
    action: 'meta_ads.disconnected',
    resourceType: 'meta_connection',
    resourceId: params.connectionId,
    before: {
      fbUserId: connection.fbUserId,
      fbUserName: connection.fbUserName,
      status: connection.status,
    },
  })

  return { success: true as const }
}
