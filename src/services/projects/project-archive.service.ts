import { prisma } from '@/lib/db/prisma'

type ArchiveError =
  | { error: 'Projeto não encontrado'; status: 404 }
  | { error: 'Projeto já foi arquivado'; status: 409 }

export async function archiveProject(input: {
  organizationId: string
  projectId: string
}): Promise<{ success: true } | ArchiveError> {
  const project = await prisma.project.findFirst({
    where: {
      id: input.projectId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      isArchived: true,
    },
  })

  if (!project) {
    return { error: 'Projeto não encontrado', status: 404 }
  }

  if (project.isArchived) {
    return { error: 'Projeto já foi arquivado', status: 409 }
  }

  await prisma.project.update({
    where: { id: input.projectId },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  })

  return { success: true }
}
