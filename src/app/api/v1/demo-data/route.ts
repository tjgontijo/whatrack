import { NextResponse } from 'next/server'
import { generateDemoData, clearDemoData } from '@/features/account/services/demo-data.service'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function POST(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const body = await request.json()
    const { projectId, count } = body

    if (!projectId) return apiError('projectId é obrigatório', 400)

    const result = await generateDemoData({
      organizationId: access.organizationId,
      projectId,
      count: count ? Number(count) : 10,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ err: error }, '[api/demo-data] POST error')
    const msg = error instanceof Error ? error.message : 'Erro ao gerar dados de demonstração'
    return apiError(msg, 500, error)
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) return apiError('projectId é obrigatório', 400)

    const result = await clearDemoData({
      organizationId: access.organizationId,
      projectId,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ err: error }, '[api/demo-data] DELETE error')
    return apiError('Erro ao limpar dados de demonstração', 500, error)
  }
}
