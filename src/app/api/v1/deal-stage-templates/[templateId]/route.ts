import { type NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { prisma } from '@/lib/db/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const access = await validatePermissionAccess(req, 'manage:deals')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const { templateId } = await params
    const template = await prisma.dealStageTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) return apiError('Template não encontrado', 404)
    if (!template.isPersonal) return apiError('Só templates pessoais podem ser deletados', 403)
    if (template.organizationId !== access.organizationId) return apiError('Acesso negado', 403)

    await prisma.dealStageTemplate.delete({ where: { id: templateId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, '[deal-stage-templates/[templateId]] DELETE error')
    return apiError('Falha ao deletar template', 500, error)
  }
}
