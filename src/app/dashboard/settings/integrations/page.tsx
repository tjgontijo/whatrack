import Link from 'next/link'
import { MessageSquare, TrendingUp } from 'lucide-react'

import { PageContent, PageHeader, PageShell } from '@/components/dashboard/layout'
import { SettingsSection } from '@/components/dashboard/settings/settings-section'
import { Button } from '@/components/ui/button'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

export default async function IntegrationsPage() {
  await requireWorkspacePageAccess({ permissions: 'manage:integrations' })

  return (
    <PageShell maxWidth="5xl">
      <PageHeader
        title="Integrações"
        description="Centralize as conexões externas usadas pelos projetos da agência."
        icon={TrendingUp}
      />

      <PageContent className="space-y-6">
        <SettingsSection
          title="WhatsApp"
          description="Conecte números, acompanhe o status das instâncias e gerencie templates."
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              O WhatsApp é o canal operacional principal dos seus clientes.
            </p>
            <Button asChild>
              <Link href="/dashboard/settings/whatsapp">
                <MessageSquare className="mr-2 h-4 w-4" />
                Abrir WhatsApp
              </Link>
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Meta Ads"
          description="Gerencie perfis, contas de anúncio, pixels e vínculos por projeto."
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              Conecte perfis do Meta e sincronize as contas certas para cada projeto.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard/settings/meta-ads">
                <TrendingUp className="mr-2 h-4 w-4" />
                Abrir Meta Ads
              </Link>
            </Button>
          </div>
        </SettingsSection>
      </PageContent>
    </PageShell>
  )
}
