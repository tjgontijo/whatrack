import { AiSettingsPage } from '@/components/dashboard/settings/ai-settings-page'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

export default async function AiStudioPage() {
  await requireWorkspacePageAccess({ permissions: 'manage:ai' })

  return <AiSettingsPage />
}
