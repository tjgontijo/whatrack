import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

const fiscalDataSchema = z.object({
  documentType: z.enum(['cpf', 'cnpj']),
  documentNumber: z.string().min(1),
  companyName: z.string().optional(),
  companyFantasyName: z.string().optional(),
  municipality: z.string().optional(),
  state: z.string().optional(),
})

type FiscalDataInput = z.infer<typeof fiscalDataSchema>

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await params
  const access = await validatePermissionAccess(req, 'manage:organization')

  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  if (access.organizationId !== organizationId) {
    return apiError('Acesso negado', 403)
  }

  try {
    const body = await req.json().catch(() => null)
    const data = fiscalDataSchema.parse(body)

    if (data.documentType === 'cpf') {
      await prisma.organizationProfile.upsert({
        where: { organizationId },
        update: { cpf: data.documentNumber },
        create: { organizationId, cpf: data.documentNumber },
      })
    } else {
      await prisma.organizationCompany.upsert({
        where: { organizationId },
        update: {
          cnpj: data.documentNumber,
          name: data.companyName,
          fantasyName: data.companyFantasyName,
          municipality: data.municipality,
          state: data.state,
        },
        create: {
          organizationId,
          cnpj: data.documentNumber,
          name: data.companyName,
          fantasyName: data.companyFantasyName,
          municipality: data.municipality,
          state: data.state,
        },
      })
    }

    return apiSuccess({ success: true }, 200)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Dados inválidos', 400, undefined, { details: error.flatten() })
    }
    logger.error({ err: error, organizationId }, '[api/organization/fiscal-data] PATCH error')
    return apiError('Falha ao salvar dados fiscais', 500, error)
  }
}
