'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { applyCpfCnpjMask } from '@/lib/mask/cpf-cnpj'

export type AccountFiscalData = {
  organizationType: 'pessoa_fisica' | 'pessoa_juridica' | null
  documentType: 'cpf' | 'cnpj' | null
  documentNumber: string | null
  legalName: string | null
  tradeName: string | null
  taxStatus: string | null
  city: string | null
  state: string | null
}

type AccountFiscalCardProps = {
  fiscalData: AccountFiscalData
}

function getOrganizationTypeLabel(value: AccountFiscalData['organizationType']) {
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

export function AccountFiscalCard({ fiscalData }: AccountFiscalCardProps) {
  const formattedDocument =
    fiscalData.documentNumber && fiscalData.documentType
      ? applyCpfCnpjMask(fiscalData.documentNumber, fiscalData.documentType)
      : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados fiscais</CardTitle>
        <CardDescription>
          Informações fiscais vinculadas à organização ativa.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Tipo cadastral" value={getOrganizationTypeLabel(fiscalData.organizationType)} />
        <Field
          label={fiscalData.documentType === 'cnpj' ? 'CNPJ' : 'CPF'}
          value={formattedDocument}
        />
        {fiscalData.organizationType === 'pessoa_juridica' && (
          <>
            <Field label="Razão social" value={fiscalData.legalName} />
            <Field label="Nome fantasia" value={fiscalData.tradeName} />
            <Field label="Situação" value={fiscalData.taxStatus} />
            <Field
              label="Município / UF"
              value={
                fiscalData.city || fiscalData.state
                  ? [fiscalData.city, fiscalData.state].filter(Boolean).join(' / ')
                  : null
              }
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
