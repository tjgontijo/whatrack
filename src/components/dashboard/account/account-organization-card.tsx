'use client'

import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { applyCpfCnpjMask, stripCpfCnpj } from '@/lib/mask/cpf-cnpj'
import type { UpdateOrganizationInput } from '@/schemas/organizations/organization-schemas'

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
  updatedAt: string
}

type AccountOrganizationCardProps = {
  organization: AccountOrganization
  canManageOrganizationSettings: boolean
  isPending: boolean
  onSubmit: (data: UpdateOrganizationInput) => void
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
  isPending,
  onSubmit,
}: AccountOrganizationCardProps) {
  const [organizationName, setOrganizationName] = useState(organization.name)
  const [organizationType, setOrganizationType] = useState<
    'pessoa_fisica' | 'pessoa_juridica' | ''
  >(organization.organizationType ?? '')
  const [documentNumber, setDocumentNumber] = useState(
    applyCpfCnpjMask(organization.documentNumber ?? '', organization.documentType),
  )

  const selectedDocumentType = useMemo(() => {
    if (organizationType === 'pessoa_fisica') return 'cpf'
    if (organizationType === 'pessoa_juridica') return 'cnpj'
    return null
  }, [organizationType])

  const documentInputMaxLength = selectedDocumentType === 'cnpj' ? 18 : 14

  const accountNameLabel = useMemo(() => {
    if (organizationType === 'pessoa_fisica') return 'Nome completo'
    if (organizationType === 'pessoa_juridica') return 'Razão social / Nome fantasia'
    return 'Nome da conta'
  }, [organizationType])

  const documentLabel = useMemo(() => {
    if (organizationType === 'pessoa_fisica') return 'CPF'
    if (organizationType === 'pessoa_juridica') return 'CNPJ'
    return 'Documento'
  }, [organizationType])

  const documentPlaceholder = useMemo(() => {
    if (organizationType === 'pessoa_juridica') return 'Informe o CNPJ'
    if (organizationType === 'pessoa_fisica') return 'Informe o CPF'
    return 'Selecione PF ou PJ para informar o documento'
  }, [organizationType])

  const currentOrganizationTypeLabel = getOrganizationTypeLabel(organization.organizationType)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados fiscais</CardTitle>
        <CardDescription>
          Edite o cadastro fiscal da organização e visualize os dados atuais vinculados à conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="account-organization-name">
            {accountNameLabel}
          </label>
          <Input
            id="account-organization-name"
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
          />
        </div>

        <div className="grid gap-2 md:w-[320px]">
          <label className="text-sm font-medium" htmlFor="account-organization-type">
            Tipo cadastral
          </label>
          <Select
            value={organizationType}
            onValueChange={(value: 'pessoa_fisica' | 'pessoa_juridica') => {
              if (value !== organizationType) {
                setDocumentNumber('')
              }
              setOrganizationType(value)
            }}
          >
            <SelectTrigger id="account-organization-type">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
              <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {organizationType ? (
          <div className="grid gap-2 md:w-[420px]">
            <label className="text-sm font-medium" htmlFor="account-organization-document">
              {documentLabel}
            </label>
            <Input
              id="account-organization-document"
              value={documentNumber}
              maxLength={documentInputMaxLength}
              placeholder={documentPlaceholder}
              onChange={(event) =>
                setDocumentNumber(applyCpfCnpjMask(event.target.value, selectedDocumentType))
              }
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Selecione o tipo da conta para preencher o documento.
          </p>
        )}

        <div>
          <Button
            onClick={() =>
              onSubmit({
                name: organizationName,
                organizationType: organizationType || null,
                documentType: selectedDocumentType,
                documentNumber: documentNumber ? stripCpfCnpj(documentNumber) : null,
              })
            }
            disabled={!canManageOrganizationSettings || isPending}
          >
            {isPending ? 'Salvando...' : 'Salvar dados fiscais'}
          </Button>
          {!canManageOrganizationSettings && (
            <p className="text-muted-foreground mt-2 text-xs">
              Somente owner pode alterar os detalhes estruturais da conta.
            </p>
          )}
        </div>

        <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Tipo cadastral atual" value={currentOrganizationTypeLabel} />
          <Field
            label={organization.documentType === 'cnpj' ? 'CNPJ atual' : 'CPF atual'}
            value={
              organization.documentNumber && organization.documentType
                ? applyCpfCnpjMask(organization.documentNumber, organization.documentType)
                : null
            }
          />

          {organization.organizationType === 'pessoa_juridica' && (
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
          )}
        </div>
      </CardContent>
    </Card>
  )
}
