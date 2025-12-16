import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { syncTemplates } from '@/services/campaigns'

export async function POST(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 }
    )
  }

  try {
    const result = await syncTemplates(access.organizationId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/campaigns/templates/sync] POST error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao sincronizar templates' },
      { status: 400 }
    )
  }
}
