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
    <div className='min-h-screen bg-gradient-to-br from-background via-background to-muted/20'>
      <div className='border-border/50 border-b bg-background/80 backdrop-blur-sm'>
        <div className='mx-auto max-w-6xl px-6 py-12'>
          <div className='flex items-center gap-3'>
            <div className='h-11 w-11 animate-pulse rounded-lg bg-primary/10' />
            <div className='space-y-2'>
              <div className='h-9 w-72 animate-pulse rounded bg-muted/50' />
              <div className='mt-1 h-4 w-96 animate-pulse rounded bg-muted/40' />
            </div>
          </div>

          <div className='mt-8'>
            <div className='mb-2 flex items-center justify-between'>
              <div className='h-4 w-20 animate-pulse rounded bg-muted/40' />
              <div className='h-4 w-16 animate-pulse rounded bg-muted/40' />
            </div>
            <div className='h-2 w-full overflow-hidden rounded-full bg-muted'>
              <div className='h-full w-1/3 animate-pulse bg-gradient-to-r from-primary/40 to-primary/20' />
            </div>
          </div>
        </div>
      </div>

      <div className='mx-auto max-w-6xl px-6 py-12'>
        <div className='space-y-3'>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className='group relative rounded-xl border border-border bg-muted/30 p-4 transition-all duration-200'
            >
              <div className='flex items-center justify-between gap-4'>
                <div className='h-10 w-10 animate-pulse rounded-lg bg-muted' />
                <div className='min-w-0 flex-1 space-y-2'>
                  <div className='h-4 w-52 animate-pulse rounded bg-muted/60' />
                  <div className='h-3 w-full max-w-md animate-pulse rounded bg-muted/50' />
                </div>
                <div className='h-6 w-20 animate-pulse rounded-full bg-muted' />
              </div>
            </div>
          ))}
        </div>

        <div className='mt-12 rounded-lg border border-primary/20 bg-primary/5 p-6'>
          <div className='h-4 w-[26rem] animate-pulse rounded bg-muted/40' />
        </div>
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
