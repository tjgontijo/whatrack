import { prisma } from '@/lib/db/prisma'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { NextRequest, NextResponse } from 'next/server'

interface MigrateRequest {
  destinationStageId: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  try {
    const { stageId } = await params
    const access = await validatePermissionAccess(req, 'manage:deals')
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const body = (await req.json()) as MigrateRequest
    const { destinationStageId } = body

    if (!destinationStageId) {
      return NextResponse.json({ error: 'destinationStageId required' }, { status: 400 })
    }

    const sourceStage = await prisma.dealStage.findUnique({
      where: { id: stageId },
    })

    if (!sourceStage) {
      return apiError('Stage não encontrado', 404)
    }

    const destinationStage = await prisma.dealStage.findUnique({
      where: { id: destinationStageId },
    })

    if (!destinationStage) {
      return apiError('Stage de destino não encontrado', 404)
    }

    const dealsCount = await prisma.deal.count({
      where: { stageId },
    })

    if (dealsCount === 0) {
      return NextResponse.json({ message: 'Nenhuma negociação para migrar' })
    }

    // Migrate deals
    await prisma.deal.updateMany({
      where: { stageId },
      data: { stageId: destinationStageId },
    })

    logger.info({ sourceStageId: stageId, destinationStageId, count: dealsCount }, '[deal-stages/migrate] Success')

    return NextResponse.json({
      success: true,
      migratedCount: dealsCount,
      message: `${dealsCount} negociação(ões) movida(s)`,
    })
  } catch (error) {
    logger.error({ err: error }, '[deal-stages/migrate] Error')
    return apiError(error instanceof Error ? error.message : 'Erro ao migrar negociações', 500)
  }
}
