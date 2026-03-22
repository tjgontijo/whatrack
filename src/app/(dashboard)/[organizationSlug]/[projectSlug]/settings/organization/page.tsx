import { HeaderPageShell, RefreshButton } from '@/components/dashboard/layout'
import { OrganizationFiscalDataSection } from '@/components/dashboard/settings/organization-fiscal-data-section'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'
import { getOrganizationCompany } from '@/services/company/company.service'
import { getOrganizationMe } from '@/services/organizations/organization.service'

type OrganizationSettingsPageProps = {
  params: Promise<{ organizationSlug: string }>
}

export default async function OrganizationSettingsPage({
  params,
}: OrganizationSettingsPageProps) {
  const { organizationSlug } = await params
  const access = await requireWorkspacePageAccess({
    permissions: 'manage:organization',
    organizationSlug,
  })

  const organizationResult = await getOrganizationMe({
    organizationId: access.organizationId,
    memberId: access.memberId,
    role: access.role,
  })

  if ('error' in organizationResult) {
    throw new Error(organizationResult.error)
  }

  const companyRaw =
    organizationResult.organizationType === 'pessoa_juridica'
      ? await getOrganizationCompany(access.organizationId)
      : null
  const company =
    companyRaw
      ? {
          cnpj: companyRaw.cnpj,
          razaoSocial: companyRaw.razaoSocial,
          nomeFantasia: companyRaw.nomeFantasia,
          cnaeCode: companyRaw.cnaeCode,
          cnaeDescription: companyRaw.cnaeDescription,
          municipio: companyRaw.municipio,
          uf: companyRaw.uf,
          tipo: companyRaw.tipo,
          porte: companyRaw.porte,
          naturezaJuridica: companyRaw.naturezaJuridica,
          capitalSocial: companyRaw.capitalSocial ? companyRaw.capitalSocial.toString() : null,
          situacao: companyRaw.situacao,
          dataAbertura: companyRaw.dataAbertura?.toISOString() ?? null,
          dataSituacao: companyRaw.dataSituacao?.toISOString() ?? null,
          simplesOptante: companyRaw.simplesOptante,
          simeiOptante: companyRaw.simeiOptante,
          logradouro: companyRaw.logradouro,
          numero: companyRaw.numero,
          complemento: companyRaw.complemento,
          bairro: companyRaw.bairro,
          cep: companyRaw.cep,
          email: companyRaw.email,
          telefone: companyRaw.telefone,
          qsa: Array.isArray(companyRaw.qsa)
            ? (companyRaw.qsa as Array<{ nome: string; qual: string }>)
            : [],
          atividadesSecundarias: Array.isArray(companyRaw.atividadesSecundarias)
            ? (companyRaw.atividadesSecundarias as Array<{ code: string; text: string }>)
            : [],
          authorizedAt: companyRaw.authorizedAt?.toISOString() ?? null,
          fetchedAt: companyRaw.fetchedAt?.toISOString() ?? null,
        }
      : null

  return (
    <HeaderPageShell
      title="Organização"
      refreshAction={<RefreshButton queryKey={['organization', access.organizationId, 'fiscal']} />}
    >
      <OrganizationFiscalDataSection
        organization={{
          name: organizationResult.name,
          organizationType: organizationResult.organizationType,
          documentType: organizationResult.documentType,
          documentNumber: organizationResult.documentNumber,
          legalName: organizationResult.legalName,
          tradeName: organizationResult.tradeName,
          taxStatus: organizationResult.taxStatus,
          city: organizationResult.city,
          state: organizationResult.state,
        }}
        company={company}
      />
    </HeaderPageShell>
  )
}
