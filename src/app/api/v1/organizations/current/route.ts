/**
 * API Routes - /api/v1/organizations/current
 *
 * GET - Get current user's organization
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrSyncUser } from '@/server/auth/server'

async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const normalizedBase = baseSlug || 'organizacao'
  const existing = await prisma.organization.findUnique({
    where: { slug: normalizedBase },
    select: { id: true },
  })

  if (!existing) return normalizedBase

  return `${normalizedBase}-${Math.random().toString(36).substring(2, 8)}`
}

export async function GET(request: Request) {
  try {
    const user = await getOrSyncUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Obter a primeira organização do usuário
    const member = await prisma.member.findFirst({
      where: {
        userId: user.id,
      },
      include: {
        organization: true,
      },
    })

    if (!member) {
      const fallbackName =
        user.name?.trim() || (user.email?.split('@')[0] ?? '').trim() || 'Minha organizacao'
      const slug = await generateUniqueSlug(fallbackName)

      const organization = await prisma.organization.create({
        data: {
          name: fallbackName,
          slug,
          createdAt: new Date(),
        },
      })

      await prisma.member.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'owner',
          createdAt: new Date(),
        },
      })

      return NextResponse.json(
        {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        id: member.organization.id,
        name: member.organization.name,
        slug: member.organization.slug,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to get current organization:', error)
    return NextResponse.json({ error: 'Failed to get organization' }, { status: 500 })
  }
}
