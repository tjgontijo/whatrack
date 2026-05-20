import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/server/auth/server'
import { normalizeSlug } from '@/lib/utils/slug'
import { logger } from '@/lib/utils/logger'

const renameSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { organizationId, name } = renameSchema.parse(body)

    // Verify user has access to organization
    const member = await prisma.member.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: 'owner',
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Acesso negado ou usuário não é proprietário' },
        { status: 403 }
      )
    }

    // Generate new slug from name
    const newSlug = normalizeSlug(name) || 'org'

    // Check if slug already exists
    const existing = await prisma.organization.findUnique({
      where: { slug: newSlug },
      select: { id: true },
    })

    if (existing && existing.id !== organizationId) {
      return NextResponse.json(
        { error: 'Este nome já está em uso' },
        { status: 400 }
      )
    }

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: { name, slug: newSlug },
      select: { id: true, name: true, slug: true },
    })

    logger.info({ organizationId, newName: name, newSlug }, '[Organization] Renamed')

    return NextResponse.json(org)
  } catch (error) {
    logger.error({ error }, '[Organization Rename] Error')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao renomear organização' },
      { status: 500 }
    )
  }
}
