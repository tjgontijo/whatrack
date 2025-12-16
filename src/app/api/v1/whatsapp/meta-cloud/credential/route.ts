import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { prisma } from '@/lib/prisma'

const saveCredentialSchema = z.object({
  phoneNumberId: z.string().min(1, 'Phone Number ID é obrigatório'),
  wabaId: z.string().min(1, 'WABA ID é obrigatório'),
  accessToken: z.string().optional(),
  phoneNumber: z.string().optional(),
})

/**
 * GET /api/v1/whatsapp/meta-cloud/credential
 * Returns Meta Cloud credential for the organization
 */
export async function GET(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const credential = await prisma.metaWhatsAppCredential.findUnique({
      where: { organizationId: access.organizationId },
      select: {
        id: true,
        phoneNumberId: true,
        wabaId: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(credential)
  } catch (error) {
    console.error('[api/v1/whatsapp/meta-cloud/credential] GET error', error)
    return NextResponse.json({ error: 'Falha ao carregar credencial' }, { status: 500 })
  }
}

/**
 * POST /api/v1/whatsapp/meta-cloud/credential
 * Creates or updates Meta Cloud credential for the organization
 */
export async function POST(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = saveCredentialSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Dados inválidos',
        details: parsed.error.flatten(),
      }, { status: 400 })
    }

    const { phoneNumberId, wabaId, accessToken, phoneNumber } = parsed.data

    // Check if credential already exists
    const existingCredential = await prisma.metaWhatsAppCredential.findUnique({
      where: { organizationId: access.organizationId },
    })

    let credential

    if (existingCredential) {
      // Update existing credential
      const updateData: Record<string, unknown> = {
        phoneNumberId,
        wabaId,
        phoneNumber: phoneNumber || existingCredential.phoneNumber,
      }

      // Only update accessToken if provided
      if (accessToken) {
        updateData.accessToken = accessToken
      }

      credential = await prisma.metaWhatsAppCredential.update({
        where: { id: existingCredential.id },
        data: updateData,
        select: {
          id: true,
          phoneNumberId: true,
          wabaId: true,
          phoneNumber: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    } else {
      // Create new credential
      if (!accessToken) {
        return NextResponse.json({
          error: 'Access Token é obrigatório para criar credencial',
        }, { status: 400 })
      }

      credential = await prisma.metaWhatsAppCredential.create({
        data: {
          organizationId: access.organizationId,
          phoneNumberId,
          wabaId,
          accessToken,
          phoneNumber: phoneNumber || '',
        },
        select: {
          id: true,
          phoneNumberId: true,
          wabaId: true,
          phoneNumber: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    }

    return NextResponse.json(credential)
  } catch (error) {
    console.error('[api/v1/whatsapp/meta-cloud/credential] POST error', error)
    return NextResponse.json({ error: 'Falha ao salvar credencial' }, { status: 500 })
  }
}
