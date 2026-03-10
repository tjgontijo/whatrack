import { WhatsAppSettingsPage } from '@/components/dashboard/settings/whatsapp-settings-page'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

export default async function WhatsAppSettingsRoute() {
  await requireWorkspacePageAccess({ permissions: 'manage:integrations' })

  return <WhatsAppSettingsPage />
}
