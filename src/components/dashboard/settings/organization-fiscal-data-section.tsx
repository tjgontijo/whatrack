import { Alert, AlertDescription } from '@/components/ui/alert'
import { applyCpfCnpjMask } from '@/lib/mask/cpf-cnpj'

import { SettingsGroup } from './settings-group'
import { SettingsRow } from './settings-row'

type OrganizationFiscalSummary = {
  name: string
  organizationType: 'pessoa_fisica' | 'pessoa_juridica' | null
  documentType: 'cpf' | 'cnpj' | null
  documentNumber: string | null
  legalName: string | null
  tradeName: string | null
  taxStatus: string | null
  city: string | null
  state: string | null
}

type OrganizationCompanyDetails = {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string | null
  cnaeCode: string
  cnaeDescription: string
  municipio: string
  uf: string
  tipo: string | null
  porte: string | null
  naturezaJuridica: string | null
  capitalSocial: string | null
  situacao: string | null
  dataAbertura: string | null
  dataSituacao: string | null
  simplesOptante: boolean
  simeiOptante: boolean
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cep: string | null
  email: string | null
  telefone: string | null
  qsa: Array<{ nome: string; qual: string }>
  atividadesSecundarias: Array<{ code: string; text: string }>
  authorizedAt: string | null
  fetchedAt: string | null
}

type OrganizationFiscalDataSectionProps = {
  organization: OrganizationFiscalSummary
  company: OrganizationCompanyDetails | null
}

function getOrganizationTypeLabel(value: OrganizationFiscalSummary['organizationType']) {
  if (value === 'pessoa_fisica') return 'Pessoa Física'
  if (value === 'pessoa_juridica') return 'Pessoa Jurídica'
  return 'Não definido'
}

function formatValue(value: string | null | undefined) {
  return value?.trim() || 'Não informado'
}

function formatDate(value: string | null) {
  if (!value) return 'Não informado'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Não informado'

  return parsed.toLocaleDateString('pt-BR')
}

function formatCurrency(value: string | null) {
  if (!value) return 'Não informado'

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'Não informado'

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numeric)
}

function formatDocument(input: {
  documentNumber: string | null
  documentType: 'cpf' | 'cnpj' | null
}) {
  if (!input.documentNumber || !input.documentType) return 'Não informado'
  return applyCpfCnpjMask(input.documentNumber, input.documentType)
}

function formatLocation(city: string | null | undefined, state: string | null | undefined) {
  const value = [city?.trim(), state?.trim()].filter(Boolean).join(' / ')
  return value || 'Não informado'
}

function formatAddress(company: OrganizationCompanyDetails | null) {
  if (!company) return 'Não informado'

  const value = [
    company.logradouro,
    company.numero,
    company.complemento,
    company.bairro,
    company.cep,
  ]
    .map((entry) => entry?.trim())
    .filter(Boolean)
    .join(', ')

  return value || 'Não informado'
}

function formatRegime(value: boolean) {
  return value ? 'Sim' : 'Não'
}

export function OrganizationFiscalDataSection({
  organization,
  company,
}: OrganizationFiscalDataSectionProps) {
  const hasFiscalIdentity = !!organization.organizationType && !!organization.documentNumber
  const isCompany = organization.organizationType === 'pessoa_juridica'

  return (
    <SettingsGroup
      label="Dados fiscais"
      description="Aqui mostramos o cadastro fiscal consolidado da organização, incluindo os dados coletados no welcome."
    >
      {!hasFiscalIdentity ? (
        <div className="py-4">
          <Alert>
            <AlertDescription>
              Nenhum dado fiscal foi encontrado para esta organização.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      <SettingsRow label="Nome da organização" description="Nome operacional usado no workspace.">
        <p className="font-medium">{formatValue(organization.name)}</p>
      </SettingsRow>

      <SettingsRow label="Tipo cadastral" description="Tipo fiscal atualmente salvo na organização.">
        <p className="font-medium">{getOrganizationTypeLabel(organization.organizationType)}</p>
      </SettingsRow>

      <SettingsRow
        label={
          organization.documentType === 'cnpj'
            ? 'CNPJ'
            : organization.documentType === 'cpf'
              ? 'CPF'
              : 'Documento fiscal'
        }
        description="Documento fiscal principal vinculado a esta organização."
      >
        <p className="font-medium">
          {formatDocument({
            documentNumber: organization.documentNumber,
            documentType: organization.documentType,
          })}
        </p>
      </SettingsRow>

      {isCompany ? (
        <>
          <SettingsRow label="Razão social" description="Nome jurídico oficial da empresa.">
            <p className="font-medium">{formatValue(company?.razaoSocial ?? organization.legalName)}</p>
          </SettingsRow>

          <SettingsRow label="Nome fantasia" description="Nome comercial usado publicamente.">
            <p className="font-medium">{formatValue(company?.nomeFantasia ?? organization.tradeName)}</p>
          </SettingsRow>

          <SettingsRow label="Situação" description="Situação fiscal atual da empresa.">
            <p className="font-medium">{formatValue(company?.situacao ?? organization.taxStatus)}</p>
          </SettingsRow>

          <SettingsRow label="Tipo / Porte" description="Classificação societária e porte atuais.">
            <p className="font-medium">
              {formatValue([company?.tipo, company?.porte].filter(Boolean).join(' / ') || null)}
            </p>
          </SettingsRow>

          <SettingsRow label="Natureza jurídica" description="Natureza jurídica informada na consulta.">
            <p className="font-medium">{formatValue(company?.naturezaJuridica)}</p>
          </SettingsRow>

          <SettingsRow label="Capital social" description="Capital social registrado.">
            <p className="font-medium">{formatCurrency(company?.capitalSocial ?? null)}</p>
          </SettingsRow>

          <SettingsRow label="Localização" description="Cidade e UF da base fiscal.">
            <p className="font-medium">
              {formatLocation(company?.municipio ?? organization.city, company?.uf ?? organization.state)}
            </p>
          </SettingsRow>

          <SettingsRow label="Endereço" description="Endereço principal disponível na base fiscal.">
            <p className="font-medium">{formatAddress(company)}</p>
          </SettingsRow>

          <SettingsRow label="Contato" description="Contato da empresa, quando disponível.">
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Email:</span> {formatValue(company?.email)}
              </p>
              <p>
                <span className="font-medium">Telefone:</span> {formatValue(company?.telefone)}
              </p>
            </div>
          </SettingsRow>

          <SettingsRow label="Datas fiscais" description="Marcos relevantes retornados na consulta.">
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Abertura:</span> {formatDate(company?.dataAbertura ?? null)}
              </p>
              <p>
                <span className="font-medium">Situação:</span> {formatDate(company?.dataSituacao ?? null)}
              </p>
            </div>
          </SettingsRow>

          <SettingsRow label="Regimes" description="Sinalizações fiscais complementares.">
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Simples Nacional:</span> {formatRegime(company?.simplesOptante ?? false)}
              </p>
              <p>
                <span className="font-medium">SIMEI:</span> {formatRegime(company?.simeiOptante ?? false)}
              </p>
            </div>
          </SettingsRow>

          <SettingsRow label="Atividade principal" description="CNAE principal disponível no cadastro.">
            <p className="text-sm">
              {company?.cnaeCode || company?.cnaeDescription ? (
                <>
                  <span className="font-medium">{formatValue(company?.cnaeCode)}</span>
                  {' - '}
                  {formatValue(company?.cnaeDescription)}
                </>
              ) : (
                'Não informado'
              )}
            </p>
          </SettingsRow>

          <SettingsRow label="Atividades secundárias" description="CNAEs secundários retornados na consulta.">
            {company && company.atividadesSecundarias.length > 0 ? (
              <div className="space-y-2 text-sm">
                {company.atividadesSecundarias.map((activity) => (
                  <div key={`${activity.code}:${activity.text}`} className="rounded-lg border border-border/70 p-3">
                    <p className="font-medium">{activity.code}</p>
                    <p className="text-muted-foreground mt-1">{activity.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-medium">Não informado</p>
            )}
          </SettingsRow>

          <SettingsRow label="Quadro societário" description="Sócios e qualificações disponíveis.">
            {company && company.qsa.length > 0 ? (
              <div className="space-y-2 text-sm">
                {company.qsa.map((member) => (
                  <div
                    key={`${member.nome}:${member.qual}`}
                    className="flex items-center justify-between rounded-lg border border-border/70 p-3"
                  >
                    <span className="font-medium">{member.nome}</span>
                    <span className="text-muted-foreground">{member.qual}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-medium">Não informado</p>
            )}
          </SettingsRow>

          <SettingsRow label="Origem dos dados" description="Quando a organização autorizou e buscou os dados da PJ.">
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Autorizado em:</span> {formatDate(company?.authorizedAt ?? null)}
              </p>
              <p>
                <span className="font-medium">Consultado em:</span> {formatDate(company?.fetchedAt ?? null)}
              </p>
            </div>
          </SettingsRow>
        </>
      ) : null}
    </SettingsGroup>
  )
}
