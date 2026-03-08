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
  updatedAt: string
}

type AccountOrganizationCardProps = {
  organization: AccountOrganization
  canManageOrganizationSettings: boolean
  isPending: boolean
  onSubmit: (data: UpdateOrganizationInput) => void
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalhes da conta</CardTitle>
        <CardDescription>
          Selecione PF ou PJ e preencha os dados do documento conforme o tipo.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">{accountNameLabel}</label>
          <Input
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
          />
        </div>

        <div className="grid gap-2 md:w-[320px]">
          <label className="text-sm font-medium">Tipo da conta</label>
          <Select
            value={organizationType}
            onValueChange={(value: 'pessoa_fisica' | 'pessoa_juridica') => {
              if (value !== organizationType) {
                setDocumentNumber('')
              }
              setOrganizationType(value)
            }}
          >
            <SelectTrigger>
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
            <label className="text-sm font-medium">{documentLabel}</label>
            <Input
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
            {isPending ? 'Salvando...' : 'Salvar detalhes da conta'}
          </Button>
          {!canManageOrganizationSettings && (
            <p className="text-muted-foreground mt-2 text-xs">
              Somente owner pode alterar os detalhes estruturais da conta.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
