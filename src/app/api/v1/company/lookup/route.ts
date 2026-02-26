import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { lookupCnpjSchema } from '@/schemas/company/company-schemas'
import { fetchCnpjData, ReceitaWsError } from '@/services/company/receitaws'
import { getOrSyncUser } from '@/server/auth/server'

export async function GET(request: NextRequest) {
  const user = await getOrSyncUser(request)
  if (!user) {
    return apiError('Unauthorized', 401)
  }

  try {
    const cnpj = request.nextUrl.searchParams.get('cnpj')

    const parsed = lookupCnpjSchema.safeParse({ cnpj })
    if (!parsed.success) {
      return apiError('CNPJ inválido', 400, undefined, { details: parsed.error.flatten() })
    }

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

      return apiError(
        error.message,
        statusMap[error.code] || 500,
        undefined,
        { code: error.code }
      )
    }

    return apiError('Erro ao buscar dados do CNPJ', 500, error)
  }
}
