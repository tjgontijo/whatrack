import { prisma } from '@/lib/db/prisma'
import { auditService } from '@/services/audit/audit.service'
import type { UpdateMeAccountInput } from '@/schemas/me-account-schemas'

export async function getMeAccount(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function updateMeAccount(input: {
  userId: string
  organizationId?: string
  data: UpdateMeAccountInput
}) {
  const before = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { name: true, email: true, phone: true },
  })

  const updated = await prisma.user.update({
    where: { id: input.userId },
    data: {
      ...(input.data.name !== undefined ? { name: input.data.name } : {}),
      ...(input.data.email !== undefined ? { email: input.data.email } : {}),
      ...(input.data.phone !== undefined ? { phone: input.data.phone } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  void auditService.log({
    userId: input.userId,
    organizationId: input.organizationId,
    action: 'account.updated',
    resourceType: 'account',
    resourceId: input.userId,
    before: before ?? undefined,
    after: {
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
    },
  })

  return updated
}
