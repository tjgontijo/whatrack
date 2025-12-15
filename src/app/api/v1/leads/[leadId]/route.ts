import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'


const updateLeadSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  mail: z.string().email().optional().or(z.literal('')).nullable(),
  instagram: z.string().optional(),
  remoteJid: z.string().optional(),
  assignedTo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId
  const { leadId } = await params

  try {
    const body = await req.json()
    const validated = updateLeadSchema.parse(body)

    // Verify lead belongs to organization
    const existing = await prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        name: validated.name,
        phone: validated.phone,
        mail: validated.mail ?? undefined,
        instagram: validated.instagram,
        remoteJid: validated.remoteJid,
        assignedTo: validated.assignedTo ?? undefined,
        notes: validated.notes ?? undefined,
        status: validated.status,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[api/leads/[leadId]] PUT error:', error)

    // Handle Prisma unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const meta = (error as { meta?: { target?: string[] } }).meta
      const field = meta?.target?.[1]

      if (field === 'phone') {
        return NextResponse.json(
          { error: 'Já existe um lead com este número de telefone nesta organização' },
          { status: 409 }
        )
      }
      if (field === 'remoteJid' || field === 'remote_jid') {
        return NextResponse.json(
          { error: 'Já existe um lead com este ID do WhatsApp nesta organização' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Falha ao atualizar lead', details: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId
  const { leadId } = await params

  try {
    // Verify lead belongs to organization
    const existing = await prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    // Soft delete: set status to 'deleted'
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'deleted',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/leads/[leadId]] DELETE error:', error)
    return NextResponse.json(
      { error: 'Falha ao deletar lead', details: String(error) },
      { status: 500 }
    )
  }
}
