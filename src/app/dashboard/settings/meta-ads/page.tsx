import { headers } from 'next/headers'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import { MetaAdsSettingsContent } from '@/components/dashboard/meta-ads/settings/meta-ads-settings-content'

export default async function MetaAdsSettingsPage() {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })
  const organizationId = session?.session?.activeOrganizationId

  if (!organizationId) {
    return <MetaAdsSettingsContent organizationId={undefined} />
  }

  // Parallel fetch for insane performance
  const [connections, adAccounts, pixels] = await Promise.all([
    prisma.metaConnection.findMany({
      where: { organizationId },
      select: { id: true, fbUserId: true, fbUserName: true, status: true, updatedAt: true },
    }),
    prisma.metaAdAccount.findMany({
      where: { organizationId },
      orderBy: { adAccountName: 'asc' },
      select: {
        id: true,
        adAccountId: true,
        adAccountName: true,
        isActive: true,
        projectId: true,
        project: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.metaPixel.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <MetaAdsSettingsContent
      organizationId={organizationId}
      initialConnections={JSON.parse(JSON.stringify(connections))}
      initialAdAccounts={adAccounts.map((account) => ({
        id: account.id,
        adAccountId: account.adAccountId,
        adAccountName: account.adAccountName,
        isActive: account.isActive,
        projectId: account.projectId,
        projectName: account.project?.name ?? null,
      }))}
      initialPixels={JSON.parse(JSON.stringify(pixels))}
    />
  )
}
