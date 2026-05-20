import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { validateDocumentByType } from '@/lib/document/document-identity'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { enqueueCompanyEnrichment } from '@/server/queues/company-enrichment.queue'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

const fiscalDataSchema = z.object({
  documentType: z.enum(['cpf', 'cnpj']),
  documentNumber: z.string().min(1),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await params
  const access = await validatePermissionAccess(req, 'manage:organization')

  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }
  if (!access.userId) {
    return apiError('Acesso negado', 403)
  }

  if (access.organizationId !== organizationId) {
    return apiError('Acesso negado', 403)
  }

  try {
    const body = await req.json().catch(() => null)
    const data = fiscalDataSchema.parse(body)

    const normalizedDocument = data.documentNumber.replace(/\D/g, '')
    if (!validateDocumentByType(data.documentType, normalizedDocument)) {
      return apiError(`${data.documentType.toUpperCase()} inválido`, 400)
    }

    if (data.documentType === 'cpf') {
      await prisma.organizationProfile.upsert({
        where: { organizationId },
        update: { cpf: normalizedDocument },
        create: { organizationId, cpf: normalizedDocument },
      })
      return apiSuccess({ success: true, mode: 'sync' }, 200)
    } else {
      const existingByCnpj = await prisma.organizationCompany.findUnique({
        where: { cnpj: normalizedDocument },
        select: { organizationId: true },
      })
      if (existingByCnpj && existingByCnpj.organizationId !== organizationId) {
        return apiError('Este CNPJ já está vinculado a outra organização', 409)
      }

      await enqueueCompanyEnrichment({
        organizationId,
        userId: access.userId,
        cnpj: normalizedDocument,
      })
      return apiSuccess({ success: true, mode: 'async', queued: true }, 202)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Dados inválidos', 400, undefined, { details: error.flatten() })
    }
    logger.error({ err: error, organizationId }, '[api/organization/fiscal-data] PATCH error')
    return apiError('Falha ao salvar dados fiscais', 500, error)
  }
}
