import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth/auth'
import { metaCampaignsService } from '@/services/meta-ads/campaigns.service'

async function getSessionFromRequest(req: NextRequest) {
  const headers = new Headers(req.headers)
  if (!headers.get('cookie')) {
    const cookieStore = await cookies()
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ')
    if (cookieHeader) headers.set('cookie', cookieHeader)
  }
  return auth.api.getSession({ headers })
}

const campaignsQuerySchema = z.object({
  organizationId: z.string().min(1),
  accountId: z.string().optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
})

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const parsed = campaignsQuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { organizationId, accountId, days } = parsed.data

  try {
    const campaigns = await metaCampaignsService.getCampaigns(organizationId, { days, accountId })
    return NextResponse.json(campaigns)
  } catch (error: any) {
    console.error('[Meta Campaigns API]', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', details: error.message },
      { status: 500 }
    )
  }
}
