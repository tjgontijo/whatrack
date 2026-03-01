import { NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const config = await MetaCloudService.getConfig(access.organizationId)

    if (!config || !config.wabaId) {
      return apiError('WhatsApp not configured for this organization', 404)
    }

    const templates = await MetaCloudService.getTemplates({
      wabaId: config.wabaId,
      accessToken: config.accessToken ?? undefined,
    })

    return NextResponse.json({ templates })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch templates'
    logger.error({ err: error }, '[API] Get Templates Error')
    return apiError(message, 500, error)
  }
}

export async function POST(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const body = await request.json()
    const config = await MetaCloudService.getConfig(access.organizationId)

    if (!config || !config.wabaId) {
      return apiError('WhatsApp not configured for this organization', 404)
    }

    const result = await MetaCloudService.createTemplate({
      wabaId: config.wabaId,
      template: body,
      accessToken: config.accessToken ?? undefined,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create template'
    logger.error({ err: error }, '[API] Create Template Error')
    return apiError(message, 500, error)
  }
}

export async function PUT(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const body = await request.json()
    const { templateId, components } = body

    if (!templateId) {
      return apiError('Template ID is required', 400)
    }

    if (!components || !Array.isArray(components)) {
      return apiError('Components array is required', 400)
    }

    const config = await MetaCloudService.getConfig(access.organizationId)

    if (!config || !config.wabaId) {
      return apiError('WhatsApp not configured for this organization', 404)
    }

    const result = await MetaCloudService.editTemplate({
      templateId,
      components,
      accessToken: config.accessToken ?? undefined,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to edit template'
    logger.error({ err: error }, '[API] Edit Template Error')
    return apiError(message, 500, error)
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')

    if (!name) {
      return apiError('Template name is required', 400)
    }

    const config = await MetaCloudService.getConfig(access.organizationId)

    if (!config || !config.wabaId) {
      return apiError('WhatsApp not configured for this organization', 404)
    }

    const result = await MetaCloudService.deleteTemplate({
      wabaId: config.wabaId,
      name,
      accessToken: config.accessToken ?? undefined,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete template'
    logger.error({ err: error }, '[API] Delete Template Error')
    return apiError(message, 500, error)
  }
}
