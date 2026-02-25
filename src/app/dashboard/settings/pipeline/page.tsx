import { redirect } from 'next/navigation'
import { getServerSession } from '@/server/auth/server-session'
import { isAdmin } from '@/lib/auth/rbac/roles'
import { PipelineSettings } from '@/components/dashboard/settings/pipeline-settings'

export const metadata = { title: 'Pipeline — Configurações' }

export default async function PipelinePage() {
  const session = await getServerSession()
  if (!session?.user) redirect('/sign-in')
  if (!isAdmin(session.user.role)) redirect('/dashboard')
  return <PipelineSettings />
}
