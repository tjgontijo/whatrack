import "server-only"
import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { findTemplateByIdRepository } from "../repositories/find-template-by-id.repository"

const applyTemplateSchema = z.object({
  projectId: z.string().uuid(),
  templateId: z.string().uuid(),
  organizationId: z.string().uuid(),
})

export async function applyTemplateService(input: unknown) {
  const parsed = applyTemplateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: "Dados inválidos", status: 400 as const, details: parsed.error.flatten() }
  }

  const { projectId, templateId, organizationId } = parsed.data

  const template = await findTemplateByIdRepository(templateId)
  if (!template) {
    return { error: "Template não encontrado", status: 404 as const }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get existing stages
      const existingStages = await tx.dealStage.findMany({
        where: { organizationId, projectId },
        select: { id: true, isDefault: true },
      })

      // 2. Delete existing meta rules first
      await tx.dealStageMetaRule.deleteMany({
        where: { stageId: { in: existingStages.map(s => s.id) } }
      })

      // 3. Create new stages from template
      const newStages = []
      for (const item of template.items) {
        const stage = await tx.dealStage.create({
          data: {
            organizationId,
            projectId,
            name: item.name,
            color: item.color,
            order: item.order,
            statusGroup: item.statusGroup,
            probability: item.probability,
            isDefault: item.order === 0, // First one is default
            isClosed: item.statusGroup !== 'ACTIVE',
          },
          select: { id: true, name: true, order: true },
        })
        newStages.push({ ...stage, suggestedMetaEvent: item.suggestedMetaEventName })
      }

      // 4. Migration logic: if there are deals, move them to the new default stage (order 0)
      const defaultStage = newStages.find(s => s.order === 0)
      if (defaultStage && existingStages.length > 0) {
        await tx.deal.updateMany({
          where: { stageId: { in: existingStages.map(s => s.id) } },
          data: { stageId: defaultStage.id },
        })

        // 5. Safe delete old stages
        await tx.dealStage.deleteMany({
          where: { id: { in: existingStages.map(s => s.id) } },
        })
      }

      // 6. Create Meta rules if suggested
      for (const stage of newStages) {
        if (stage.suggestedMetaEvent) {
          // We need a pixel to link. For now, let's find the first active pixel of the project
          const pixel = await tx.metaPixel.findFirst({
            where: { organizationId, projectId, isActive: true },
            select: { id: true }
          })

          if (pixel) {
            await tx.dealStageMetaRule.create({
              data: {
                stageId: stage.id,
                pixelId: pixel.id,
                eventName: stage.suggestedMetaEvent,
                fireOnce: true,
              }
            })
          }
        }
      }

      return newStages
    })

    return { data: result }
  } catch (error) {
    return { error: "Falha ao aplicar template", status: 500 as const }
  }
}
