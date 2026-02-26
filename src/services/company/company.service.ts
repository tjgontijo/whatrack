import { prisma } from '@/lib/db/prisma'
import { stripCnpj } from '@/lib/mask/cnpj'
import type { SaveCompanyInput } from '@/schemas/company/company-schemas'

function buildCompanyPayload(input: SaveCompanyInput, userId: string) {
  return {
    cnpj: stripCnpj(input.cnpj),
    razaoSocial: input.razaoSocial,
    nomeFantasia: input.nomeFantasia,
    cnaeCode: input.cnaeCode,
    cnaeDescription: input.cnaeDescription,
    municipio: input.municipio,
    uf: input.uf,
    tipo: input.tipo,
    porte: input.porte,
    naturezaJuridica: input.naturezaJuridica,
    capitalSocial: input.capitalSocial,
    situacao: input.situacao,
    dataAbertura: input.dataAbertura,
    dataSituacao: input.dataSituacao,
    simplesOptante: input.simplesOptante ?? false,
    simeiOptante: input.simeiOptante ?? false,
    logradouro: input.logradouro,
    numero: input.numero,
    complemento: input.complemento,
    bairro: input.bairro,
    cep: input.cep,
    email: input.email || null,
    telefone: input.telefone,
    qsa: input.qsa,
    atividadesSecundarias: input.atividadesSecundarias,
    authorizedByUserId: userId,
    authorizedAt: new Date(),
    fetchedAt: new Date(),
  }
}

export async function getOrganizationCompany(organizationId: string) {
  return prisma.organizationCompany.findUnique({
    where: { organizationId },
  })
}

interface SaveOrganizationCompanyParams {
  organizationId: string
  userId: string
  input: SaveCompanyInput
}

export async function saveOrganizationCompany(params: SaveOrganizationCompanyParams) {
  const payload = buildCompanyPayload(params.input, params.userId)

  const existing = await prisma.organizationCompany.findUnique({
    where: { organizationId: params.organizationId },
    select: { organizationId: true },
  })

  if (existing) {
    const updated = await prisma.organizationCompany.update({
      where: { organizationId: params.organizationId },
      data: payload,
    })

    return { data: updated, status: 200 as const }
  }

  const created = await prisma.organizationCompany.create({
    data: {
      organizationId: params.organizationId,
      ...payload,
    },
  })

  return { data: created, status: 201 as const }
}
