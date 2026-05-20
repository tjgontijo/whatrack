import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { LaunchpadScreen } from '@/features/launchpad/components/launchpad-screen'
import {
  getLaunchpadState,
  isLaunchpadComplete,
} from '@/features/launchpad/services/get-launchpad-state'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/server/auth/server'

interface LaunchpadPageProps {
  params: Promise<{
    organizationSlug: string
    projectSlug: string
  }>
}

function LaunchpadFallback() {
  return (
    <div className='space-y-6 p-8'>
      <div className='h-12 w-64 animate-pulse rounded bg-muted/40' />
      <div className='grid gap-4 md:grid-cols-2'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='h-48 animate-pulse rounded-lg border bg-muted/40' />
        ))}
      </div>
    </div>
  )
}

export default async function LaunchpadPage({ params }: LaunchpadPageProps) {
  const { organizationSlug, projectSlug } = await params

  const session = await getServerSession()
  if (!session?.user?.id) {
    return notFound()
  }

  // Resolve organization
  const organization = await prisma.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true, name: true },
  })

  if (!organization) {
    return notFound()
  }

  // Verify user has access to organization
  const member = await prisma.member.findFirst({
    where: {
      organizationId: organization.id,
      userId: session.user.id,
    },
  })

  if (!member) {
    return notFound()
  }

  // Resolve project
  let projectId: string | null = null
  if (projectSlug !== '__default__') {
    const project = await prisma.project.findUnique({
      where: {
        organizationId_slug: {
          slug: projectSlug,
          organizationId: organization.id,
        },
      },
      select: { id: true, name: true },
    })

    if (!project) {
      return notFound()
    }

    projectId = project.id
  } else {
    const defaultProject = await prisma.project.findFirst({
      where: {
        organizationId: organization.id,
        slug: 'default',
      },
      select: { id: true },
    })

    if (!defaultProject) {
      return notFound()
    }

    projectId = defaultProject.id
  }

  // Check if launchpad is complete — if so, redirect to dashboard
  const complete = await isLaunchpadComplete(organization.id, projectId)
  if (complete) {
    return redirect(`/${organizationSlug}/${projectSlug}`)
  }

  // Get launchpad state
  const items = await getLaunchpadState(organization.id, projectId)

  // Get org and project names
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organization.id },
    select: { name: true },
  })

  return (
    <Suspense fallback={<LaunchpadFallback />}>
      <LaunchpadScreen
        organizationId={organization.id}
        organizationSlug={organizationSlug}
        organizationName={org.name}
        projectId={projectId}
        projectSlug={projectSlug}
        items={items}
      />
    </Suspense>
  )
}
