import { NextRequest, NextResponse } from 'next/server'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { listMetaAdAccounts } from '@/services/meta-ads/meta-account-query.service'

export async function GET(req: NextRequest) {
  const access = await validateFullAccess(req)

  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error || 'Unauthorized' }, { status: 401 })
  }

  try {
    const sync = new URL(req.url).searchParams.get('sync') === 'true'
    const accounts = await listMetaAdAccounts({ organizationId: access.organizationId, sync })
    return NextResponse.json(accounts)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list ad accounts'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
