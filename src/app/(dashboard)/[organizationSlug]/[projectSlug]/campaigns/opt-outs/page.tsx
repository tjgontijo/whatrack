'use client'

import { HeaderPageShell } from '@/features/dashboard/components/layout'
import { OptOutManager } from '@/features/campaigns/components/opt-out-manager'
import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'

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
