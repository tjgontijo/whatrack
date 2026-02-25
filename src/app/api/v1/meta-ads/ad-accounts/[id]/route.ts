import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { metaAdAccountService } from '@/services/meta-ads/ad-account.service'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await validatePermissionAccess(req, 'manage:integrations')
  const { id } = await params

  if (!access.hasAccess || !access.teamId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { isActive } = body

  const account = await prisma.metaAdAccount.findFirst({
    where: {
      id,
      organizationId: access.teamId,
    },
    select: { id: true },
  })

  if (!account) {
    return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  let updated: any

  if (typeof isActive === 'boolean') {
    updated = await metaAdAccountService.toggleAccount(account.id, isActive)
  }

  return NextResponse.json(updated || {})
}
