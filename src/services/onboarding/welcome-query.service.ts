import { prisma } from '@/lib/db/prisma'
import { getCurrentOrganizationId } from '@/server/organization/get-current-organization-id'
import { getCurrentProjectId } from '@/server/project/get-current-project-id'

export async function getWelcomeState(input: {
  userId: string
  fallbackOwnerName: string | null
}) {
  const organizationId = await getCurrentOrganizationId(input.userId)

  if (!organizationId) {
    return {
      ownerName: input.fallbackOwnerName,
      organization: null,
      projects: [],
      activeProjectId: null,
      activeProjectPath: null,
      activeProjectName: null,
      trialEndsAt: null,
      trialExpired: false,
      trialDaysRemaining: null,
      checklist: {
        whatsappConnected: false,
        metaAdsConnected: false,
        trackedConversationDetected: false,
      },
    }
  }

  const [organization, projects, subscription] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true },
    }),
    prisma.project.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    prisma.billingSubscription.findUnique({
      where: { organizationId },
      select: {
        trialEndsAt: true,
        providerSubscriptionId: true,
      },
    }),
  ])

  const activeProjectId = (await getCurrentProjectId(organizationId)) ?? projects[0]?.id ?? null
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null
  const activeProjectName = activeProject?.name ?? null
  const activeProjectPath =
    organization?.slug && activeProject?.slug ? `/${organization.slug}/${activeProject.slug}` : null

  const [whatsappConnected, metaAdsConnected, trackedConversationDetected] = activeProjectId
    ? await Promise.all([
        prisma.whatsAppConfig.count({
          where: {
            organizationId,
            projectId: activeProjectId,
          },
        }),
        prisma.metaAdAccount.count({
          where: {
            organizationId,
            projectId: activeProjectId,
            isActive: true,
          },
        }),
        prisma.ticketTracking.count({
          where: {
            sourceType: { not: 'organic' },
            ticket: {
              organizationId,
              projectId: activeProjectId,
            },
          },
        }),
      ])
    : [0, 0, 0]

  const trialEndsAt = subscription?.trialEndsAt ?? null
  const trialExpired = Boolean(
    trialEndsAt &&
      !subscription?.providerSubscriptionId &&
      trialEndsAt.getTime() <= Date.now(),
  )
  const trialDaysRemaining = trialEndsAt
    ? Math.max(
        0,
        Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : null

  return {
    ownerName: input.fallbackOwnerName,
    organization,
    projects,
    activeProjectId,
    activeProjectPath,
    activeProjectName,
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    trialExpired,
    trialDaysRemaining,
    checklist: {
      whatsappConnected: whatsappConnected > 0,
      metaAdsConnected: metaAdsConnected > 0,
      trackedConversationDetected: trackedConversationDetected > 0,
    },
  }
}
