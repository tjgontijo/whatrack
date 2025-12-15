import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'
import { getCreditsWithBalance } from '@/services/campaigns'

export async function GET(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 }
    )
  }

  try {
    const credits = await getCreditsWithBalance(access.organizationId)
    return NextResponse.json({
      balance: credits.balance,
      updatedAt: credits.updatedAt,
    })
  } catch (error) {
    console.error('[api/campaigns/credits] GET error', error)
    return NextResponse.json(
      { error: 'Erro ao buscar créditos' },
      { status: 500 }
    )
  }
}
