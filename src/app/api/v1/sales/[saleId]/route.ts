import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { revalidateTag } from 'next/cache'

import { updateSaleSchema } from '@/schemas/sales/sale-schemas'
import { deleteSale, updateSale } from '@/services/sales/sale.service'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ saleId: string }> }) {
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
    const updated = await updateSale({
      organizationId,
      saleId,
      userId,
      input: validated,
    })
    if (!updated) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
    }

    revalidateTag('dashboard-summary', 'max')
    revalidateTag(`org-${organizationId}`, 'max')

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[api/sales/[saleId]] PUT error:', error)
    return apiError('Falha ao atualizar venda', 500, error)
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
    const deleted = await deleteSale({
      organizationId,
      saleId,
    })
    if (!deleted) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
    }

    revalidateTag('dashboard-summary', 'max')
    revalidateTag(`org-${organizationId}`, 'max')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/sales/[saleId]] DELETE error:', error)
    return apiError('Falha ao deletar venda', 500, error)
  }
}
