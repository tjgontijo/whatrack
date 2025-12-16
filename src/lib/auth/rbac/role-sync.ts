/**
 * Serviço para sincronizar roles baseado em subscriptions
 * Mantém as roles atualizadas automaticamente
 */

import { prisma } from '@/lib/prisma'
import { UserRoleType, getHighestRole } from './roles'

export interface UserWithSubscription {
  id: string
  role: string | null
  subscription: {
    isActive: boolean
    expiresAt: Date | null
  } | null
}

/**
 * Sincroniza a role de um usuário baseado na sua subscription
 */
export async function syncUserRole(userId: string): Promise<UserRoleType> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
    }
  })

  if (!user) {
    throw new Error('Usuário não encontrado')
  }

  const newRole = getHighestRole(
    user.role,
    false,
  )

  // Atualizar role se necessário
  if (user.role !== newRole) {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    })
  }

  return newRole
}

/**
 * Sincroniza roles de todos os usuários
 * Útil para jobs de manutenção
 */
export async function syncAllUserRoles(): Promise<{ updated: number }> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      role: true,
    }
  })

  let updated = 0

  for (const user of users) {
    const newRole = getHighestRole(
      user.role,
      false,
    )

    if (user.role !== newRole) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: newRole }
      })
      updated++
    }
  }

  return { updated }
}

/**
 * Atualiza role quando subscription é criada/atualizada
 */
export async function onSubscriptionChange(userId: string, subscription: {
  isActive: boolean
  expiresAt: Date | null
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (!user) return

  const newRole = getHighestRole(
    user.role,
    subscription.isActive,
  )

  if (user.role !== newRole) {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    })
  }
}

/**
 * Middleware para garantir que a role está sincronizada
 */
export async function ensureRoleSync(userId: string): Promise<UserRoleType> {
  return await syncUserRole(userId)
}
