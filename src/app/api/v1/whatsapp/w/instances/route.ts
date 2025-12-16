import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { createWuzapiInstance, listWuzapiInstances } from '@/services/whatsapp/wuzapi'
import { LimitService } from '@/services/billing'
import {
  createInstanceSchema,
  whatsappInstanceSchema,
  whatsappInstancesResponseSchema,
} from '@/schemas/whatsapp'

/**
 * GET /api/v1/whatsapp/w/instances
 * Lista todas as instâncias WuzAPI da organização
 */
export async function GET(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const items = await listWuzapiInstances(access.organizationId)
    const payload = whatsappInstancesResponseSchema.parse({ items })
    return NextResponse.json(payload)
  } catch (error) {
    console.error('[api/v1/whatsapp/w/instances] GET error', error)
    return NextResponse.json({ error: 'Falha ao carregar instâncias' }, { status: 500 })
  }
}

/**
 * POST /api/v1/whatsapp/w/instances
 * Cria uma nova instância WuzAPI
 */
export async function POST(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    // Verificar limite do plano
    const limitService = new LimitService()
    const limitCheck = await limitService.checkLimit(access.organizationId, 'whatsappInstances')

    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: limitCheck.message ?? 'Limite de instâncias WhatsApp atingido',
        code: 'LIMIT_EXCEEDED',
        current: limitCheck.current,
        limit: limitCheck.limit,
      }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createInstanceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Payload inválido',
        details: parsed.error.flatten()
      }, { status: 400 })
    }

    const record = await createWuzapiInstance({
      organizationId: access.organizationId,
      name: parsed.data.name,
      phone: parsed.data.phone,
    })

    // Transform Prisma result to match schema
    const payload = whatsappInstanceSchema.parse({
      id: record.id,
      instanceId: record.instanceId,
      label: record.label || record.instanceId,
      phone: record.phone,
      status: 'disconnected', // New instances start disconnected
      connected: false,
      loggedIn: false,
      qrcode: null,
      paircode: null,
      createdAt: record.createdAt?.toISOString() ?? null,
      updatedAt: record.updatedAt?.toISOString() ?? null,
    })
    return NextResponse.json(payload, { status: 201 })
  } catch (error) {
    console.error('[api/v1/whatsapp/w/instances] POST error', error)
    const message = error instanceof Error ? error.message : 'Falha desconhecida'
    return NextResponse.json({
      error: 'Falha ao criar instância',
      details: message
    }, { status: 500 })
  }
}
