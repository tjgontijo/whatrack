import { NextRequest, NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { prisma } from '@/lib/prisma'
import { stripCnpj } from '@/lib/mask/cnpj'
import { saveCompanySchema } from './schemas'

/**
 * GET /api/v1/company
 *
 * Retorna dados da empresa vinculada à organização do usuário
 */
export async function GET(request: NextRequest) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 }
    )
  }

  try {
    const company = await prisma.organizationCompany.findUnique({
      where: { organizationId: access.organizationId },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Dados da empresa não encontrados' },
        { status: 404 }
      )
    }

    return NextResponse.json(company)
  } catch (error) {
    console.error('[api/v1/company] GET error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados da empresa' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/company
 *
 * Salva dados da empresa vinculada à organização do usuário
 * Requer checkbox de autorização (authorized: true)
 */
export async function POST(request: NextRequest) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId || !access.userId) {
    return NextResponse.json(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()

    // Validação
    const parsed = saveCompanySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const data = parsed.data
    const cleanCnpj = stripCnpj(data.cnpj)

    // Verifica se já existe empresa para esta organização
    const existing = await prisma.organizationCompany.findUnique({
      where: { organizationId: access.organizationId },
    })

    if (existing) {
      // Atualiza empresa existente
      const updated = await prisma.organizationCompany.update({
        where: { organizationId: access.organizationId },
        data: {
          cnpj: cleanCnpj,
          razaoSocial: data.razaoSocial,
          nomeFantasia: data.nomeFantasia,
          cnaeCode: data.cnaeCode,
          cnaeDescription: data.cnaeDescription,
          municipio: data.municipio,
          uf: data.uf,
          tipo: data.tipo,
          porte: data.porte,
          naturezaJuridica: data.naturezaJuridica,
          capitalSocial: data.capitalSocial,
          situacao: data.situacao,
          dataAbertura: data.dataAbertura,
          dataSituacao: data.dataSituacao,
          simplesOptante: data.simplesOptante ?? false,
          simeiOptante: data.simeiOptante ?? false,
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cep: data.cep,
          email: data.email || null,
          telefone: data.telefone,
          qsa: data.qsa,
          atividadesSecundarias: data.atividadesSecundarias,
          authorizedByUserId: access.userId,
          authorizedAt: new Date(),
          fetchedAt: new Date(),
        },
      })

      return NextResponse.json(updated, { status: 200 })
    }

    // Cria nova empresa
    const company = await prisma.organizationCompany.create({
      data: {
        organizationId: access.organizationId,
        cnpj: cleanCnpj,
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        cnaeCode: data.cnaeCode,
        cnaeDescription: data.cnaeDescription,
        municipio: data.municipio,
        uf: data.uf,
        tipo: data.tipo,
        porte: data.porte,
        naturezaJuridica: data.naturezaJuridica,
        capitalSocial: data.capitalSocial,
        situacao: data.situacao,
        dataAbertura: data.dataAbertura,
        dataSituacao: data.dataSituacao,
        simplesOptante: data.simplesOptante ?? false,
        simeiOptante: data.simeiOptante ?? false,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cep: data.cep,
        email: data.email || null,
        telefone: data.telefone,
        qsa: data.qsa,
        atividadesSecundarias: data.atividadesSecundarias,
        authorizedByUserId: access.userId,
        authorizedAt: new Date(),
        fetchedAt: new Date(),
      },
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error('[api/v1/company] POST error:', error)

    // Erro de constraint única (CNPJ já existe em outra org)
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'Este CNPJ já está vinculado a outra organização' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao salvar dados da empresa' },
      { status: 500 }
    )
  }
}
