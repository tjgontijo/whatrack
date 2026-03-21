import { WhatsAppSettingsHub } from '@/components/dashboard/whatsapp/settings/whatsapp-settings-hub'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

type SettingsWhatsAppPageProps = {
  params: Promise<{ organizationSlug: string }>
}

export default async function SettingsWhatsAppPage({ params }: SettingsWhatsAppPageProps) {
  const { organizationSlug } = await params
  const access = await requireWorkspacePageAccess({
    permissions: 'manage:integrations',
    organizationSlug,
  })

  return <WhatsAppSettingsHub organizationId={access.organizationId} />
}
