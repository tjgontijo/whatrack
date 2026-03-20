import { notFound, redirect } from 'next/navigation'
import { getServerSession } from '@/server/auth/server-session'
import { isOwner } from '@/lib/auth/rbac/roles'
import { DesignSystemContent } from './design-system-content'

export default async function DesignSystemPage() {
  const session = await getServerSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  // Design System é restrito apenas para Super Admins (role: owner)
  if (!isOwner(session.user.role)) {
    notFound()
  }

  return <DesignSystemContent />
}
