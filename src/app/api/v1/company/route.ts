import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { saveCompanySchema } from '@/schemas/company/company-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import {
  getOrganizationCompany,
  saveOrganizationCompany,
} from '@/services/company/company.service'

export async function GET(request: NextRequest) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const company = await getOrganizationCompany(access.organizationId)

    if (!company) {
      return apiError('Dados da empresa não encontrados', 404)
    }

    return NextResponse.json(company)
  } catch (error) {
    console.error('[api/v1/company] GET error:', error)
    return apiError('Erro ao buscar dados da empresa', 500, error)
  }
}

export async function POST(request: NextRequest) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId || !access.userId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const parsed = saveCompanySchema.safeParse(await request.json())
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
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
      return apiError('Este CNPJ já está vinculado a outra organização', 409, error)
    }

    return apiError('Erro ao salvar dados da empresa', 500, error)
  }
}
