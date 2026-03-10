import { PipelineSettings } from '@/components/dashboard/settings/pipeline-settings'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

export const metadata = { title: 'Pipeline — Configurações' }

export default async function PipelinePage() {
  await requireWorkspacePageAccess({ permissions: 'manage:settings' })
  return <PipelineSettings />
}
