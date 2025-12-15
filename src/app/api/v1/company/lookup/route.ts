import { NextRequest, NextResponse } from 'next/server'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'
import { fetchCnpjData, ReceitaWsError } from '@/services/company/receitaws'
import { lookupCnpjSchema } from '../schemas'

/**
 * GET /api/v1/company/lookup
 *
 * Busca dados de empresa pelo CNPJ na API ReceitaWS
 * Query params: cnpj (obrigatório)
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
    const searchParams = request.nextUrl.searchParams
    const cnpj = searchParams.get('cnpj')

    // Validação
    const parsed = lookupCnpjSchema.safeParse({ cnpj })
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'CNPJ inválido',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    // Busca dados na ReceitaWS
    const companyData = await fetchCnpjData(parsed.data.cnpj)

    return NextResponse.json(companyData)
  } catch (error) {
    console.error('[api/v1/company/lookup] GET error:', error)

    if (error instanceof ReceitaWsError) {
      const statusMap: Record<string, number> = {
        INVALID_CNPJ: 400,
        NOT_FOUND: 404,
        RATE_LIMIT: 429,
        NETWORK_ERROR: 503,
        API_ERROR: 502,
      }

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusMap[error.code] || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao buscar dados do CNPJ' },
      { status: 500 }
    )
  }
}
