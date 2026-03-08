'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { applyCpfCnpjMask } from '@/lib/mask/cpf-cnpj'

export type AccountOrganization = {
  id: string
  name: string
  organizationType: 'pessoa_fisica' | 'pessoa_juridica' | null
  documentType: 'cpf' | 'cnpj' | null
  documentNumber: string | null
  legalName: string | null
  tradeName: string | null
  taxStatus: string | null
  city: string | null
  state: string | null
  currentUserRole?: string
  updatedAt: string
}

type AccountOrganizationCardProps = {
  organization: AccountOrganization
  canManageOrganizationSettings: boolean
  onEdit: () => void
}

function getOrganizationTypeLabel(value: AccountOrganization['organizationType']) {
  if (value === 'pessoa_fisica') return 'Pessoa Física'
  if (value === 'pessoa_juridica') return 'Pessoa Jurídica'
  return 'Não definido'
}

function Field({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">
        {value?.trim() || 'Não informado'}
      </p>
    </div>
  )
}

export function AccountOrganizationCard({
  organization,
  canManageOrganizationSettings,
  onEdit,
}: AccountOrganizationCardProps) {
  const currentOrganizationTypeLabel = getOrganizationTypeLabel(organization.organizationType)
  const currentDocumentLabel = organization.documentType === 'cnpj' ? 'CNPJ atual' : 'CPF atual'
  const currentDocumentValue =
    organization.documentNumber && organization.documentType
      ? applyCpfCnpjMask(organization.documentNumber, organization.documentType)
      : null

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Dados fiscais</CardTitle>
          <CardDescription>
            Consulte o cadastro fiscal atual da conta. Para alterar PF/PJ ou documento, use o mesmo
            fluxo de onboarding.
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <Button onClick={onEdit} disabled={!canManageOrganizationSettings}>
            Editar dados fiscais
          </Button>
          {!canManageOrganizationSettings && (
            <p className="text-muted-foreground text-xs">
              Somente owner pode alterar os detalhes estruturais da conta.
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Nome da conta" value={organization.name} />
        <Field label="Tipo cadastral atual" value={currentOrganizationTypeLabel} />
        <Field label={currentDocumentLabel} value={currentDocumentValue} />

        {organization.organizationType === 'pessoa_juridica' ? (
          <>
            <Field label="Razão social" value={organization.legalName} />
            <Field label="Nome fantasia" value={organization.tradeName} />
            <Field label="Situação" value={organization.taxStatus} />
            <Field
              label="Município / UF"
              value={
                organization.city || organization.state
                  ? [organization.city, organization.state].filter(Boolean).join(' / ')
                  : null
              }
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
