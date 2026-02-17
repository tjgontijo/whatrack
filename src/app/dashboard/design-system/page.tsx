import { redirect } from 'next/navigation'
import { getServerSession } from '@/server/auth/server-session'
import { DesignSystemContent } from './design-system-content'

export default async function DesignSystemPage() {
  const session = await getServerSession()

  const isSuperAdmin =
    session?.user?.role === 'owner' ||
    (session?.user?.email && session?.user?.email === process.env.NEXT_PUBLIC_OWNER_EMAIL)

  if (!isSuperAdmin) {
    redirect('/dashboard')
  }

  return <DesignSystemContent />
}
