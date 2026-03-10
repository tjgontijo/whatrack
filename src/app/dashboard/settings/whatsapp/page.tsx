import { MessageSquare } from 'lucide-react'

import { PageContent, PageHeader, PageShell } from '@/components/dashboard/layout'
import { WhatsAppSettingsPage } from '@/components/dashboard/settings/whatsapp-settings-page'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

export default async function WhatsAppSettingsRoute() {
  await requireWorkspacePageAccess({ permissions: 'manage:integrations' })

  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        title="WhatsApp"
        description="Gerencie números conectados, instâncias e templates dos projetos."
        icon={MessageSquare}
      />

      <PageContent className="px-0 pb-0">
        <WhatsAppSettingsPage />
      </PageContent>
    </PageShell>
  )
}
