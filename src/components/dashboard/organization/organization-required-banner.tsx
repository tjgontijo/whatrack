'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OrganizationIdentityDrawer } from '@/components/dashboard/organization/organization-identity-drawer'

type OrganizationRequiredBannerProps = {
  hasOrganization: boolean
  identityComplete: boolean
}

export function OrganizationRequiredBanner({
  hasOrganization,
  identityComplete,
}: OrganizationRequiredBannerProps) {
  if (hasOrganization && identityComplete) {
    return null
  }

  return (
    <div className="mb-4 rounded-lg border border-amber-300/80 bg-amber-50 px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {hasOrganization
                ? 'Complete os dados da organização para liberar integrações'
                : 'Você ainda não criou sua organização'}
            </p>
            <p className="text-xs text-amber-800/90">
              {hasOrganization
                ? 'WhatsApp e Meta Ads ficam bloqueados até concluir PF/PJ com documento válido.'
                : 'Crie sua organização e informe CPF/CNPJ para habilitar integrações.'}
            </p>
          </div>
        </div>

        <OrganizationIdentityDrawer
          hasOrganization={hasOrganization}
          trigger={
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200"
            >
              {hasOrganization ? 'Concluir dados da organização' : 'Criar organização agora'}
            </Button>
          }
        />
      </div>
    </div>
  )
}
