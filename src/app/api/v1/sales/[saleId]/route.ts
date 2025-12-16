import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'


const updateSaleSchema = z.object({
  totalAmount: z.number().optional(),
  profit: z.number().optional(),
  discount: z.number().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  notes: z.string().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId
  const userId = access.userId
  const { saleId } = await params

  try {
    const body = await req.json()
    const validated = updateSaleSchema.parse(body)

    // Verify sale belongs to organization
    const existing = await prisma.sale.findFirst({
      where: {
        id: saleId,
        organizationId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
    }

    // Track status change
    const statusChangedAt = validated.status && validated.status !== existing.status
      ? new Date()
      : existing.statusChangedAt

    const updated = await prisma.sale.update({
      where: { id: saleId },
      data: {
        totalAmount: validated.totalAmount,
        profit: validated.profit,
        discount: validated.discount,
        status: validated.status,
        notes: validated.notes,
        updatedBy: userId,
        statusChangedAt,
      },
      include: {
        items: true,
      },
    })

    // Revalidar cache do dashboard após atualizar venda
    revalidateTag('dashboard-summary', 'max')
    revalidateTag(`org-${organizationId}`, 'max')

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[api/sales/[saleId]] PUT error:', error)
    return NextResponse.json(
      { error: 'Falha ao atualizar venda', details: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId
  const { saleId } = await params

  try {
    // Verify sale belongs to organization
    const existing = await prisma.sale.findFirst({
      where: {
        id: saleId,
        organizationId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
    }

    // Delete sale and associated items (cascade)
    await prisma.sale.delete({
      where: { id: saleId },
    })

    // Revalidar cache do dashboard após deletar venda
    revalidateTag('dashboard-summary', 'max')
    revalidateTag(`org-${organizationId}`, 'max')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/sales/[saleId]] DELETE error:', error)
    return NextResponse.json(
      { error: 'Falha ao deletar venda', details: String(error) },
      { status: 500 }
    )
  }
}
