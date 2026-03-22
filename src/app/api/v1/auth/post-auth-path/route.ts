import { NextRequest, NextResponse } from 'next/server'

import { readFunnelIntent } from '@/lib/funnel/funnel-intent'
import { getServerSession } from '@/server/auth/server-session'
import { resolvePostSignInPath } from '@/server/navigation/resolve-post-auth-path'

export async function GET(request: NextRequest) {
  const session = await getServerSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const path = await resolvePostSignInPath({
    userId: session.user.id,
    nextParam: request.nextUrl.searchParams.get('next'),
    intent: readFunnelIntent(request.nextUrl.searchParams),
  })

  return NextResponse.json({ path })
}
