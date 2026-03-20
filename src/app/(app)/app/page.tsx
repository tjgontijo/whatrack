import { redirect } from 'next/navigation'

import { getServerSession } from '@/server/auth/server-session'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export default async function AppEntryPage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/sign-in')
  }

  const member = await prisma.member.findFirst({
    where: { userId: session.user.id },
    select: {
      organization: {
        select: {
          slug: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!member) {
    redirect('/welcome')
  }

  const firstProject = await prisma.project.findFirst({
    where: {
      organization: {
        slug: member.organization.slug,
      },
      isArchived: false,
    },
    select: {
      slug: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!firstProject) {
    redirect('/welcome')
  }

  redirect(`/${member.organization.slug}/${firstProject.slug}`)
}
