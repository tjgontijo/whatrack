import { NextResponse } from 'next/server'
import { listTemplatesService } from '@/features/deal-stage-templates/services/list-templates.service'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { getServerSession } from '@/server/auth/server-session'

export async function GET() {
  const session = await getServerSession()
  if (!session) {
    return apiError('Não autorizado', 401)
  }

  try {
    const result = await listTemplatesService()
    return NextResponse.json(result.data)
  } catch (error) {
    logger.error({ err: error }, '[deal-stage-templates] GET error')
    return apiError('Falha ao buscar templates', 500, error)
  }
}
