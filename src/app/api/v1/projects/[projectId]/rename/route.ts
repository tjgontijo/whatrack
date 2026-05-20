import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/server/auth/server'
import { normalizeSlug } from '@/lib/utils/slug'
import { logger } from '@/lib/utils/logger'

const renameSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
    const body = await request.json()
    const { name } = renameSchema.parse(body)

    // Get project and verify access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    const member = await prisma.member.findFirst({
      where: {
        organizationId: project.organizationId,
        userId: session.user.id,
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Generate new slug
    const newSlug = normalizeSlug(name) || 'projeto'

    // Check if slug already exists in this organization
    const existing = await prisma.project.findFirst({
      where: {
        organizationId: project.organizationId,
        slug: newSlug,
        id: { not: projectId },
      },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Este nome já está em uso nesta organização' },
        { status: 400 }
      )
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { name, slug: newSlug },
      select: { id: true, name: true, slug: true },
    })

    logger.info({ projectId, newName: name, newSlug }, '[Project] Renamed')

    return NextResponse.json(updated)
  } catch (error) {
    logger.error({ error }, '[Project Rename] Error')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao renomear projeto' },
      { status: 500 }
    )
  }
}
