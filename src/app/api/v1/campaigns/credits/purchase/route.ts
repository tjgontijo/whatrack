import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { addCredits } from '@/services/campaigns'

const schema = z.object({
  amount: z.number().positive(),
  description: z.string().optional(),
})

export async function POST(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const amountCents = Math.round(parsed.data.amount * 100)
    await addCredits({
      organizationId: access.organizationId,
      amountCents,
      description: parsed.data.description ?? 'Compra de créditos',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/campaigns/credits/purchase] POST error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao comprar créditos' },
      { status: 400 }
    )
  }
}
