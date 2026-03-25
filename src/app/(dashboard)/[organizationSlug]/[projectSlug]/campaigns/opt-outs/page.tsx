'use client'

import { HeaderPageShell } from '@/components/dashboard/layout'
import { OptOutManager } from '@/components/dashboard/campaigns/opt-out-manager'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'

export default function OptOutsPage() {
  const { organizationId } = useRequiredProjectRouteContext()

  return (
    <HeaderPageShell title="Blocklist">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Gerencie contatos que não devem receber campanhas.
        </p>
      </div>
      <OptOutManager organizationId={organizationId} />
    </HeaderPageShell>
  )
}
