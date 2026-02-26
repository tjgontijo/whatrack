import { NextRequest, NextResponse } from 'next/server'

import { saveCompanySchema } from '@/schemas/company/company-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import {
  getOrganizationCompany,
  saveOrganizationCompany,
} from '@/services/company/company.service'

export async function GET(request: NextRequest) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const company = await getOrganizationCompany(access.organizationId)

    if (!company) {
      return NextResponse.json({ error: 'Dados da empresa não encontrados' }, { status: 404 })
    }

    return NextResponse.json(company)
  } catch (error) {
    console.error('[api/v1/company] GET error:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados da empresa' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId || !access.userId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const parsed = saveCompanySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const result = await saveOrganizationCompany({
      organizationId: access.organizationId,
      userId: access.userId,
      input: parsed.data,
    })

    return NextResponse.json(result.data, { status: result.status })
  } catch (error) {
    console.error('[api/v1/company] POST error:', error)

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Este CNPJ já está vinculado a outra organização' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Erro ao salvar dados da empresa' }, { status: 500 })
  }
}
