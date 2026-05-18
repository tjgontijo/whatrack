'use client'

import { OptOutManager } from '@/features/campaigns/components/opt-out-manager'
import { HeaderPageShell } from '@/features/dashboard/components/layout'
import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'

export default function OptOutsPage() {
  const { organizationId } = useRequiredProjectRouteContext()

  return (
    <HeaderPageShell title='Blocklist'>
      <div className='mb-4'>
        <p className='text-muted-foreground text-sm'>
          Gerencie contatos que não devem receber campanhas.
        </p>
      </div>
      <OptOutManager organizationId={organizationId} />
    </HeaderPageShell>
  )
}
