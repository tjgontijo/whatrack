import { redirect } from 'next/navigation'
import { getServerSession } from '@/server/auth/server-session'
import { AuthGuards } from '@/lib/auth/roles'
import { PipelineSettings } from '@/components/dashboard/settings/pipeline-settings'

export const metadata = { title: 'Pipeline — Configurações' }

export default async function PipelinePage() {
  const session = await getServerSession()
  if (!session?.user) redirect('/sign-in')
  if (!AuthGuards.isSystemAdmin(session.user.role)) redirect('/dashboard')
  return <PipelineSettings />
}
